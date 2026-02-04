from pydantic_settings import BaseSettings

try:
    from pydantic_settings import SettingsConfigDict as ConfigDict
except ImportError:
    from pydantic import ConfigDict
from functools import lru_cache
import secrets


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=False)

    # ── Database & Redis ──────────────────────────────────────────────
    database_url: str = "postgresql://zoark:zoark@localhost:5432/zoark"
    redis_url: str = "redis://localhost:6379"

    # ── Email ─────────────────────────────────────────────────────────
    # Choose one: smtp | sendgrid | resend
    email_provider: str = "smtp"

    # SMTP — works with Gmail, Outlook, Yahoo, Proton, Zoho, iCloud, or any
    # custom SMTP server.  smtp_host accepts a preset name ("gmail", "outlook",
    # "yahoo", "office365", "hotmail", "proton", "zoho", "icloud") OR a full
    # hostname (e.g. "smtp.yourcompany.com").
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""       # your email address
    smtp_password: str = ""   # app password (Gmail / Outlook with 2FA)

    # SendGrid
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""

    # Resend
    resend_api_key: str = ""
    resend_from_email: str = ""

    # System alert inbox (task-stuck notifications, etc.)
    alert_email: str = ""

    # ── LLM ───────────────────────────────────────────────────────────
    openai_api_key: str = ""

    # ── Vector DB ─────────────────────────────────────────────────────
    pinecone_api_key: str = ""
    pinecone_index_name: str = "zoark-documents"
    pinecone_environment: str = "us-east-1"

    # ── App ───────────────────────────────────────────────────────────
    app_name: str = "ZOARK OS API"
    debug: bool = True

    # CORS — the frontend origin(s) the API will accept.
    # Comma-separate multiple origins: "http://localhost:3000,https://zoark.vercel.app"
    cors_origin: str = "http://localhost:3000"
    
    # ── Security & Authentication ─────────────────────────────────────
    # JWT Configuration
    jwt_secret: str = secrets.token_urlsafe(32)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # Encryption key for API keys storage (MUST be set in production)
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key: str = ""
    
    # ── OAuth Providers ───────────────────────────────────────────────
    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/oauth/callback/google"
    
    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/oauth/callback/github"
    
    # Microsoft OAuth
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_redirect_uri: str = "http://localhost:8000/oauth/callback/microsoft"
    
    # ── Rate Limiting ─────────────────────────────────────────────────
    rate_limit_requests_per_minute: int = 120
    
    # ── Monitoring ────────────────────────────────────────────────────
    sentry_dsn: str = ""
    
    # ── Frontend URL ──────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
