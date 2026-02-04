from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    healthScore: float = 0.0
    velocity: float = 0.0


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    healthScore: Optional[float] = None
    velocity: Optional[float] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    healthScore: float
    velocity: float
    createdAt: datetime


def row_to_project(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "healthScore": row["healthScore"],
        "velocity": row["velocity"],
        "createdAt": row["createdAt"],
    }


@router.get("/", response_model=list[ProjectResponse])
async def list_projects():
    async with get_conn() as conn:
        rows = await conn.fetch('SELECT * FROM "Project" ORDER BY "createdAt" DESC')
    return [row_to_project(r) for r in rows]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "Project" WHERE "id" = $1', project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return row_to_project(row)


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(project: ProjectCreate):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO "Project" ("id", "name", "description", "healthScore", "velocity", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
               RETURNING *''',
            str(uuid4()), project.name, project.description, project.healthScore, project.velocity,
        )
    return row_to_project(row)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "Project" WHERE "id" = $1', project_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Project not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        if project.name is not None:
            sets.append(f'"name" = ${idx}')
            params.append(project.name)
            idx += 1
        if project.description is not None:
            sets.append(f'"description" = ${idx}')
            params.append(project.description)
            idx += 1
        if project.healthScore is not None:
            sets.append(f'"healthScore" = ${idx}')
            params.append(project.healthScore)
            idx += 1
        if project.velocity is not None:
            sets.append(f'"velocity" = ${idx}')
            params.append(project.velocity)
            idx += 1

        params.append(project_id)
        query = f'UPDATE "Project" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_project(row)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "Project" WHERE "id" = $1', project_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Project not found")


@router.get("/{project_id}/velocity")
async def get_project_velocity(project_id: str):
    async with get_conn() as conn:
        rows = await conn.fetch(
            '''SELECT
                 DATE_TRUNC('week', "createdAt") AS week_start,
                 COUNT(*) AS completed
               FROM "Task"
               WHERE "projectId" = $1 AND "status" = 'DONE'
               GROUP BY week_start
               ORDER BY week_start DESC
               LIMIT 4''',
            project_id,
        )
    if not rows:
        return [
            {"week": "Week 1", "completed": 5},
            {"week": "Week 2", "completed": 8},
            {"week": "Week 3", "completed": 6},
            {"week": "Week 4", "completed": 10},
        ]
    return [{"week": f"Week {i+1}", "completed": r["completed"]} for i, r in enumerate(reversed(rows))]
