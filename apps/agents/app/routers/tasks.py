from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    projectId: str
    title: str
    description: Optional[str] = None
    status: str = "BACKLOG"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    projectId: str
    title: str
    description: Optional[str]
    status: str
    lastUpdated: datetime
    createdAt: datetime


def row_to_task(row) -> dict:
    return {
        "id": row["id"],
        "projectId": row["projectId"],
        "title": row["title"],
        "description": row["description"],
        "status": row["status"],
        "lastUpdated": row["lastUpdated"],
        "createdAt": row["createdAt"],
    }


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    async with get_conn() as conn:
        query = 'SELECT * FROM "Task"'
        conditions = []
        params = []
        idx = 1
        if project_id:
            conditions.append(f'"projectId" = ${idx}')
            params.append(project_id)
            idx += 1
        if status:
            conditions.append(f'"status" = ${idx}::\"TaskStatus\"')
            params.append(status)
            idx += 1
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += ' ORDER BY "createdAt" DESC'
        rows = await conn.fetch(query, *params)
    return [row_to_task(r) for r in rows]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "Task" WHERE "id" = $1', task_id)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return row_to_task(row)


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(task: TaskCreate):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO "Task" ("id", "projectId", "title", "description", "status", "lastUpdated", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5::\"TaskStatus\", NOW(), NOW(), NOW())
               RETURNING *''',
            str(uuid4()), task.projectId, task.title, task.description, task.status,
        )
    return row_to_task(row)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "Task" WHERE "id" = $1', task_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        sets = ['"updatedAt" = NOW()', '"lastUpdated" = NOW()']
        params: list = []
        idx = 1
        if task.title is not None:
            sets.append(f'"title" = ${idx}')
            params.append(task.title)
            idx += 1
        if task.description is not None:
            sets.append(f'"description" = ${idx}')
            params.append(task.description)
            idx += 1
        if task.status is not None:
            sets.append(f'"status" = ${idx}::\"TaskStatus\"')
            params.append(task.status)
            idx += 1

        params.append(task_id)
        query = f'UPDATE "Task" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_task(row)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "Task" WHERE "id" = $1', task_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Task not found")
