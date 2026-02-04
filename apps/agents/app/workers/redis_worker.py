"""
Redis Worker — Event-Driven Agent Orchestration.

Subscribes to the 'agent_events' Redis channel (fed by pg_listener)
and dispatches to the appropriate agent based on event type.

Reconnects automatically on connection drop with exponential back-off
(5 s → 10 s → 20 s … capped at 60 s).
"""

import asyncio
import json
import logging
from typing import Dict, Any

import redis.asyncio as aioredis

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_INITIAL_DELAY = 5  # seconds


# ── Event handlers ────────────────────────────────────────────────────────────

async def handle_task_stuck_event(event_data: Dict[str, Any]) -> None:
    from app.agents.task_monitor import TaskMonitorAgent
    agent = TaskMonitorAgent(task_id=event_data.get("task_id"))
    await agent.execute()


async def handle_approval_overdue_event(event_data: Dict[str, Any]) -> None:
    from app.agents.approval_nudger import ApprovalNudgerAgent
    agent = ApprovalNudgerAgent(approval_id=event_data.get("approval_id"))
    await agent.execute()


async def handle_invoice_created_event(event_data: Dict[str, Any]) -> None:
    from app.agents.email_parser import EmailParserAgent
    agent = EmailParserAgent(
        pdf_url=event_data.get("pdf_url"),
        invoice_id=event_data.get("invoice_id"),
    )
    await agent.execute()


EVENT_HANDLERS = {
    "task_stuck": handle_task_stuck_event,
    "approval_overdue": handle_approval_overdue_event,
    "invoice_created": handle_invoice_created_event,
}


# ── Dispatch ──────────────────────────────────────────────────────────────────

async def process_agent_event(message: Dict[str, Any]) -> None:
    try:
        event_type = message.get("type")
        handler = EVENT_HANDLERS.get(event_type)
        if handler:
            logger.info(f"Dispatching event: {event_type}")
            await handler(message)
        else:
            logger.warning(f"Unknown event type: {event_type}")
    except Exception as e:
        logger.error(f"Error processing event: {e}")


# ── Subscribe loop ────────────────────────────────────────────────────────────

async def _run_worker():
    """Single subscribe lifecycle."""
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe("agent_events")
    logger.info("Redis worker listening on 'agent_events'")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                event_data = json.loads(message["data"])
                await process_agent_event(event_data)
    finally:
        await pubsub.unsubscribe("agent_events")
        await r.aclose()


async def start_worker() -> None:
    """Reconnecting wrapper around _run_worker."""
    delay = _INITIAL_DELAY
    while True:
        try:
            await _run_worker()
        except asyncio.CancelledError:
            logger.info("Redis worker shut down")
            return
        except Exception as exc:
            logger.error(f"Redis worker crashed: {exc}. Reconnecting in {delay}s…")
            await asyncio.sleep(delay)
            delay = min(delay * 2, 60)
        else:
            delay = _INITIAL_DELAY  # reset on clean exit
