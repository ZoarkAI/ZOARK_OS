"""
PostgreSQL LISTEN/NOTIFY → Redis bridge.

PostgreSQL triggers fire pg_notify('agent_events', payload).
This listener picks those up and publishes them to the Redis
'agent_events' channel so the redis_worker can dispatch to agents.

Reconnects automatically on connection drop with exponential back-off
(5 s → 10 s → 20 s … capped at 60 s).
"""

import asyncio
import logging

import asyncpg
import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_INITIAL_DELAY = 5  # seconds


async def _run_listener():
    """Single connection lifecycle: connect → listen → wait forever."""
    conn = await asyncpg.connect(settings.database_url)
    redis = aioredis.from_url(settings.redis_url)
    loop = asyncio.get_running_loop()

    def on_notify(connection, pid, channel, payload):
        loop.create_task(redis.publish("agent_events", payload))
        logger.info(f"pg_notify forwarded: {payload}")

    await conn.execute("LISTEN agent_events")
    await conn.add_listener("agent_events", on_notify)
    logger.info("PostgreSQL LISTEN active on 'agent_events'")

    try:
        await asyncio.Event().wait()  # block until cancelled
    finally:
        await conn.remove_listener("agent_events", on_notify)
        await conn.close()
        await redis.aclose()


async def start_pg_listener():
    """Reconnecting wrapper around _run_listener."""
    delay = _INITIAL_DELAY
    while True:
        try:
            await _run_listener()
        except asyncio.CancelledError:
            logger.info("pg_listener shut down")
            return
        except Exception as exc:
            logger.error(f"pg_listener crashed: {exc}. Reconnecting in {delay}s…")
            await asyncio.sleep(delay)
            delay = min(delay * 2, 60)
        else:
            delay = _INITIAL_DELAY  # reset on clean exit
