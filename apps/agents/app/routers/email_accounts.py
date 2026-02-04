from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/email-accounts", tags=["email"])


class EmailAccountCreate(BaseModel):
    provider: str  # GMAIL, OUTLOOK, YAHOO
    email: str
    accessToken: str
    refreshToken: Optional[str] = None
    expiresAt: Optional[datetime] = None


class EmailAccountUpdate(BaseModel):
    accessToken: Optional[str] = None
    refreshToken: Optional[str] = None
    expiresAt: Optional[datetime] = None
    isConnected: Optional[bool] = None


class EmailAccountResponse(BaseModel):
    id: str
    provider: str
    email: str
    isConnected: bool
    createdAt: datetime
    updatedAt: datetime


def row_to_email_account(row) -> dict:
    return {
        "id": row["id"],
        "provider": row["provider"],
        "email": row["email"],
        "isConnected": row["isConnected"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


@router.get("/", response_model=List[EmailAccountResponse])
async def list_email_accounts():
    async with get_conn() as conn:
        rows = await conn.fetch('SELECT * FROM "EmailAccount" ORDER BY "createdAt" DESC')
    return [row_to_email_account(r) for r in rows]


@router.get("/{account_id}", response_model=EmailAccountResponse)
async def get_email_account(account_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "EmailAccount" WHERE "id" = $1', account_id)
    if not row:
        raise HTTPException(status_code=404, detail="Email account not found")
    return row_to_email_account(row)


@router.post("/", response_model=EmailAccountResponse, status_code=201)
async def create_email_account(account: EmailAccountCreate):
    async with get_conn() as conn:
        # Check if email already exists
        existing = await conn.fetchrow('SELECT "id" FROM "EmailAccount" WHERE "email" = $1', account.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email account already connected")
        
        row = await conn.fetchrow(
            '''INSERT INTO "EmailAccount" ("id", "provider", "email", "accessToken", "refreshToken", "expiresAt", "isConnected", "createdAt", "updatedAt")
               VALUES ($1, $2::\"EmailProvider\", $3, $4, $5, $6, true, NOW(), NOW())
               RETURNING *''',
            str(uuid4()), account.provider, account.email, account.accessToken, account.refreshToken, account.expiresAt,
        )
    return row_to_email_account(row)


@router.patch("/{account_id}", response_model=EmailAccountResponse)
async def update_email_account(account_id: str, account: EmailAccountUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "EmailAccount" WHERE "id" = $1', account_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Email account not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        
        if account.accessToken is not None:
            sets.append(f'"accessToken" = ${idx}')
            params.append(account.accessToken)
            idx += 1
        if account.refreshToken is not None:
            sets.append(f'"refreshToken" = ${idx}')
            params.append(account.refreshToken)
            idx += 1
        if account.expiresAt is not None:
            sets.append(f'"expiresAt" = ${idx}')
            params.append(account.expiresAt)
            idx += 1
        if account.isConnected is not None:
            sets.append(f'"isConnected" = ${idx}')
            params.append(account.isConnected)
            idx += 1

        params.append(account_id)
        query = f'UPDATE "EmailAccount" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_email_account(row)


@router.delete("/{account_id}", status_code=204)
async def delete_email_account(account_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "EmailAccount" WHERE "id" = $1', account_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Email account not found")


@router.post("/{account_id}/sync", status_code=200)
async def sync_email_attachments(account_id: str):
    """Sync attachments from email account to RAG documents"""
    async with get_conn() as conn:
        account = await conn.fetchrow('SELECT * FROM "EmailAccount" WHERE "id" = $1', account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Email account not found")
    
    # This would integrate with actual email provider API (Gmail, Outlook, etc.)
    # For now, return success response
    return {"status": "syncing", "message": "Email attachments sync initiated"}
