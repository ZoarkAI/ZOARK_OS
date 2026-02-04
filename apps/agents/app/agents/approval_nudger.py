"""
Approval Nudger Agent - Sends escalating nudges for pending approvals.
Monitors approval steps and sends reminders when deadlines are past due.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from app.agents.base_agent import BaseAgent
from app.db import get_conn


class ApprovalNudgerAgent(BaseAgent):
    def __init__(self, approval_id: str = None):
        super().__init__()
        self.approval_id = approval_id

    def get_action_type(self) -> str:
        return 'APPROVAL_NUDGE'

    async def run(self) -> Dict[str, Any]:
        overdue_approvals = await self.find_overdue_approvals()

        nudges_sent = []
        for approval in overdue_approvals:
            result = await self.send_nudge(approval)
            nudges_sent.append(result)

        return {
            'nudges_sent': len(nudges_sent),
            'approvals': nudges_sent
        }

    async def find_overdue_approvals(self) -> List[Dict[str, Any]]:
        async with get_conn() as conn:
            if self.approval_id:
                rows = await conn.fetch(
                    '''SELECT s.*, i."amount" as invoice_amount, p."name" as project_name
                       FROM "ApprovalStep" s
                       JOIN "Invoice" i ON s."invoiceId" = i."id"
                       JOIN "Project" p ON i."projectId" = p."id"
                       WHERE s."id" = $1
                         AND s."status" = 'PENDING'
                         AND s."deadline" < NOW()
                         AND (s."lastNudgedAt" IS NULL OR s."lastNudgedAt" < NOW() - INTERVAL '24 hours')''',
                    self.approval_id,
                )
            else:
                rows = await conn.fetch(
                    '''SELECT s.*, i."amount" as invoice_amount, p."name" as project_name
                       FROM "ApprovalStep" s
                       JOIN "Invoice" i ON s."invoiceId" = i."id"
                       JOIN "Project" p ON i."projectId" = p."id"
                       WHERE s."status" = 'PENDING'
                         AND s."deadline" < NOW()
                         AND (s."lastNudgedAt" IS NULL OR s."lastNudgedAt" < NOW() - INTERVAL '24 hours')''',
                )

        return [
            {
                'id': r['id'],
                'stage': r['stage'],
                'assigneeEmail': r['assigneeEmail'],
                'deadline': r['deadline'],
                'lastNudgedAt': r['lastNudgedAt'],
                'status': r['status'],
                'requiredDocs': r['requiredDocs'],
                'invoice': {
                    'id': r['invoiceId'],
                    'amount': float(r['invoice_amount']),
                    'project': {'name': r['project_name']},
                },
            }
            for r in rows
        ]

    async def send_nudge(self, approval: Dict[str, Any]) -> Dict[str, Any]:
        deadline = approval['deadline']
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        days_overdue = (datetime.now(timezone.utc) - deadline).days
        urgency = self.calculate_urgency(days_overdue)

        self.logger.info(
            f"Sending {urgency} urgency nudge for approval {approval['id']} "
            f"({days_overdue} days overdue)"
        )

        # Update lastNudgedAt
        async with get_conn() as conn:
            await conn.execute(
                'UPDATE "ApprovalStep" SET "lastNudgedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1',
                approval['id'],
            )

        # Send email nudge
        from app.services.email_service import get_email_service
        email_sent = False

        urgency_colors = {
            'low': '#3b82f6',
            'medium': '#eab308',
            'high': '#f97316',
            'critical': '#ef4444',
        }
        urgency_labels = {
            'low': 'Reminder',
            'medium': 'Action Required',
            'high': 'Urgent',
            'critical': 'CRITICAL — Immediate Action Required',
        }

        subject = f"[{urgency_labels[urgency]}] Approval Pending — {approval['stage']} (${approval['invoice']['amount']:,.2f})"
        body = (
            f"<h2 style='color:{urgency_colors[urgency]}'>{urgency_labels[urgency]}: Approval Pending</h2>"
            f"<table style='border-collapse:collapse;width:100%'>"
            f"<tr><td style='padding:6px 12px;color:#9ca3af'>Stage</td>"
            f"<td style='padding:6px 12px;font-weight:bold'>{approval['stage']}</td></tr>"
            f"<tr><td style='padding:6px 12px;color:#9ca3af'>Project</td>"
            f"<td style='padding:6px 12px'>{approval['invoice']['project']['name']}</td></tr>"
            f"<tr><td style='padding:6px 12px;color:#9ca3af'>Invoice Amount</td>"
            f"<td style='padding:6px 12px;font-weight:bold'>${approval['invoice']['amount']:,.2f}</td></tr>"
            f"<tr><td style='padding:6px 12px;color:#9ca3af'>Deadline</td>"
            f"<td style='padding:6px 12px;color:#ef4444'>{approval['deadline']}</td></tr>"
            f"<tr><td style='padding:6px 12px;color:#9ca3af'>Days Overdue</td>"
            f"<td style='padding:6px 12px;color:#ef4444;font-weight:bold'>{days_overdue} day(s)</td></tr>"
            f"</table>"
        )

        if approval.get('requiredDocs'):
            docs_list = ''.join(f"<li>{d}</li>" for d in approval['requiredDocs'])
            body += f"<p style='margin-top:12px;color:#9ca3af'>Required documents:</p><ul>{docs_list}</ul>"

        body += (
            f"<p style='margin-top:16px;color:#6b7280'>Please review and approve at your earliest convenience.</p>"
            f"<p style='color:#6b7280'>— ZOARK OS Approval Nudger</p>"
        )

        result = await get_email_service().send_email(
            to=approval['assigneeEmail'],
            subject=subject,
            body=body,
        )
        email_sent = result.get("sent", False)

        return {
            'approval_id': approval['id'],
            'stage': approval['stage'],
            'assignee': approval['assigneeEmail'],
            'days_overdue': days_overdue,
            'urgency': urgency,
            'nudge_sent': True,
            'email_sent': email_sent,
        }

    def calculate_urgency(self, days_overdue: int) -> str:
        if days_overdue > 7:
            return 'critical'
        elif days_overdue > 3:
            return 'high'
        elif days_overdue > 1:
            return 'medium'
        else:
            return 'low'
