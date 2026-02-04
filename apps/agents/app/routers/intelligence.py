import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.db import get_conn

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filter_type: Optional[str] = None


class SearchResult(BaseModel):
    score: float
    text: str
    metadata: dict


class AgentLogResponse(BaseModel):
    id: str
    action: str
    context: dict
    timestamp: datetime
    status: str


@router.post("/search", response_model=List[SearchResult])
async def semantic_search(request: SearchRequest):
    from app.rag.retriever import get_rag_retriever
    retriever = get_rag_retriever()
    filter_dict = {"type": request.filter_type} if request.filter_type else None
    results = await retriever.semantic_search(
        query=request.query, top_k=request.top_k, filter_dict=filter_dict
    )
    return results


@router.get("/agent-logs", response_model=List[AgentLogResponse])
async def get_agent_logs(limit: int = 50):
    async with get_conn() as conn:
        rows = await conn.fetch(
            'SELECT * FROM "AgentLog" ORDER BY "timestamp" DESC LIMIT $1', limit
        )
    if rows:
        return [
            {
                "id": r["id"],
                "action": r["action"],
                "context": json.loads(r["context"]) if isinstance(r["context"], str) else r["context"],
                "timestamp": r["timestamp"],
                "status": r["status"],
            }
            for r in rows
        ]
    # Seed-level mock so the Intelligence Hub feed is never blank
    now = datetime.now()
    return [
        {"id": "log-1", "action": "TASK_STUCK_ALERT", "context": {"task_id": "task-123", "days_stuck": 3}, "timestamp": now - timedelta(minutes=15), "status": "SUCCESS"},
        {"id": "log-2", "action": "TIMESHEET_REMINDER", "context": {"users_notified": 5}, "timestamp": now - timedelta(hours=1), "status": "SUCCESS"},
        {"id": "log-3", "action": "APPROVAL_NUDGE", "context": {"approval_id": "approval-1", "urgency": "high"}, "timestamp": now - timedelta(hours=2), "status": "SUCCESS"},
        {"id": "log-4", "action": "EMAIL_PARSED", "context": {"invoice_id": "inv-1", "amount": 50000}, "timestamp": now - timedelta(hours=5), "status": "SUCCESS"},
    ]


@router.post("/agents/trigger/{agent_type}")
async def trigger_agent(agent_type: str):
    """Manually trigger an agent by type. Valid types: task_monitor, approval_nudger, timesheet_drafter"""
    if agent_type == "task_monitor":
        from app.agents.task_monitor import TaskMonitorAgent
        agent = TaskMonitorAgent()
    elif agent_type == "approval_nudger":
        from app.agents.approval_nudger import ApprovalNudgerAgent
        agent = ApprovalNudgerAgent()
    elif agent_type == "timesheet_drafter":
        from app.agents.timesheet_drafter import TimesheetDrafterAgent
        agent = TimesheetDrafterAgent()
    else:
        raise HTTPException(status_code=400, detail=f"Unknown agent type: {agent_type}. Valid: task_monitor, approval_nudger, timesheet_drafter")

    result = await agent.execute()
    return {"agent": agent_type, "result": result}


@router.post("/parse-pdf")
async def parse_pdf(pdf_url: str, invoice_id: Optional[str] = None):
    from app.agents.email_parser import EmailParserAgent
    agent = EmailParserAgent(pdf_url=pdf_url, invoice_id=invoice_id)
    result = await agent.execute()
    return {"message": "PDF parsing completed", "result": result}


@router.post("/index-document")
async def index_document(doc_id: str, text: str, metadata: dict):
    from app.rag.retriever import get_rag_retriever
    retriever = get_rag_retriever()
    await retriever.index_document(doc_id=doc_id, text=text, metadata=metadata)
    return {"message": "Document indexed successfully", "doc_id": doc_id}


# ── Timesheet reminder preview / send ─────────────────────────────────────

class TimesheetPreviewResponse(BaseModel):
    user_id: str
    user_name: str
    email: str
    subject: str
    html_body: str


@router.get("/preview-timesheet-reminder/{user_id}", response_model=TimesheetPreviewResponse)
async def preview_timesheet_reminder(user_id: str):
    """Generate a preview of the timesheet reminder email for a specific user."""
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "User" WHERE "id" = $1', user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    from app.agents.timesheet_drafter import TimesheetDrafterAgent
    agent = TimesheetDrafterAgent()
    recent_tasks = await agent.get_recent_tasks()
    github_activity = agent.get_github_activity(row.get("githubUsername"))
    html_body = agent.generate_html_email(
        user_name=row["name"],
        recent_tasks=recent_tasks,
        github_activity=github_activity,
    )
    return {
        "user_id": user_id,
        "user_name": row["name"],
        "email": row["email"],
        "subject": "Reminder: Please Submit Your Timesheet",
        "html_body": html_body,
    }


class SendTimesheetResponse(BaseModel):
    user_id: str
    email: str
    sent: bool
    reason: Optional[str] = None


@router.post("/send-timesheet-reminder/{user_id}", response_model=SendTimesheetResponse)
async def send_timesheet_reminder(user_id: str):
    """Send a timesheet reminder email to a specific user."""
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "User" WHERE "id" = $1', user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    from app.agents.timesheet_drafter import TimesheetDrafterAgent
    from app.services.email_service import get_email_service

    agent = TimesheetDrafterAgent()
    recent_tasks = await agent.get_recent_tasks()
    github_activity = agent.get_github_activity(row.get("githubUsername"))
    html_body = agent.generate_html_email(
        user_name=row["name"],
        recent_tasks=recent_tasks,
        github_activity=github_activity,
    )

    result = await get_email_service().send_email(
        to=row["email"],
        subject="Reminder: Please Submit Your Timesheet",
        body=html_body,
    )
    return {
        "user_id": user_id,
        "email": row["email"],
        "sent": result.get("sent", False),
        "reason": result.get("reason"),
    }
