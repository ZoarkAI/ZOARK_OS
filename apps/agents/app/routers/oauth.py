from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import uuid4
from app.db import get_conn
from app.routers.auth import get_current_user
from app.config import get_settings
import httpx
import urllib.parse

router = APIRouter(prefix="/oauth", tags=["oauth"])
settings = get_settings()


class OAuthProvider(BaseModel):
    provider: str  # google, github, microsoft
    client_id: str
    client_secret: str
    redirect_uri: str


class OAuthAccountResponse(BaseModel):
    id: str
    provider: str
    email: str
    isConnected: bool
    createdAt: datetime


class OAuthCallbackData(BaseModel):
    provider: str
    code: str
    state: str


def row_to_oauth_account(row) -> dict:
    return {
        "id": row["id"],
        "provider": row["provider"],
        "email": row["email"],
        "isConnected": row["isConnected"],
        "createdAt": row["createdAt"],
    }


def get_oauth_config(provider: str) -> dict:
    """Get OAuth configuration for a provider"""
    configs = {
        "google": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
            "scope": "openid email profile",
        },
        "github": {
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "redirect_uri": settings.github_redirect_uri,
            "auth_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "userinfo_url": "https://api.github.com/user",
            "scope": "user:email",
        },
        "microsoft": {
            "client_id": settings.microsoft_client_id,
            "client_secret": settings.microsoft_client_secret,
            "redirect_uri": settings.microsoft_redirect_uri,
            "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "userinfo_url": "https://graph.microsoft.com/v1.0/me",
            "scope": "openid email profile User.Read",
        },
    }
    return configs.get(provider, {})


@router.post("/connect/{provider}")
async def start_oauth_flow(provider: str, current_user = Depends(get_current_user)):
    """Start OAuth flow for a provider"""
    if provider not in ["google", "github", "microsoft"]:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    
    config = get_oauth_config(provider)
    if not config.get("client_id"):
        raise HTTPException(status_code=400, detail=f"{provider.title()} OAuth not configured. Please set {provider.upper()}_CLIENT_ID in environment.")
    
    # Generate state token for CSRF protection
    state = str(uuid4())
    
    # Store state in database temporarily
    async with get_conn() as conn:
        await conn.execute(
            '''INSERT INTO "OAuthState" ("id", "state", "provider", "userId", "expiresAt")
               VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')''',
            str(uuid4()), state, provider, current_user["id"]
        )
    
    # Build OAuth URL with actual credentials
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
    }
    
    if provider == "google":
        params["access_type"] = "offline"
        params["prompt"] = "consent"
    
    oauth_url = f"{config['auth_url']}?{urllib.parse.urlencode(params)}"
    
    return {
        "provider": provider,
        "oauth_url": oauth_url,
        "state": state
    }


