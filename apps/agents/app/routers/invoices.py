from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/invoices", tags=["invoices"])


class InvoiceCreate(BaseModel):
    projectId: str
    amount: float
    pdfUrl: Optional[str] = None


class InvoiceUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[str] = None
    pdfUrl: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: str
    projectId: str
    amount: float
    status: str
    pdfUrl: Optional[str]
    createdAt: datetime


class ApprovalStepCreate(BaseModel):
    stage: str
    assigneeEmail: str
    requiredDocs: list[str]
    deadline: datetime


class ApprovalStepResponse(BaseModel):
    id: str
    invoiceId: str
    stage: str
    requiredDocs: list[str]
    assigneeEmail: str
    status: str
    deadline: datetime
    lastNudgedAt: Optional[datetime]


def row_to_invoice(row) -> dict:
    return {
        "id": row["id"],
        "projectId": row["projectId"],
        "amount": row["amount"],
        "status": row["status"],
        "pdfUrl": row["pdfUrl"],
        "createdAt": row["createdAt"],
    }


def row_to_step(row) -> dict:
    return {
        "id": row["id"],
        "invoiceId": row["invoiceId"],
        "stage": row["stage"],
        "requiredDocs": row["requiredDocs"],
        "assigneeEmail": row["assigneeEmail"],
        "status": row["status"],
        "deadline": row["deadline"],
        "lastNudgedAt": row["lastNudgedAt"],
    }


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(project_id: Optional[str] = Query(None)):
    async with get_conn() as conn:
        if project_id:
            rows = await conn.fetch(
                'SELECT * FROM "Invoice" WHERE "projectId" = $1 ORDER BY "createdAt" DESC',
                project_id,
            )
        else:
            rows = await conn.fetch('SELECT * FROM "Invoice" ORDER BY "createdAt" DESC')
    return [row_to_invoice(r) for r in rows]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "Invoice" WHERE "id" = $1', invoice_id)
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return row_to_invoice(row)


@router.post("/", response_model=InvoiceResponse, status_code=201)
async def create_invoice(invoice: InvoiceCreate):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO "Invoice" ("id", "projectId", "amount", "status", "pdfUrl", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, 'PENDING', $4, NOW(), NOW())
               RETURNING *''',
            str(uuid4()), invoice.projectId, invoice.amount, invoice.pdfUrl,
        )
    return row_to_invoice(row)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(invoice_id: str, invoice: InvoiceUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "Invoice" WHERE "id" = $1', invoice_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Invoice not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        if invoice.amount is not None:
            sets.append(f'"amount" = ${idx}')
            params.append(invoice.amount)
            idx += 1
        if invoice.status is not None:
            sets.append(f'"status" = ${idx}::\"InvoiceStatus\"')
            params.append(invoice.status)
            idx += 1
        if invoice.pdfUrl is not None:
            sets.append(f'"pdfUrl" = ${idx}')
            params.append(invoice.pdfUrl)
            idx += 1

        params.append(invoice_id)
        query = f'UPDATE "Invoice" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_invoice(row)


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(invoice_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "Invoice" WHERE "id" = $1', invoice_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Invoice not found")


@router.get("/{invoice_id}/approval-steps", response_model=list[ApprovalStepResponse])
async def get_approval_steps(invoice_id: str):
    async with get_conn() as conn:
        rows = await conn.fetch(
            'SELECT * FROM "ApprovalStep" WHERE "invoiceId" = $1 ORDER BY "createdAt" ASC',
            invoice_id,
        )
    if not rows:
        # Return a default pipeline skeleton so Flow Engine always has something to render
        return [
            {"id": "mock-1", "invoiceId": invoice_id, "stage": "LEGAL_REVIEW", "requiredDocs": ["contract.pdf"], "assigneeEmail": "legal@zoark.io", "status": "PENDING", "deadline": datetime.now(), "lastNudgedAt": None},
            {"id": "mock-2", "invoiceId": invoice_id, "stage": "FINANCE_CHECK", "requiredDocs": ["invoice.pdf"], "assigneeEmail": "finance@zoark.io", "status": "PENDING", "deadline": datetime.now(), "lastNudgedAt": None},
            {"id": "mock-3", "invoiceId": invoice_id, "stage": "MANAGER_APPROVAL", "requiredDocs": [], "assigneeEmail": "manager@zoark.io", "status": "PENDING", "deadline": datetime.now(), "lastNudgedAt": None},
            {"id": "mock-4", "invoiceId": invoice_id, "stage": "EXECUTIVE_APPROVAL", "requiredDocs": [], "assigneeEmail": "exec@zoark.io", "status": "PENDING", "deadline": datetime.now(), "lastNudgedAt": None},
        ]
    return [row_to_step(r) for r in rows]


@router.post("/{invoice_id}/approval-steps/{step_id}/nudge", response_model=ApprovalStepResponse)
async def nudge_approval_step(invoice_id: str, step_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            'UPDATE "ApprovalStep" SET "lastNudgedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1 AND "invoiceId" = $2 RETURNING *',
            step_id, invoice_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Approval step not found")
    return row_to_step(row)


@router.post("/{invoice_id}/approval-steps", response_model=ApprovalStepResponse, status_code=201)
async def create_approval_step(invoice_id: str, step: ApprovalStepCreate):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO "ApprovalStep" ("id", "invoiceId", "stage", "requiredDocs", "assigneeEmail", "status", "deadline", "createdAt", "updatedAt")
               VALUES ($1, $2, $3::\"ApprovalStage\", $4, $5, 'PENDING', $6, NOW(), NOW())
               RETURNING *''',
            str(uuid4()), invoice_id, step.stage, step.requiredDocs, step.assigneeEmail, step.deadline,
        )
    return row_to_step(row)


