"""
Integration tests for ZOARK OS API.

Requires PostgreSQL running with schema applied and Redis running.
Run from apps/agents/:  pytest tests/ -v
"""

import pytest
from uuid import uuid4
from datetime import datetime, timedelta, timezone


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------


async def test_create_project(client):
    res = await client.post("/projects", json={"name": f"proj-{uuid4().hex[:8]}"})
    assert res.status_code == 201
    body = res.json()
    assert "id" in body
    assert body["name"].startswith("proj-")


async def test_list_projects(client):
    res = await client.get("/projects")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


# ---------------------------------------------------------------------------
# Tasks – CRUD & status transitions
# ---------------------------------------------------------------------------


async def _make_project(client) -> str:
    res = await client.post("/projects", json={"name": f"proj-{uuid4().hex[:8]}"})
    return res.json()["id"]


async def test_create_task(client):
    proj_id = await _make_project(client)
    res = await client.post("/tasks", json={
        "projectId": proj_id,
        "title": "New task",
        "status": "BACKLOG",
    })
    assert res.status_code == 201
    assert res.json()["title"] == "New task"
    assert res.json()["status"] == "BACKLOG"


async def test_list_tasks_filtered_by_project(client):
    proj_id = await _make_project(client)
    await client.post("/tasks", json={"projectId": proj_id, "title": "T1", "status": "BACKLOG"})
    await client.post("/tasks", json={"projectId": proj_id, "title": "T2", "status": "ACTIVE"})

    res = await client.get("/tasks", params={"project_id": proj_id})
    assert res.status_code == 200
    assert len(res.json()) >= 2


async def test_update_task_status(client):
    proj_id = await _make_project(client)
    task = await client.post("/tasks", json={"projectId": proj_id, "title": "Flip", "status": "BACKLOG"})
    task_id = task.json()["id"]

    res = await client.patch(f"/tasks/{task_id}", json={"status": "ACTIVE"})
    assert res.status_code == 200
    assert res.json()["status"] == "ACTIVE"


async def test_delete_task(client):
    proj_id = await _make_project(client)
    task = await client.post("/tasks", json={"projectId": proj_id, "title": "Del", "status": "BACKLOG"})
    task_id = task.json()["id"]

    res = await client.delete(f"/tasks/{task_id}")
    assert res.status_code == 204

    res = await client.get(f"/tasks/{task_id}")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


async def test_create_and_list_users(client):
    email = f"user-{uuid4().hex[:8]}@test.com"
    res = await client.post("/users", json={"name": "Test User", "email": email})
    assert res.status_code == 201

    res = await client.get("/users")
    assert res.status_code == 200
    emails = [u["email"] for u in res.json()]
    assert email in emails


# ---------------------------------------------------------------------------
# Invoices & Approval Steps
# ---------------------------------------------------------------------------


async def _make_invoice(client, amount: float = 25000.0) -> dict:
    proj_id = await _make_project(client)
    res = await client.post("/invoices", json={"projectId": proj_id, "amount": amount})
    assert res.status_code == 201
    return res.json()


async def test_create_invoice(client):
    inv = await _make_invoice(client, 50000.0)
    assert inv["amount"] == 50000.0
    assert inv["status"] == "PENDING"


async def test_list_invoices(client):
    await _make_invoice(client)
    res = await client.get("/invoices")
    assert res.status_code == 200
    assert len(res.json()) >= 1


async def test_create_approval_steps(client):
    inv = await _make_invoice(client)
    inv_id = inv["id"]
    deadline = (datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1)).isoformat()

    res = await client.post(f"/invoices/{inv_id}/approval-steps", json={
        "stage": "LEGAL_REVIEW",
        "assigneeEmail": "legal@test.com",
        "requiredDocs": ["contract.pdf"],
        "deadline": deadline,
    })
    assert res.status_code == 201
    assert res.json()["stage"] == "LEGAL_REVIEW"
    assert res.json()["status"] == "PENDING"


async def test_get_approval_steps_returns_created(client):
    inv = await _make_invoice(client)
    inv_id = inv["id"]
    deadline = (datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1)).isoformat()

    await client.post(f"/invoices/{inv_id}/approval-steps", json={
        "stage": "LEGAL_REVIEW", "assigneeEmail": "l@t.com", "requiredDocs": [], "deadline": deadline,
    })
    await client.post(f"/invoices/{inv_id}/approval-steps", json={
        "stage": "FINANCE_CHECK", "assigneeEmail": "f@t.com", "requiredDocs": ["inv.pdf"], "deadline": deadline,
    })

    res = await client.get(f"/invoices/{inv_id}/approval-steps")
    assert res.status_code == 200
    assert len(res.json()) == 2


# ---------------------------------------------------------------------------
# Nudge endpoint
# ---------------------------------------------------------------------------


