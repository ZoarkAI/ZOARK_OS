"""
Task Monitor Agent - Detects and alerts on stuck tasks.
Monitors tasks in ACTIVE status and alerts when they haven't been updated in >48 hours.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from app.agents.base_agent import BaseAgent
from app.db import get_conn


class TaskMonitorAgent(BaseAgent):
    def __init__(self, task_id: str = None):
        super().__init__()
        self.task_id = task_id

    def get_action_type(self) -> str:
        return 'TASK_STUCK_ALERT'

    async def run(self) -> Dict[str, Any]:
        stuck_tasks = await self.find_stuck_tasks()

        alerts = []
        for task in stuck_tasks:
            alert = await self.send_alert(task)
            alerts.append(alert)

        return {
            'alerts_sent': len(alerts),
            'tasks': alerts
        }

    async def find_stuck_tasks(self) -> List[Dict[str, Any]]:
        threshold = (datetime.now(timezone.utc) - timedelta(hours=48)).replace(tzinfo=None)

        async with get_conn() as conn:
            if self.task_id:
                rows = await conn.fetch(
                    '''SELECT t.*, p."name" as project_name
                       FROM "Task" t
                       JOIN "Project" p ON t."projectId" = p."id"
                       WHERE t."id" = $1 AND t."status" = 'ACTIVE' AND t."lastUpdated" < $2''',
                    self.task_id, threshold,
                )
            else:
                rows = await conn.fetch(
                    '''SELECT t.*, p."name" as project_name
                       FROM "Task" t
                       JOIN "Project" p ON t."projectId" = p."id"
                       WHERE t."status" = 'ACTIVE' AND t."lastUpdated" < $1''',
                    threshold,
                )

        return [
            {
                'id': r['id'],
                'title': r['title'],
                'project': {'name': r['project_name'], 'id': r['projectId']},
                'lastUpdated': r['lastUpdated'],
                'status': r['status'],
            }
            for r in rows
        ]

    async def send_alert(self, task: Dict[str, Any]) -> Dict[str, Any]:
        stuck_days = (datetime.now(timezone.utc).replace(tzinfo=None) - task['lastUpdated']).days

        self.logger.warning(
            f"Task {task['id']} ({task['title']}) stuck for {stuck_days} days"
        )

        from app.services.email_service import get_email_service
        from app.config import get_settings
        settings = get_settings()

        email_sent = False
        if settings.alert_email:
            subject = f"[ZOARK OS] Task Stuck — {task['title']}"
            body = (
                f"<h2>Task Stuck Alert</h2>"
                f"<table style='border-collapse:collapse;width:100%'>"
                f"<tr><td style='padding:6px 12px;color:#9ca3af'>Task</td>"
                f"<td style='padding:6px 12px;font-weight:bold'>{task['title']}</td></tr>"
                f"<tr><td style='padding:6px 12px;color:#9ca3af'>Project</td>"
                f"<td style='padding:6px 12px'>{task['project']['name']}</td></tr>"
                f"<tr><td style='padding:6px 12px;color:#9ca3af'>Status</td>"
                f"<td style='padding:6px 12px'>{task['status']}</td></tr>"
                f"<tr><td style='padding:6px 12px;color:#9ca3af'>Stuck For</td>"
                f"<td style='padding:6px 12px;color:#ef4444;font-weight:bold'>{stuck_days} day(s)</td></tr>"
                f"</table>"
                f"<p style='margin-top:16px;color:#6b7280'>Last updated: {task['lastUpdated']}</p>"
                f"<p style='color:#6b7280'>— ZOARK OS Task Monitor</p>"
            )
            result = await get_email_service().send_email(
                to=settings.alert_email,
                subject=subject,
                body=body,
            )
            email_sent = result.get("sent", False)

        return {
            'task_id': task['id'],
            'task_title': task['title'],
            'project': task['project']['name'],
            'stuck_days': stuck_days,
            'alert_sent': True,
            'email_sent': email_sent,
        }
