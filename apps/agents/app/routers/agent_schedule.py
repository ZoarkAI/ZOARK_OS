from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/agents/schedule", tags=["agents"])


class AgentScheduleCreate(BaseModel):
    agentType: str
    cronExpression: str
    isActive: bool = True


class AgentScheduleUpdate(BaseModel):
    cronExpression: Optional[str] = None
    isActive: Optional[bool] = None


class AgentScheduleResponse(BaseModel):
    id: str
    agentType: str
    cronExpression: str
    isActive: bool
    lastRun: Optional[datetime]
    nextRun: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime


def row_to_agent_schedule(row) -> dict:
    return {
        "id": row["id"],
        "agentType": row["agentType"],
        "cronExpression": row["cronExpression"],
        "isActive": row["isActive"],
        "lastRun": row["lastRun"],
        "nextRun": row["nextRun"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


@router.get("/", response_model=List[AgentScheduleResponse])
async def list_agent_schedules(agent_type: Optional[str] = None):
    async with get_conn() as conn:
        if agent_type:
            rows = await conn.fetch(
                'SELECT * FROM "AgentSchedule" WHERE "agentType" = $1 ORDER BY "createdAt" DESC',
                agent_type
            )
        else:
            rows = await conn.fetch('SELECT * FROM "AgentSchedule" ORDER BY "createdAt" DESC')
    return [row_to_agent_schedule(r) for r in rows]


@router.get("/{schedule_id}", response_model=AgentScheduleResponse)
async def get_agent_schedule(schedule_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "AgentSchedule" WHERE "id" = $1', schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return row_to_agent_schedule(row)


@router.post("/", response_model=AgentScheduleResponse, status_code=201)
async def create_agent_schedule(schedule: AgentScheduleCreate):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO "AgentSchedule" ("id", "agentType", "cronExpression", "isActive", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, NOW(), NOW())
               RETURNING *''',
            str(uuid4()), schedule.agentType, schedule.cronExpression, schedule.isActive,
        )
    return row_to_agent_schedule(row)


@router.patch("/{schedule_id}", response_model=AgentScheduleResponse)
async def update_agent_schedule(schedule_id: str, schedule: AgentScheduleUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "AgentSchedule" WHERE "id" = $1', schedule_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Schedule not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        
        if schedule.cronExpression is not None:
            sets.append(f'"cronExpression" = ${idx}')
            params.append(schedule.cronExpression)
            idx += 1
        if schedule.isActive is not None:
            sets.append(f'"isActive" = ${idx}')
            params.append(schedule.isActive)
            idx += 1

        params.append(schedule_id)
        query = f'UPDATE "AgentSchedule" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_agent_schedule(row)


@router.delete("/{schedule_id}", status_code=204)
async def delete_agent_schedule(schedule_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "AgentSchedule" WHERE "id" = $1', schedule_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Schedule not found")
