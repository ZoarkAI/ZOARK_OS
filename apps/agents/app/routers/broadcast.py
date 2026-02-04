"""
Broadcast & Task-Assignment Endpoints

POST /broadcast/send            – send a one-off email to a list of addresses
POST /broadcast/assign-submission – notify specific users they must submit a doc
GET  /broadcast/email-settings   – current provider config (no secrets)
POST /broadcast/email-settings   – update config at runtime (in-memory; set .env to persist)
POST /broadcast/test-email       – send a test email to verify the config
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.db import get_conn
from app.services.email_service import get_email_service
from app.config import get_settings

router = APIRouter(prefix="/broadcast", tags=["broadcast"])
logger = logging.getLogger(__name__)


# ── Request / Response models ─────────────────────────────────────────────────

class BroadcastRequest(BaseModel):
    recipients: List[str]
    subject: str
    body: str
    html: bool = True


class AssignSubmissionRequest(BaseModel):
    user_ids: List[str]
    task_type: str                       # "timesheet" | "report" | "custom"
    deadline: str                        # ISO datetime string
    notes: Optional[str] = None
    custom_task_name: Optional[str] = None


class EmailSettingsUpdate(BaseModel):
    provider: str
    smtp_host: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_port: Optional[int] = None
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: Optional[str] = None
    resend_api_key: Optional[str] = None
    resend_from_email: Optional[str] = None


# ── Broadcast ─────────────────────────────────────────────────────────────────

@router.post("/send")
async def send_broadcast(request: BroadcastRequest):
    """Send a broadcast email to an explicit list of recipients."""
    if not request.recipients:
        raise HTTPException(status_code=400, detail="At least one recipient required")
    email_svc = get_email_service()
    result = await email_svc.send_email(
        to=request.recipients,
        subject=request.subject,
        body=request.body,
        html=request.html,
    )
    return {
        "sent": result.get("sent", False),
        "recipients": request.recipients,
        "reason": result.get("reason"),
    }


# ── Task-assignment ───────────────────────────────────────────────────────────

@router.post("/assign-submission")
async def assign_submission(request: AssignSubmissionRequest):
    """
    Notify a subset of users that they must submit a document.
    Looks up their names/emails from the DB, then sends an individual
    HTML email to each one.
    """
    if not request.user_ids:
        raise HTTPException(status_code=400, detail="At least one user_id required")

    # Resolve user rows from DB
    async with get_conn() as conn:
        placeholders = ",".join(f"${i+1}" for i in range(len(request.user_ids)))
        rows = await conn.fetch(
            f'SELECT "id", "name", "email" FROM "User" WHERE "id" IN ({placeholders})',
            *request.user_ids,
        )

    if not rows:
        raise HTTPException(status_code=404, detail="No matching users found in the database")

    task_labels = {
        "timesheet": "Weekly Timesheet",
        "report": "Status Report",
        "custom": request.custom_task_name or "Document",
    }
    task_label = task_labels.get(request.task_type, request.task_type)
    email_svc = get_email_service()

    results = []
    for row in rows:
        subject = f"[ZOARK OS] Action Required: Submit {task_label}"
        body = (
            f"<h2 style='color:#e2e8f0'>Hi {row['name']},</h2>"
            f"<p style='color:#cbd5e1'>You have been assigned the following submission task:</p>"
            f"<div style='margin:16px 0;padding:16px;background:#1e293b;border-radius:8px;"
            f"border-left:4px solid #a78bfa'>"
            f"<p style='color:#e2e8f0;margin:0;font-weight:bold'>Task: {task_label}</p>"
            f"<p style='color:#cbd5e1;margin:8px 0 0'>Deadline: {request.deadline}</p>"
        )
        if request.notes:
            body += f"<p style='color:#cbd5e1;margin:8px 0 0'>Notes: {request.notes}</p>"
        body += (
            "</div>"
            "<p style='color:#cbd5e1'>Please submit the required document(s) at your earliest "
            "convenience. The system will send automatic follow-up reminders until the submission "
            "is received.</p>"
            "<p style='color:#6b7280;margin-top:24px;font-size:14px'>— ZOARK OS</p>"
        )

        result = await email_svc.send_email(to=row["email"], subject=subject, body=body)
        results.append({
            "user_id": row["id"],
            "email": row["email"],
            "sent": result.get("sent", False),
        })

    return {
        "assignments": results,
        "task_type": request.task_type,
        "deadline": request.deadline,
    }


# ── Email settings ────────────────────────────────────────────────────────────

@router.get("/email-settings")
async def get_email_settings():
    """Return the current email config — safe subset (no secrets)."""
    settings = get_settings()
    email_svc = get_email_service()
    return {
        "provider": email_svc.provider,
        "configured": email_svc.is_configured(),
        "smtp_host": settings.smtp_host or "",
        "smtp_user": settings.smtp_user or "",
    }


@router.post("/email-settings")
async def update_email_settings(update: EmailSettingsUpdate):
    """
    Persist overrides into os.environ, bust the Settings cache, and reset
    the EmailService singleton so the next outbound call uses the new config.

    NOTE: these changes survive only for the lifetime of the current process.
    To make them permanent, add the values to your .env file.
    """
    env_map = {
        "provider":           ("EMAIL_PROVIDER",       update.provider),
        "smtp_host":          ("SMTP_HOST",            update.smtp_host),
        "smtp_user":          ("SMTP_USER",            update.smtp_user),
        "smtp_password":      ("SMTP_PASSWORD",        update.smtp_password),
        "smtp_port":          ("SMTP_PORT",            str(update.smtp_port) if update.smtp_port else None),
        "sendgrid_api_key":   ("SENDGRID_API_KEY",     update.sendgrid_api_key),
        "sendgrid_from_email":("SENDGRID_FROM_EMAIL",  update.sendgrid_from_email),
        "resend_api_key":     ("RESEND_API_KEY",       update.resend_api_key),
        "resend_from_email":  ("RESEND_FROM_EMAIL",    update.resend_from_email),
    }
    for _field, (env_key, value) in env_map.items():
        if value is not None:
            os.environ[env_key] = value

    # Bust caches so next access re-reads env
    from app.config import get_settings as _gs
    _gs.cache_clear()
    import app.services.email_service as _em
    _em._email_service = None

    email_svc = get_email_service()
    return {"provider": email_svc.provider, "configured": email_svc.is_configured()}


@router.post("/test-email")
async def test_email():
    """Send a quick test email to the configured sender address."""
    settings = get_settings()
    email_svc = get_email_service()
    if not email_svc.is_configured():
        return {"sent": False, "reason": "Email provider is not configured. Fill in credentials first."}

    target = (
        settings.smtp_user
        or settings.sendgrid_from_email
        or settings.resend_from_email
        or "test@example.com"
    )
    return await email_svc.send_email(
        to=target,
        subject="[ZOARK OS] Email Configuration Test",
        body=(
            "<h2 style='color:#e2e8f0'>Email Test</h2>"
            "<p style='color:#cbd5e1'>Your email provider is configured correctly. "
            "You can close this message.</p>"
            "<p style='color:#6b7280;margin-top:16px;font-size:14px'>— ZOARK OS</p>"
        ),
    )
