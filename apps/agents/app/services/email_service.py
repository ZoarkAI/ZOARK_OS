"""
Multi-Provider Email Service
─────────────────────────────
Supported providers (set via EMAIL_PROVIDER env var):

  smtp      – Universal.  Works with Gmail, Outlook, Yahoo, Proton, Zoho,
              iCloud, or any custom SMTP server.  Supports file attachments.
  sendgrid  – SendGrid REST API  (no SDK needed; uses httpx).
  resend    – Resend REST API    (free tier: 100 emails/month).

If the chosen provider has no credentials configured the email is logged as a
draft so nothing disappears silently.  Every outbound email is logged
regardless of outcome.
"""

import logging
from typing import List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

import aiosmtplib
import httpx
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# ── preset SMTP hosts ─────────────────────────────────────────────────────
SMTP_PRESETS = {
    "gmail":     {"host": "smtp.gmail.com",           "port": 587},
    "outlook":   {"host": "smtp-mail.outlook.com",    "port": 587},
    "office365": {"host": "smtp.office365.com",       "port": 587},
    "yahoo":     {"host": "smtp.mail.yahoo.com",      "port": 587},
    "hotmail":   {"host": "smtp-mail.outlook.com",    "port": 587},
    "proton":    {"host": "smtp.protonmail.com",      "port": 587},
    "zoho":      {"host": "smtp.zoho.com",            "port": 587},
    "icloud":    {"host": "smtp.mail.me.com",         "port": 587},
}


class EmailService:
    """Provider-agnostic email sender."""

    def __init__(self):
        self.provider = (settings.email_provider or "smtp").lower()

    # ── public ────────────────────────────────────────────────────────
    def is_configured(self) -> bool:
        if self.provider == "smtp":
            return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)
        if self.provider == "sendgrid":
            return bool(settings.sendgrid_api_key)
        if self.provider == "resend":
            return bool(settings.resend_api_key)
        return False

    async def send_email(
        self,
        to: "str | List[str]",
        subject: str,
        body: str,
        html: bool = True,
        cc: Optional[List[str]] = None,
        attachments: Optional[List[dict]] = None,
    ) -> dict:
        """Send an email.

        attachments – list of {"filename": str, "content": bytes}  (SMTP only)

        Returns a status dict:
            {"sent": True,  "provider": str, "recipients": list}
            {"sent": False, "reason": str, ...}
        """
        recipients = [to] if isinstance(to, str) else to
        logger.info(f"[{self.provider}] {subject} → {recipients}")

        if not self.is_configured():
            logger.warning(
                f"Email provider '{self.provider}' is not fully configured. "
                "Email was NOT sent — draft logged below."
            )
            logger.info(f"  To      : {recipients}")
            logger.info(f"  Subject : {subject}")
            logger.info(f"  Body    : {body[:300]}…")
            return {
                "sent": False,
                "reason": "provider_not_configured",
                "draft": {"to": recipients, "subject": subject, "body": body},
            }

        try:
            dispatch = {
                "smtp":     self._send_smtp,
                "sendgrid": self._send_sendgrid,
                "resend":   self._send_resend,
            }
            handler = dispatch.get(self.provider)
            if not handler:
                raise ValueError(f"Unknown email provider: {self.provider}")
            await handler(recipients, subject, body, html, cc, attachments)
            return {"sent": True, "provider": self.provider, "recipients": recipients}
        except Exception as e:
            logger.error(f"[{self.provider}] send failed: {e}")
            return {"sent": False, "reason": str(e), "provider": self.provider}

    # ── SMTP ──────────────────────────────────────────────────────────
    async def _send_smtp(self, recipients, subject, body, html, cc, attachments):
        host, port = self._resolve_smtp()

        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_user
        msg["To"] = ", ".join(recipients)
        if cc:
            msg["Cc"] = ", ".join(cc)

        msg.attach(MIMEText(body, "html" if html else "plain"))

        for att in (attachments or []):
            part = MIMEBase("application", "octet-stream")
            part.set_payload(att["content"])
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=att["filename"])
            msg.attach(part)

        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            start_tls=True,
            username=settings.smtp_user,
            password=settings.smtp_password,
        )
        logger.info(f"Sent via SMTP ({host}:{port}) → {recipients}")

    def _resolve_smtp(self):
        raw = settings.smtp_host.strip().lower()
        if raw in SMTP_PRESETS:
            return SMTP_PRESETS[raw]["host"], SMTP_PRESETS[raw]["port"]
        return settings.smtp_host, settings.smtp_port

    # ── SendGrid (REST) ───────────────────────────────────────────────
    async def _send_sendgrid(self, recipients, subject, body, html, cc, _attachments):
        personalizations: dict = {"to": [{"email": r} for r in recipients]}
        if cc:
            personalizations["cc"] = [{"email": c} for c in cc]

        payload = {
            "personalizations": [personalizations],
            "from": {"email": settings.sendgrid_from_email or settings.smtp_user},
            "subject": subject,
            "content": [{"type": "text/html" if html else "text/plain", "value": body}],
        }

        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {settings.sendgrid_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            res.raise_for_status()
        logger.info(f"Sent via SendGrid → {recipients}")

    # ── Resend (REST) ─────────────────────────────────────────────────
    async def _send_resend(self, recipients, subject, body, html, cc, _attachments):
        payload: dict = {
            "from": settings.resend_from_email or settings.smtp_user,
            "to": recipients,
            "subject": subject,
        }
        payload["html" if html else "text"] = body
        if cc:
            payload["cc"] = cc

        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            res.raise_for_status()
        logger.info(f"Sent via Resend → {recipients}")


# ── singleton ─────────────────────────────────────────────────────────────
_email_service: "EmailService | None" = None


def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
