import logging
from datetime import datetime, timedelta
from uuid import uuid4
from app.db import get_conn
from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)


class TaskEscalatorAgent(BaseAgent):
    """Agent that escalates stuck tasks and updates health status"""

    agent_type = "task_escalator"

    def get_action_type(self) -> str:
        return "TASK_ESCALATED"

    async def run(self):
        """Check for stuck tasks and escalate them"""
        stuck_threshold = datetime.utcnow() - timedelta(hours=48)

        async with get_conn() as conn:
            stuck_tasks = await conn.fetch(
                '''SELECT * FROM "Task"
                   WHERE "status" = 'ACTIVE'::"TaskStatus"
                   AND "lastUpdated" < $1
                   ORDER BY "lastUpdated" ASC''',
                stuck_threshold
            )

            for task in stuck_tasks:
                await self._escalate_task(conn, task)

        return {"tasks_escalated": len(stuck_tasks)}

    async def _escalate_task(self, conn, task):
        """Escalate a single stuck task"""
        try:
            logger.info(f"Escalating stuck task {task['id']}: {task['title']}")

            await conn.execute(
                '''UPDATE "Task"
                   SET "healthStatus" = 'CRITICAL'::"HealthStatus", "updatedAt" = NOW()
                   WHERE "id" = $1''',
                task["id"]
            )

            detail = await conn.fetchrow(
                'SELECT "id" FROM "TaskDetail" WHERE "taskId" = $1',
                task["id"]
            )

            if detail:
                await conn.execute(
                    '''UPDATE "TaskDetail"
                       SET "healthStatus" = 'CRITICAL'::"HealthStatus", "updatedAt" = NOW()
                       WHERE "taskId" = $1''',
                    task["id"]
                )
            else:
                await conn.execute(
                    '''INSERT INTO "TaskDetail" ("id", "taskId", "healthStatus", "createdAt", "updatedAt")
                       VALUES ($1, $2, 'CRITICAL'::"HealthStatus", NOW(), NOW())''',
                    str(uuid4()), task["id"]
                )

        except Exception as e:
            logger.error(f"Error escalating task {task['id']}: {e}")
