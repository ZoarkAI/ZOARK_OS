from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from app.db import get_conn
from app.routers.auth import get_current_user
from app.config import get_settings
from cryptography.fernet import Fernet
import base64
import hashlib

router = APIRouter(prefix="/api-keys", tags=["api-keys"])
settings = get_settings()

def get_encryption_key() -> bytes:
    """Get or generate a consistent encryption key from settings"""
    if settings.encryption_key:
        # Use configured key
        key = settings.encryption_key
        if len(key) == 44 and key.endswith('='):
            # Already a valid Fernet key
            return key.encode()
        else:
            # Derive a Fernet key from the provided secret
            hash_key = hashlib.sha256(key.encode()).digest()
            return base64.urlsafe_b64encode(hash_key)
    else:
        # Generate a deterministic key based on JWT secret for consistency
        hash_key = hashlib.sha256(settings.jwt_secret.encode()).digest()
        return base64.urlsafe_b64encode(hash_key)

cipher_suite = Fernet(get_encryption_key())


class APIKeyCreate(BaseModel):
    name: str
    provider: str  # openai, anthropic, huggingface, custom
    key: str
    endpoint: Optional[str] = None  # For custom LLM endpoints


class APIKeyResponse(BaseModel):
    id: str
    name: str
    provider: str
    endpoint: Optional[str]
    isActive: bool
    createdAt: datetime
    lastUsed: Optional[datetime]


class APIKeyUsage(BaseModel):
    keyId: str
    provider: str
    tokensUsed: int
    costEstimate: float
    lastUsed: datetime


def encrypt_key(key: str) -> str:
    """Encrypt API key for storage"""
    return cipher_suite.encrypt(key.encode()).decode()


def decrypt_key(encrypted_key: str) -> str:
    """Decrypt API key from storage"""
    return cipher_suite.decrypt(encrypted_key.encode()).decode()


def row_to_api_key(row, include_key: bool = False) -> dict:
    """Convert database row to API key response"""
    result = {
        "id": row["id"],
        "name": row["name"],
        "provider": row["provider"],
        "endpoint": row["endpoint"],
        "isActive": row["isActive"],
        "createdAt": row["createdAt"],
        "lastUsed": row["lastUsed"],
    }
    
    if include_key:
        result["key"] = decrypt_key(row["encryptedKey"])
    
    return result


@router.post("/", response_model=APIKeyResponse, status_code=201)
async def create_api_key(key_data: APIKeyCreate, current_user = Depends(get_current_user)):
    """Create a new API key"""
    async with get_conn() as conn:
        # Check if key name already exists for this user
        existing = await conn.fetchrow(
            'SELECT "id" FROM "APIKey" WHERE "userId" = $1 AND "name" = $2',
            current_user["id"], key_data.name
        )
        
        if existing:
            raise HTTPException(status_code=400, detail="API key name already exists")
        
        # Encrypt the key before storing
        encrypted_key = encrypt_key(key_data.key)
        
        # Store API key
        key_id = str(uuid4())
        api_key = await conn.fetchrow(
            '''INSERT INTO "APIKey" ("id", "userId", "name", "provider", "endpoint", "encryptedKey", "isActive", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
               RETURNING *''',
            key_id, current_user["id"], key_data.name, key_data.provider, key_data.endpoint, encrypted_key
        )
    
    return row_to_api_key(api_key)


@router.get("/", response_model=List[APIKeyResponse])
async def list_api_keys(current_user = Depends(get_current_user)):
    """List all API keys for current user"""
    async with get_conn() as conn:
        keys = await conn.fetch(
            'SELECT * FROM "APIKey" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
            current_user["id"]
        )
    
    return [row_to_api_key(k) for k in keys]


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(key_id: str, current_user = Depends(get_current_user)):
    """Get API key details"""
    async with get_conn() as conn:
        key = await conn.fetchrow(
            'SELECT * FROM "APIKey" WHERE "id" = $1 AND "userId" = $2',
            key_id, current_user["id"]
        )
    
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return row_to_api_key(key)


