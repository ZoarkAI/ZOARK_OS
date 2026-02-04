import logging
from datetime import datetime
from app.db import get_conn
from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)


class TeamCoordinatorAgent(BaseAgent):
    """Agent that coordinates team tasks, sends reminders, and collects documents"""

    agent_type = "team_coordinator"

    def get_action_type(self) -> str:
        return "TEAM_REMINDER"

    async def run(self):
        """Send document collection reminders and track submissions"""
        async with get_conn() as conn:
            assignments = await conn.fetch(
                '''SELECT ta.*, tm."email", t."title", t."id" as "taskId"
                   FROM "TaskAssignment" ta
                   JOIN "TeamMember" tm ON ta."teamMemberId" = tm."id"
                   JOIN "Task" t ON ta."taskId" = t."id"
                   WHERE t."status" = 'ACTIVE'::"TaskStatus"
                   ORDER BY ta."assignedAt" DESC'''
            )

            for assignment in assignments:
                await self._check_assignment(conn, assignment)

        return {"assignments_checked": len(assignments)}

    async def _check_assignment(self, conn, assignment):
        """Check assignment status and send reminders if needed"""
        try:
            team_member_id = assignment["teamMemberId"]
            task_id = assignment["taskId"]

            documents = await conn.fetch(
                'SELECT * FROM "TeamDocument" WHERE "teamMemberId" = $1 ORDER BY "uploadedAt" DESC LIMIT 1',
                team_member_id
            )

            if not documents or (datetime.utcnow() - documents[0]["uploadedAt"]).days > 7:
                logger.info(f"Sending reminder to {assignment['email']} for task {task_id}")

        except Exception as e:
            logger.error(f"Error checking assignment {assignment['id']}: {e}")

    async def generate_team_report(self, project_id: str):
        """Generate a team report for a project"""
        try:
            async with get_conn() as conn:
                team_members = await conn.fetch(
                    '''SELECT tm.*, COUNT(ta."id") as "taskCount"
                       FROM "TeamMember" tm
                       LEFT JOIN "TaskAssignment" ta ON tm."id" = ta."teamMemberId"
                       LEFT JOIN "Task" t ON ta."taskId" = t."id" AND t."projectId" = $1
                       GROUP BY tm."id"''',
                    project_id
                )

                task_stats = await conn.fetchrow(
                    '''SELECT
                       COUNT(*) as "total",
                       SUM(CASE WHEN "status" = 'DONE'::"TaskStatus" THEN 1 ELSE 0 END) as "completed",
                       SUM(CASE WHEN "status" = 'ACTIVE'::"TaskStatus" THEN 1 ELSE 0 END) as "active",
                       SUM(CASE WHEN "healthStatus" = 'CRITICAL'::"HealthStatus" THEN 1 ELSE 0 END) as "critical"
                       FROM "Task" WHERE "projectId" = $1''',
                    project_id
                )

                return {
                    "projectId": project_id,
                    "generatedAt": datetime.utcnow().isoformat(),
                    "teamMembers": [
                        {
                            "id": tm["id"],
                            "name": tm["name"],
                            "email": tm["email"],
                            "taskCount": tm["taskCount"] or 0,
                        }
                        for tm in team_members
                    ],
                    "taskStatistics": {
                        "total": task_stats["total"] or 0,
                        "completed": task_stats["completed"] or 0,
                        "active": task_stats["active"] or 0,
                        "critical": task_stats["critical"] or 0,
                    },
                }

        except Exception as e:
            logger.error(f"Error generating team report: {e}")
            return None