# ── Approval step lifecycle (approve / reject / edit) ────────────────────────

class ApprovalStepUpdate(BaseModel):
    stage: Optional[str] = None
    assigneeEmail: Optional[str] = None
    requiredDocs: Optional[list[str]] = None
    deadline: Optional[datetime] = None


@router.patch("/{invoice_id}/approval-steps/{step_id}", response_model=ApprovalStepResponse)
async def update_approval_step(invoice_id: str, step_id: str, update: ApprovalStepUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow(
            'SELECT * FROM "ApprovalStep" WHERE "id" = $1 AND "invoiceId" = $2',
            step_id, invoice_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Approval step not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        if update.stage is not None:
            sets.append(f'"stage" = ${idx}::\"ApprovalStage\"')
            params.append(update.stage)
            idx += 1
        if update.assigneeEmail is not None:
            sets.append(f'"assigneeEmail" = ${idx}')
            params.append(update.assigneeEmail)
            idx += 1
        if update.requiredDocs is not None:
            sets.append(f'"requiredDocs" = ${idx}')
            params.append(update.requiredDocs)
            idx += 1
        if update.deadline is not None:
            sets.append(f'"deadline" = ${idx}')
            params.append(update.deadline)
            idx += 1

        params.append(step_id)
        params.append(invoice_id)
        query = f'UPDATE "ApprovalStep" SET {", ".join(sets)} WHERE "id" = ${idx} AND "invoiceId" = ${idx+1} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_step(row)


@router.post("/{invoice_id}/approval-steps/{step_id}/approve", response_model=ApprovalStepResponse)
async def approve_step(invoice_id: str, step_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''UPDATE "ApprovalStep" SET "status" = 'APPROVED'::"ApprovalStatus", "updatedAt" = NOW()
               WHERE "id" = $1 AND "invoiceId" = $2 RETURNING *''',
            step_id, invoice_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Approval step not found")
    return row_to_step(row)


@router.post("/{invoice_id}/approval-steps/{step_id}/reject", response_model=ApprovalStepResponse)
async def reject_step(invoice_id: str, step_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''UPDATE "ApprovalStep" SET "status" = 'REJECTED'::"ApprovalStatus", "updatedAt" = NOW()
               WHERE "id" = $1 AND "invoiceId" = $2 RETURNING *''',
            step_id, invoice_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Approval step not found")
    return row_to_step(row)