@router.delete("/{key_id}")
async def delete_api_key(key_id: str, current_user = Depends(get_current_user)):
    """Delete API key"""
    async with get_conn() as conn:
        result = await conn.execute(
            'DELETE FROM "APIKey" WHERE "id" = $1 AND "userId" = $2',
            key_id, current_user["id"]
        )
    
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {"message": "API key deleted"}


@router.post("/{key_id}/test")
async def test_api_key(key_id: str, current_user = Depends(get_current_user)):
    """Test if API key is valid"""
    async with get_conn() as conn:
        key = await conn.fetchrow(
            'SELECT * FROM "APIKey" WHERE "id" = $1 AND "userId" = $2',
            key_id, current_user["id"]
        )
    
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Test the API key based on provider — keys are never assigned to globals
    try:
        decrypted_key = decrypt_key(key["encryptedKey"])

        if key["provider"] == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=decrypted_key)
            client.models.list()
        elif key["provider"] == "anthropic":
            import anthropic
            client = anthropic.Anthropic(api_key=decrypted_key)
            # Lightweight call: list available models
            client.models.list()
        elif key["provider"] == "huggingface":
            import httpx
            async with httpx.AsyncClient() as http:
                resp = await http.get(
                    "https://huggingface.co/api/whoami",
                    headers={"Authorization": f"Bearer {decrypted_key}"},
                )
                resp.raise_for_status()

        return {"status": "valid", "message": "API key is valid"}

    except Exception as e:
        return {"status": "invalid", "message": str(e)}


@router.get("/{key_id}/usage", response_model=APIKeyUsage)
async def get_api_key_usage(key_id: str, current_user = Depends(get_current_user)):
    """Get API key usage statistics"""
    async with get_conn() as conn:
        key = await conn.fetchrow(
            'SELECT * FROM "APIKey" WHERE "id" = $1 AND "userId" = $2',
            key_id, current_user["id"]
        )
        
        if not key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Get usage from AgentExecution table
        usage = await conn.fetchrow(
            '''SELECT 
                SUM("tokensUsed") as total_tokens,
                SUM("costEstimate") as total_cost,
                MAX("executedAt") as last_used
               FROM "AgentExecution" 
               WHERE "apiKeyId" = $1''',
            key_id
        )
    
    return {
        "keyId": key_id,
        "provider": key["provider"],
        "tokensUsed": usage["total_tokens"] or 0,
        "costEstimate": usage["total_cost"] or 0.0,
        "lastUsed": usage["last_used"] or key["lastUsed"]
    }


@router.post("/{key_id}/activate")
async def activate_api_key(key_id: str, current_user = Depends(get_current_user)):
    """Activate API key"""
    async with get_conn() as conn:
        key = await conn.fetchrow(
            'SELECT * FROM "APIKey" WHERE "id" = $1 AND "userId" = $2',
            key_id, current_user["id"]
        )
        
        if not key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        updated = await conn.fetchrow(
            'UPDATE "APIKey" SET "isActive" = true, "updatedAt" = NOW() WHERE "id" = $1 RETURNING *',
            key_id
        )
    
    return row_to_api_key(updated)


@router.post("/{key_id}/deactivate")
async def deactivate_api_key(key_id: str, current_user = Depends(get_current_user)):
    """Deactivate API key"""
    async with get_conn() as conn:
        key = await conn.fetchrow(
            'SELECT * FROM "APIKey" WHERE "id" = $1 AND "userId" = $2',
            key_id, current_user["id"]
        )
        
        if not key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        updated = await conn.fetchrow(
            'UPDATE "APIKey" SET "isActive" = false, "updatedAt" = NOW() WHERE "id" = $1 RETURNING *',
            key_id
        )
    
    return row_to_api_key(updated)
