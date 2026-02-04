from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


class PipelineStageCreate(BaseModel):
    name: str
    order: int
    deliverables: Optional[List[str]] = None
    assigneeEmail: str
    nudgeFrequency: Optional[str] = None


class PipelineTemplateCreate(BaseModel):
    projectId: str
    name: str
    description: Optional[str] = None
    stages: Optional[List[PipelineStageCreate]] = None


class PipelineTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class PipelineStageResponse(BaseModel):
    id: str
    templateId: str
    name: str
    order: int
    deliverables: List[str]
    assigneeEmail: str
    nudgeFrequency: Optional[str]
    createdAt: datetime
    updatedAt: datetime


class PipelineTemplateResponse(BaseModel):
    id: str
    projectId: str
    name: str
    description: Optional[str]
    createdAt: datetime
    updatedAt: datetime
    stages: Optional[List[PipelineStageResponse]] = None


def row_to_pipeline_template(row) -> dict:
    return {
        "id": row["id"],
        "projectId": row["projectId"],
        "name": row["name"],
        "description": row["description"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


def row_to_pipeline_stage(row) -> dict:
    return {
        "id": row["id"],
        "templateId": row["templateId"],
        "name": row["name"],
        "order": row["order"],
        "deliverables": row["deliverables"] or [],
        "assigneeEmail": row["assigneeEmail"],
        "nudgeFrequency": row["nudgeFrequency"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


@router.get("/", response_model=List[PipelineTemplateResponse])
async def list_pipeline_templates(project_id: Optional[str] = None):
    async with get_conn() as conn:
        if project_id:
            rows = await conn.fetch(
                'SELECT * FROM "PipelineTemplate" WHERE "projectId" = $1 ORDER BY "createdAt" DESC',
                project_id
            )
        else:
            rows = await conn.fetch('SELECT * FROM "PipelineTemplate" ORDER BY "createdAt" DESC')
    return [row_to_pipeline_template(r) for r in rows]


@router.get("/{template_id}", response_model=PipelineTemplateResponse)
async def get_pipeline_template(template_id: str):
    async with get_conn() as conn:
        template = await conn.fetchrow('SELECT * FROM "PipelineTemplate" WHERE "id" = $1', template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Pipeline template not found")
        
        stages = await conn.fetch('SELECT * FROM "PipelineStage" WHERE "templateId" = $1 ORDER BY "order"', template_id)
    
    result = row_to_pipeline_template(template)
    result["stages"] = [row_to_pipeline_stage(s) for s in stages]
    return result


@router.post("/", response_model=PipelineTemplateResponse, status_code=201)
async def create_pipeline_template(template: PipelineTemplateCreate):
    async with get_conn() as conn:
        # Verify project exists
        project = await conn.fetchrow('SELECT "id" FROM "Project" WHERE "id" = $1', template.projectId)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        template_id = str(uuid4())
        template_row = await conn.fetchrow(
            '''INSERT INTO "PipelineTemplate" ("id", "projectId", "name", "description", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, NOW(), NOW())
               RETURNING *''',
            template_id, template.projectId, template.name, template.description,
        )
        
        # Create stages if provided
        stages = []
        if template.stages:
            for stage in template.stages:
                stage_row = await conn.fetchrow(
                    '''INSERT INTO "PipelineStage" ("id", "templateId", "name", "order", "deliverables", "assigneeEmail", "nudgeFrequency", "createdAt", "updatedAt")
                       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                       RETURNING *''',
                    str(uuid4()), template_id, stage.name, stage.order, stage.deliverables or [], stage.assigneeEmail, stage.nudgeFrequency,
                )
                stages.append(row_to_pipeline_stage(stage_row))
    
    result = row_to_pipeline_template(template_row)
    result["stages"] = stages
    return result


@router.patch("/{template_id}", response_model=PipelineTemplateResponse)
async def update_pipeline_template(template_id: str, template: PipelineTemplateUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "PipelineTemplate" WHERE "id" = $1', template_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Pipeline template not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        
        if template.name is not None:
            sets.append(f'"name" = ${idx}')
            params.append(template.name)
            idx += 1
        if template.description is not None:
            sets.append(f'"description" = ${idx}')
            params.append(template.description)
            idx += 1

        params.append(template_id)
        query = f'UPDATE "PipelineTemplate" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
        
        # Get stages
        stages = await conn.fetch('SELECT * FROM "PipelineStage" WHERE "templateId" = $1 ORDER BY "order"', template_id)
    
    result = row_to_pipeline_template(row)
    result["stages"] = [row_to_pipeline_stage(s) for s in stages]
    return result


@router.delete("/{template_id}", status_code=204)
async def delete_pipeline_template(template_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "PipelineTemplate" WHERE "id" = $1', template_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Pipeline template not found")


@router.post("/{template_id}/duplicate", response_model=PipelineTemplateResponse, status_code=201)
async def duplicate_pipeline_template(template_id: str):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "PipelineTemplate" WHERE "id" = $1', template_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Pipeline template not found")
        
        # Create new template
        new_id = str(uuid4())
        new_template = await conn.fetchrow(
            '''INSERT INTO "PipelineTemplate" ("id", "projectId", "name", "description", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, NOW(), NOW())
               RETURNING *''',
            new_id, existing["projectId"], f"{existing['name']} (Copy)", existing["description"],
        )
        
        # Copy stages
        stages_rows = await conn.fetch('SELECT * FROM "PipelineStage" WHERE "templateId" = $1 ORDER BY "order"', template_id)
        stages = []
        for stage in stages_rows:
            new_stage = await conn.fetchrow(
                '''INSERT INTO "PipelineStage" ("id", "templateId", "name", "order", "deliverables", "assigneeEmail", "nudgeFrequency", "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                   RETURNING *''',
                str(uuid4()), new_id, stage["name"], stage["order"], stage["deliverables"], stage["assigneeEmail"], stage["nudgeFrequency"],
            )
            stages.append(row_to_pipeline_stage(new_stage))
    
    result = row_to_pipeline_template(new_template)
    result["stages"] = stages
    return result
