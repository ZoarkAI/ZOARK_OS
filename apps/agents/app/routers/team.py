from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/team", tags=["team"])


class TeamMemberCreate(BaseModel):
    name: str
    email: str
    workingHours: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    workingHours: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: str
    name: str
    email: str
    workingHours: Optional[str]
    role: Optional[str]
    avatar: Optional[str]
    createdAt: datetime
    updatedAt: datetime


class TeamDocumentResponse(BaseModel):
    id: str
    teamMemberId: str
    name: str
    type: str
    url: str
    uploadedAt: datetime


def row_to_team_member(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "workingHours": row["workingHours"],
        "role": row["role"],
        "avatar": row["avatar"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


def row_to_team_document(row) -> dict:
    return {
        "id": row["id"],
        "teamMemberId": row["teamMemberId"],
        "name": row["name"],
        "type": row["type"],
        "url": row["url"],
        "uploadedAt": row["uploadedAt"],
    }


@router.get("/", response_model=List[TeamMemberResponse])
async def list_team_members():
    async with get_conn() as conn:
        rows = await conn.fetch('SELECT * FROM "TeamMember" ORDER BY "createdAt" DESC')
    return [row_to_team_member(r) for r in rows]


@router.get("/{member_id}", response_model=TeamMemberResponse)
async def get_team_member(member_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "TeamMember" WHERE "id" = $1', member_id)
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found")
    return row_to_team_member(row)


@router.post("/", response_model=TeamMemberResponse, status_code=201)
async def create_team_member(member: TeamMemberCreate):
    async with get_conn() as conn:
        # Check if email already exists
        existing = await conn.fetchrow('SELECT "id" FROM "TeamMember" WHERE "email" = $1', member.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        row = await conn.fetchrow(
            '''INSERT INTO "TeamMember" ("id", "name", "email", "workingHours", "role", "avatar", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               RETURNING *''',
            str(uuid4()), member.name, member.email, member.workingHours, member.role, member.avatar,
        )
    return row_to_team_member(row)


@router.patch("/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(member_id: str, member: TeamMemberUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "TeamMember" WHERE "id" = $1', member_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Team member not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        
        if member.name is not None:
            sets.append(f'"name" = ${idx}')
            params.append(member.name)
            idx += 1
        if member.email is not None:
            # Check if new email is already taken
            email_check = await conn.fetchrow('SELECT "id" FROM "TeamMember" WHERE "email" = $1 AND "id" != $2', member.email, member_id)
            if email_check:
                raise HTTPException(status_code=400, detail="Email already exists")
            sets.append(f'"email" = ${idx}')
            params.append(member.email)
            idx += 1
        if member.workingHours is not None:
            sets.append(f'"workingHours" = ${idx}')
            params.append(member.workingHours)
            idx += 1
        if member.role is not None:
            sets.append(f'"role" = ${idx}')
            params.append(member.role)
            idx += 1
        if member.avatar is not None:
            sets.append(f'"avatar" = ${idx}')
            params.append(member.avatar)
            idx += 1

        params.append(member_id)
        query = f'UPDATE "TeamMember" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_team_member(row)


@router.delete("/{member_id}", status_code=204)
async def delete_team_member(member_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "TeamMember" WHERE "id" = $1', member_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Team member not found")


@router.get("/{member_id}/documents", response_model=List[TeamDocumentResponse])
async def get_team_member_documents(member_id: str):
    async with get_conn() as conn:
        # Verify member exists
        member = await conn.fetchrow('SELECT "id" FROM "TeamMember" WHERE "id" = $1', member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Team member not found")
        
        rows = await conn.fetch('SELECT * FROM "TeamDocument" WHERE "teamMemberId" = $1 ORDER BY "uploadedAt" DESC', member_id)
    return [row_to_team_document(r) for r in rows]


@router.post("/{member_id}/documents", response_model=TeamDocumentResponse, status_code=201)
async def upload_team_document(member_id: str, name: str, type: str, url: str):
    async with get_conn() as conn:
        # Verify member exists
        member = await conn.fetchrow('SELECT "id" FROM "TeamMember" WHERE "id" = $1', member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Team member not found")
        
        row = await conn.fetchrow(
            '''INSERT INTO "TeamDocument" ("id", "teamMemberId", "name", "type", "url", "uploadedAt")
               VALUES ($1, $2, $3, $4, $5, NOW())
               RETURNING *''',
            str(uuid4()), member_id, name, type, url,
        )
    return row_to_team_document(row)