@router.post("/callback")
async def oauth_callback(data: OAuthCallbackData, current_user = Depends(get_current_user)):
    """Handle OAuth callback with actual token exchange"""
    async with get_conn() as conn:
        # Verify state token
        state_record = await conn.fetchrow(
            '''SELECT * FROM "OAuthState" WHERE "state" = $1 AND "userId" = $2 AND "expiresAt" > NOW()''',
            data.state, current_user["id"]
        )
        
        if not state_record:
            raise HTTPException(status_code=400, detail="Invalid or expired state")
        
        config = get_oauth_config(data.provider)
        if not config:
            raise HTTPException(status_code=400, detail="Unsupported provider")
        
        # Exchange authorization code for tokens
        async with httpx.AsyncClient() as client:
            token_data = {
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": data.code,
                "redirect_uri": config["redirect_uri"],
                "grant_type": "authorization_code",
            }
            
            headers = {"Accept": "application/json"}
            token_response = await client.post(config["token_url"], data=token_data, headers=headers)
            
            if token_response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to exchange code: {token_response.text}")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            refresh_token = tokens.get("refresh_token", "")
            
            # Get user info from provider
            auth_header = {"Authorization": f"Bearer {access_token}"}
            if data.provider == "github":
                auth_header = {"Authorization": f"token {access_token}"}
            
            userinfo_response = await client.get(config["userinfo_url"], headers=auth_header)
            
            if userinfo_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            userinfo = userinfo_response.json()
            
            # Extract email based on provider
            if data.provider == "google":
                email = userinfo.get("email", "")
            elif data.provider == "github":
                email = userinfo.get("email", "")
                if not email:
                    # GitHub may require separate email API call
                    email_response = await client.get("https://api.github.com/user/emails", headers=auth_header)
                    if email_response.status_code == 200:
                        emails = email_response.json()
                        primary = next((e for e in emails if e.get("primary")), None)
                        email = primary.get("email", "") if primary else ""
            elif data.provider == "microsoft":
                email = userinfo.get("mail", userinfo.get("userPrincipalName", ""))
        
        # Check if account already exists
        existing = await conn.fetchrow(
            'SELECT * FROM "OAuthAccount" WHERE "userId" = $1 AND "provider" = $2',
            current_user["id"], data.provider
        )
        
        if existing:
            # Update existing account
            oauth_account = await conn.fetchrow(
                '''UPDATE "OAuthAccount" 
                   SET "email" = $1, "accessToken" = $2, "refreshToken" = $3, "isConnected" = true, "updatedAt" = NOW()
                   WHERE "id" = $4
                   RETURNING *''',
                email, access_token, refresh_token, existing["id"]
            )
        else:
            # Create new account
            oauth_account_id = str(uuid4())
            oauth_account = await conn.fetchrow(
                '''INSERT INTO "OAuthAccount" ("id", "userId", "provider", "email", "accessToken", "refreshToken", "isConnected", "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
                   RETURNING *''',
                oauth_account_id, current_user["id"], data.provider, email, access_token, refresh_token
            )
        
        # Delete used state token
        await conn.execute('DELETE FROM "OAuthState" WHERE "state" = $1', data.state)
    
    return row_to_oauth_account(oauth_account)


@router.get("/callback/{provider}")
async def oauth_callback_redirect(
    provider: str,
    code: str = Query(...),
    state: str = Query(...)
):
    """Handle OAuth callback redirect from provider (browser redirect)"""
    # Redirect to frontend with code and state
    frontend_callback = f"{settings.frontend_url}/auth/oauth/callback?provider={provider}&code={code}&state={state}"
    return RedirectResponse(url=frontend_callback)


@router.get("/accounts", response_model=list[OAuthAccountResponse])
async def list_oauth_accounts(current_user = Depends(get_current_user)):
    """List connected OAuth accounts for current user"""
    async with get_conn() as conn:
        accounts = await conn.fetch(
            'SELECT * FROM "OAuthAccount" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
            current_user["id"]
        )
    return [row_to_oauth_account(a) for a in accounts]


@router.get("/accounts/{account_id}", response_model=OAuthAccountResponse)
async def get_oauth_account(account_id: str, current_user = Depends(get_current_user)):
    """Get OAuth account details"""
    async with get_conn() as conn:
        account = await conn.fetchrow(
            'SELECT * FROM "OAuthAccount" WHERE "id" = $1 AND "userId" = $2',
            account_id, current_user["id"]
        )
    
    if not account:
        raise HTTPException(status_code=404, detail="OAuth account not found")
    
    return row_to_oauth_account(account)


@router.delete("/accounts/{account_id}")
async def disconnect_oauth_account(account_id: str, current_user = Depends(get_current_user)):
    """Disconnect OAuth account"""
    async with get_conn() as conn:
        result = await conn.execute(
            'DELETE FROM "OAuthAccount" WHERE "id" = $1 AND "userId" = $2',
            account_id, current_user["id"]
        )
    
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="OAuth account not found")
    
    return {"message": "OAuth account disconnected"}


@router.post("/accounts/{account_id}/refresh")
async def refresh_oauth_token(account_id: str, current_user = Depends(get_current_user)):
    """Refresh OAuth token"""
    async with get_conn() as conn:
        account = await conn.fetchrow(
            'SELECT * FROM "OAuthAccount" WHERE "id" = $1 AND "userId" = $2',
            account_id, current_user["id"]
        )
        
        if not account:
            raise HTTPException(status_code=404, detail="OAuth account not found")
        
        # Refresh token using provider's API (simplified)
        # In production, use proper OAuth libraries
        
        updated = await conn.fetchrow(
            '''UPDATE "OAuthAccount" 
               SET "accessToken" = $1, "updatedAt" = NOW()
               WHERE "id" = $2
               RETURNING *''',
            "new_access_token", account_id
        )
    
    return row_to_oauth_account(updated)
