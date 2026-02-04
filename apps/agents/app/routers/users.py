from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    timesheetStatus: str = "pending"
    githubUsername: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    timesheetStatus: Optional[str] = None
    githubUsername: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    timesheetStatus: str
    githubUsername: Optional[str]
    createdAt: datetime


def row_to_user(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "timesheetStatus": row["timesheetStatus"],
        "githubUsername": row["githubUsername"],
        "createdAt": row["createdAt"],
    }


@router.get("/", response_model=list[UserResponse])
async def list_users(timesheet_status: Optional[str] = Query(None)):
    async with get_conn() as conn:
        if timesheet_status:
            rows = await conn.fetch(
                'SELECT * FROM "User" WHERE "timesheetStatus" = $1 ORDER BY "createdAt" DESC',
                timesheet_status,
            )
        else:
            rows = await conn.fetch('SELECT * FROM "User" ORDER BY "createdAt" DESC')
    return [row_to_user(r) for r in rows]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "User" WHERE "id" = $1', user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row_to_user(row)


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO "User" ("id", "name", "email", "timesheetStatus", "githubUsername", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
               RETURNING *''',
            str(uuid4()), user.name, user.email, user.timesheetStatus, user.githubUsername,
        )
    return row_to_user(row)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user: UserUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "User" WHERE "id" = $1', user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        if user.name is not None:
            sets.append(f'"name" = ${idx}')
            params.append(user.name)
            idx += 1
        if user.email is not None:
            sets.append(f'"email" = ${idx}')
            params.append(user.email)
            idx += 1
        if user.timesheetStatus is not None:
            sets.append(f'"timesheetStatus" = ${idx}')
            params.append(user.timesheetStatus)
            idx += 1
        if user.githubUsername is not None:
            sets.append(f'"githubUsername" = ${idx}')
            params.append(user.githubUsername)
            idx += 1

        params.append(user_id)
        query = f'UPDATE "User" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_user(row)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "User" WHERE "id" = $1', user_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="User not found")