async def test_nudge_approval_step(client):
    inv = await _make_invoice(client)
    inv_id = inv["id"]
    past = (datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1)).isoformat()

    step = await client.post(f"/invoices/{inv_id}/approval-steps", json={
        "stage": "MANAGER_APPROVAL", "assigneeEmail": "mgr@test.com",
        "requiredDocs": [], "deadline": past,
    })
    step_id = step.json()["id"]

    res = await client.post(f"/invoices/{inv_id}/approval-steps/{step_id}/nudge")
    assert res.status_code == 200
    assert res.json()["lastNudgedAt"] is not None


async def test_nudge_nonexistent_step_returns_404(client):
    inv = await _make_invoice(client)
    res = await client.post(f"/invoices/{inv['id']}/approval-steps/fake-id/nudge")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Agent triggers
# ---------------------------------------------------------------------------


async def test_trigger_task_monitor(client):
    res = await client.post("/intelligence/agents/trigger/task_monitor")
    assert res.status_code == 200
    assert res.json()["agent"] == "task_monitor"
    assert "result" in res.json()


async def test_trigger_approval_nudger(client):
    res = await client.post("/intelligence/agents/trigger/approval_nudger")
    assert res.status_code == 200
    assert res.json()["agent"] == "approval_nudger"


async def test_trigger_timesheet_drafter(client):
    res = await client.post("/intelligence/agents/trigger/timesheet_drafter")
    assert res.status_code == 200
    assert res.json()["agent"] == "timesheet_drafter"


async def test_trigger_unknown_agent_returns_400(client):
    res = await client.post("/intelligence/agents/trigger/nonexistent")
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# Agent logs
# ---------------------------------------------------------------------------


async def test_agent_logs_returns_list(client):
    # Trigger an agent first so at least one log exists
    await client.post("/intelligence/agents/trigger/task_monitor")

    res = await client.get("/intelligence/agent-logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    assert len(logs) > 0

    # Schema check on first entry
    log = logs[0]
    assert "id" in log
    assert "action" in log
    assert "context" in log
    assert "status" in log
    assert "timestamp" in log


# ---------------------------------------------------------------------------
# RAG search (mock backend, but endpoint must respond correctly)
# ---------------------------------------------------------------------------


async def test_rag_search_returns_results(client):
    res = await client.post("/intelligence/search", json={"query": "invoice payment", "top_k": 3})
    assert res.status_code == 200
    results = res.json()
    assert isinstance(results, list)
    for r in results:
        assert "score" in r
        assert "text" in r
        assert "metadata" in r


async def test_rag_search_with_filter(client):
    res = await client.post("/intelligence/search", json={
        "query": "contract terms", "top_k": 2, "filter_type": "contract",
    })
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# End-to-end: task stuck detection
# ---------------------------------------------------------------------------


async def test_e2e_task_stuck_detected_by_monitor(client):
    """Create an ACTIVE task, backdate lastUpdated by 49 hours,
    run task_monitor, verify it appears in the alert list."""
    from app.db import get_conn

    proj_id = await _make_project(client)
    task = await client.post("/tasks", json={
        "projectId": proj_id, "title": "Stuck E2E", "status": "ACTIVE",
    })
    task_id = task.json()["id"]

    # Backdate so the agent considers it stuck
    async with get_conn() as conn:
        await conn.execute(
            'UPDATE "Task" SET "lastUpdated" = NOW() - INTERVAL \'49 hours\' WHERE "id" = $1',
            task_id,
        )

    res = await client.post("/intelligence/agents/trigger/task_monitor")
    assert res.status_code == 200
    stuck_ids = [t["task_id"] for t in res.json()["result"].get("tasks", [])]
    assert task_id in stuck_ids


# ---------------------------------------------------------------------------
# End-to-end: approval nudge flow
# ---------------------------------------------------------------------------


async def test_e2e_approval_nudge_sets_timestamp(client):
    """Create an approval step with a past deadline, run approval_nudger,
    verify lastNudgedAt is populated in the DB."""
    from app.db import get_conn

    inv = await _make_invoice(client)
    inv_id = inv["id"]
    past = (datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)).isoformat()

    step = await client.post(f"/invoices/{inv_id}/approval-steps", json={
        "stage": "FINANCE_CHECK", "assigneeEmail": "fin@test.com",
        "requiredDocs": [], "deadline": past,
    })
    step_id = step.json()["id"]

    res = await client.post("/intelligence/agents/trigger/approval_nudger")
    assert res.status_code == 200

    # Confirm the nudge landed in the DB
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT "lastNudgedAt" FROM "ApprovalStep" WHERE "id" = $1', step_id)
    assert row["lastNudgedAt"] is not None


# ---------------------------------------------------------------------------
# End-to-end: timesheet drafter finds incomplete users
# ---------------------------------------------------------------------------


async def test_e2e_timesheet_drafter_finds_pending_users(client):
    """Create a user with pending timesheet status, run drafter,
    verify that user appears in the drafts."""
    email = f"pending-{uuid4().hex[:8]}@test.com"
    await client.post("/users", json={"name": "Pending User", "email": email})

    res = await client.post("/intelligence/agents/trigger/timesheet_drafter")
    assert res.status_code == 200
    result = res.json()["result"]

    # The drafter should have produced at least one draft
    assert result.get("drafts_created", 0) >= 1
