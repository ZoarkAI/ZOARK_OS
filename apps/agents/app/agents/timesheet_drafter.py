"""
Timesheet Drafter Agent - Auto-drafts timesheet reminder emails.
Finds users with incomplete timesheets, gathers context, and drafts reminders.
"""

from typing import Dict, Any, List
from app.agents.base_agent import BaseAgent
from app.db import get_conn


class TimesheetDrafterAgent(BaseAgent):
    def get_action_type(self) -> str:
        return 'TIMESHEET_REMINDER'

    async def run(self) -> Dict[str, Any]:
        incomplete_users = await self.find_incomplete_users()

        drafts = []
        for user in incomplete_users:
            draft = await self.draft_reminder_email(user)
            drafts.append(draft)

        return {
            'drafts_created': len(drafts),
            'users': [d['user_id'] for d in drafts]
        }

    async def find_incomplete_users(self) -> List[Dict[str, Any]]:
        async with get_conn() as conn:
            rows = await conn.fetch(
                'SELECT * FROM "User" WHERE "timesheetStatus" != $1',
                'completed',
            )

        return [
            {
                'id': r['id'],
                'name': r['name'],
                'email': r['email'],
                'githubUsername': r['githubUsername'],
                'timesheetStatus': r['timesheetStatus'],
            }
            for r in rows
        ]

    async def draft_reminder_email(self, user: Dict[str, Any]) -> Dict[str, Any]:
        recent_tasks = await self.get_recent_tasks()
        github_activity = self.get_github_activity(user.get('githubUsername'))

        email_draft = self.generate_email(
            user_name=user['name'],
            recent_tasks=recent_tasks,
            github_activity=github_activity,
        )

        self.logger.info(f"Generated timesheet reminder for {user['name']}")

        # Send the reminder email
        from app.services.email_service import get_email_service
        email_sent = False
        html_body = self.generate_html_email(
            user_name=user['name'],
            recent_tasks=recent_tasks,
            github_activity=github_activity,
        )
        result = await get_email_service().send_email(
            to=user['email'],
            subject="Reminder: Please Submit Your Timesheet",
            body=html_body,
        )
        email_sent = result.get("sent", False)

        return {
            'user_id': user['id'],
            'user_name': user['name'],
            'email': user['email'],
            'draft': email_draft,
            'email_sent': email_sent,
        }

    async def get_recent_tasks(self) -> List[str]:
        async with get_conn() as conn:
            rows = await conn.fetch(
                'SELECT "title" FROM "Task" WHERE "status" = $1 ORDER BY "lastUpdated" DESC LIMIT 5',
                'DONE',
            )
        return [r['title'] for r in rows]

    def get_github_activity(self, github_username: str = None) -> Dict[str, Any]:
        if not github_username:
            return {'commits': 0, 'repos': []}
        # GitHub API integration would go here; return placeholder for now
        return {
            'commits': 15,
            'repos': ['zoark-os', 'frontend-app'],
            'last_commit': '2 days ago'
        }

    def generate_email(self, user_name: str, recent_tasks: List[str], github_activity: Dict[str, Any]) -> str:
        tasks_str = '\n'.join(f'- {t}' for t in recent_tasks) if recent_tasks else '- (no recent completed tasks)'
        repos_str = ', '.join(github_activity['repos']) if github_activity['repos'] else 'none'

        return (
            f"Hi {user_name},\n\n"
            f"Hope you're wrapping up a great week! I noticed recent progress on:\n"
            f"{tasks_str}\n\n"
            f"You've also been active on GitHub with {github_activity['commits']} commits across {repos_str}.\n\n"
            f"Just a friendly reminder to submit your timesheet before end of day today.\n\n"
            f"Thanks!\nZOARK OS"
        )

    def generate_html_email(self, user_name: str, recent_tasks: List[str], github_activity: Dict[str, Any]) -> str:
        tasks_html = ''.join(
            f"<li style='padding:4px 0;color:#cbd5e1'>{t}</li>" for t in recent_tasks
        ) if recent_tasks else "<li style='color:#6b7280'>(no recent completed tasks)</li>"

        repos_str = ', '.join(github_activity['repos']) if github_activity['repos'] else 'none'

        return (
            f"<h2 style='color:#e2e8f0'>Hi {user_name},</h2>"
            f"<p style='color:#cbd5e1'>Hope you're wrapping up a great week! Here's a summary of your recent activity:</p>"
            f"<h3 style='color:#a78bfa;margin-top:20px'>Recent Task Progress</h3>"
            f"<ul style='list-style:disc;padding-left:20px'>{tasks_html}</ul>"
            f"<h3 style='color:#60a5fa;margin-top:20px'>GitHub Activity</h3>"
            f"<table style='border-collapse:collapse;width:100%'>"
            f"<tr><td style='padding:4px 12px;color:#9ca3af'>Commits</td>"
            f"<td style='padding:4px 12px;color:#cbd5e1;font-weight:bold'>{github_activity['commits']}</td></tr>"
            f"<tr><td style='padding:4px 12px;color:#9ca3af'>Repositories</td>"
            f"<td style='padding:4px 12px;color:#cbd5e1'>{repos_str}</td></tr>"
            f"</table>"
            f"<div style='margin-top:24px;padding:16px;background:#1e293b;border-radius:8px;border-left:4px solid #a78bfa'>"
            f"<p style='color:#e2e8f0;margin:0;font-weight:bold'>Action Required</p>"
            f"<p style='color:#cbd5e1;margin:8px 0 0'>Please submit your timesheet before end of day today.</p>"
            f"</div>"
            f"<p style='color:#6b7280;margin-top:24px;font-size:14px'>— ZOARK OS Timesheet Drafter</p>"
        )
