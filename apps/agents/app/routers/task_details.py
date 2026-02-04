from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskDetailCreate(BaseModel):
    taskId: str
    contactPerson: Optional[str] = None
    peopleCount: int = 0
    processStage: str = "PLANNING"
    healthStatus: str = "HEALTHY"


class TaskDetailUpdate(BaseModel):
    contactPerson: Optional[str] = None
    peopleCount: Optional[int] = None
    processStage: Optional[str] = None
    healthStatus: Optional[str] = None


class TaskDetailResponse(BaseModel):
    id: str
    taskId: str
    contactPerson: Optional[str]
    peopleCount: int
    processStage: str
    healthStatus: str
    createdAt: datetime
    updatedAt: datetime


class WorkHistoryEvent(BaseModel):
    timestamp: datetime
    action: str
    details: Optional[str] = None


def row_to_task_detail(row) -> dict:
    return {
        "id": row["id"],
        "taskId": row["taskId"],
        "contactPerson": row["contactPerson"],
        "peopleCount": row["peopleCount"],
        "processStage": row["processStage"],
        "healthStatus": row["healthStatus"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


@router.get("/{task_id}/details", response_model=TaskDetailResponse)
async def get_task_details(task_id: str):
    """Get detailed information about a task"""
    async with get_conn() as conn:
        # Get or create task detail
        detail = await conn.fetchrow('SELECT * FROM "TaskDetail" WHERE "taskId" = $1', task_id)
        
        if not detail:
            # Create default task detail
            detail_id = str(uuid4())
            detail = await conn.fetchrow(
                '''INSERT INTO "TaskDetail" ("id", "taskId", "createdAt", "updatedAt")
                   VALUES ($1, $2, NOW(), NOW())
                   RETURNING *''',
                detail_id, task_id
            )
    
    if not detail:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return row_to_task_detail(detail)


@router.patch("/{task_id}/details", response_model=TaskDetailResponse)
async def update_task_details(task_id: str, details: TaskDetailUpdate):
    """Update task details"""
    async with get_conn() as conn:
        # Get or create task detail
        detail = await conn.fetchrow('SELECT * FROM "TaskDetail" WHERE "taskId" = $1', task_id)
        
        if not detail:
            # Create new task detail
            detail_id = str(uuid4())
            detail = await conn.fetchrow(
                '''INSERT INTO "TaskDetail" ("id", "taskId", "createdAt", "updatedAt")
                   VALUES ($1, $2, NOW(), NOW())
                   RETURNING *''',
                detail_id, task_id
            )
        
        # Update fields
        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        
        if details.contactPerson is not None:
            sets.append(f'"contactPerson" = ${idx}')
            params.append(details.contactPerson)
            idx += 1
        if details.peopleCount is not None:
            sets.append(f'"peopleCount" = ${idx}')
            params.append(details.peopleCount)
            idx += 1
        if details.processStage is not None:
            sets.append(f'"processStage" = ${idx}::\"ProcessStage\"')
            params.append(details.processStage)
            idx += 1
        if details.healthStatus is not None:
            sets.append(f'"healthStatus" = ${idx}::\"HealthStatus\"')
            params.append(details.healthStatus)
            idx += 1
        
        params.append(task_id)
        query = f'UPDATE "TaskDetail" SET {", ".join(sets)} WHERE "taskId" = ${idx} RETURNING *'
        updated = await conn.fetchrow(query, *params)
    
    return row_to_task_detail(updated)


@router.get("/{task_id}/work-history", response_model=List[WorkHistoryEvent])
async def get_task_work_history(task_id: str):
    """Get work history timeline for a task"""
    async with get_conn() as conn:
        # Get task detail with work history
        detail = await conn.fetchrow('SELECT "workHistory" FROM "TaskDetail" WHERE "taskId" = $1', task_id)
        
        if not detail:
            return []
        
        work_history = detail["workHistory"] or []
        return [
            {
                "timestamp": event.get("timestamp"),
                "action": event.get("action"),
                "details": event.get("details"),
            }
            for event in work_history
        ]


@router.post("/{task_id}/work-history")
async def add_work_history_event(task_id: str, event: WorkHistoryEvent):
    """Add an event to task work history"""
    async with get_conn() as conn:
        # Get or create task detail
        detail = await conn.fetchrow('SELECT * FROM "TaskDetail" WHERE "taskId" = $1', task_id)
        
        if not detail:
            detail_id = str(uuid4())
            await conn.execute(
                '''INSERT INTO "TaskDetail" ("id", "taskId", "createdAt", "updatedAt")
                   VALUES ($1, $2, NOW(), NOW())''',
                detail_id, task_id
            )
            detail = await conn.fetchrow('SELECT * FROM "TaskDetail" WHERE "taskId" = $1', task_id)
        
        # Add event to work history
        work_history = detail["workHistory"] or []
        work_history.append({
            "timestamp": event.timestamp.isoformat(),
            "action": event.action,
            "details": event.details,
        })
        
        await conn.execute(
            '''UPDATE "TaskDetail" 
               SET "workHistory" = $1, "updatedAt" = NOW()
               WHERE "taskId" = $2''',
            work_history, task_id
        )
    
    return {"status": "added", "event": event}
