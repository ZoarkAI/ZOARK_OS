from abc import ABC, abstractmethod
import logging
import json
from datetime import datetime, timezone
from uuid import uuid4
from typing import Any, Dict
import redis.asyncio as aioredis
from app.db import get_conn
from app.config import get_settings


class BaseAgent(ABC):
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    async def execute(self) -> Dict[str, Any]:
        self.logger.info(f"Starting {self.__class__.__name__} execution")
        try:
            result = await self.run()
            await self.log_success(result)
            self.logger.info(f"Successfully completed {self.__class__.__name__}")
            return result
        except Exception as e:
            self.logger.error(f"Error in {self.__class__.__name__}: {str(e)}")
            await self.log_failure(e)
            raise

    @abstractmethod
    async def run(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_action_type(self) -> str:
        pass

    async def log_success(self, result: Dict[str, Any]) -> None:
        log_id = str(uuid4())
        now = datetime.now(timezone.utc)
        try:
            async with get_conn() as conn:
                await conn.execute(
                    '''INSERT INTO "AgentLog" ("id", "action", "context", "timestamp", "status")
                       VALUES ($1, $2::\"AgentAction\", $3::jsonb, NOW(), 'SUCCESS'::\"AgentStatus\")''',
                    log_id,
                    self.get_action_type(),
                    json.dumps(result, default=str),
                )
        except Exception as e:
            self.logger.error(f"Failed to log success: {e}")

        await self._publish_log({
            "id": log_id,
            "action": self.get_action_type(),
            "context": result,
            "timestamp": now.isoformat(),
            "status": "SUCCESS",
        })

    async def log_failure(self, error: Exception) -> None:
        log_id = str(uuid4())
        now = datetime.now(timezone.utc)
        context = {"error": str(error), "type": type(error).__name__}
        try:
            async with get_conn() as conn:
                await conn.execute(
                    '''INSERT INTO "AgentLog" ("id", "action", "context", "timestamp", "status")
                       VALUES ($1, $2::\"AgentAction\", $3::jsonb, NOW(), 'FAILED'::\"AgentStatus\")''',
                    log_id,
                    self.get_action_type(),
                    json.dumps(context, default=str),
                )
        except Exception as e:
            self.logger.error(f"Failed to log failure: {e}")

        await self._publish_log({
            "id": log_id,
            "action": self.get_action_type(),
            "context": context,
            "timestamp": now.isoformat(),
            "status": "FAILED",
        })

    async def _publish_log(self, log_entry: Dict[str, Any]) -> None:
        try:
            settings = get_settings()
            r = aioredis.from_url(settings.redis_url)
            await r.publish('agent_logs', json.dumps(log_entry, default=str))
            await r.aclose()
        except Exception as e:
            self.logger.error(f"Failed to publish to Redis: {e}")
