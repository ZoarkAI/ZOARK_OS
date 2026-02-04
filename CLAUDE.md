# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**ZOARK OS** — a pnpm monorepo housing an agentic workflow engine. The frontend is a Next.js 15 app; the backend is a Python FastAPI service. They communicate over HTTP; the backend URL is controlled by the `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8000`).

---

## Monorepo Layout

```
apps/agents/   – Python FastAPI backend (the "agents" service)
apps/web/      – Next.js 15 frontend
packages/database/  – Prisma schema + generated client (shared)
packages/types/     – Shared TypeScript types
```

`pnpm-workspace.yaml` declares `apps/*` and `packages/*`. The root `package.json` exposes convenience scripts that delegate into the workspaces.

---

## Commands

### Install & bootstrap
```bash
pnpm install                          # install all workspaces
cd apps/agents && pip install -r requirements.txt   # Python deps (use the venv inside apps/agents)
```

### Development servers
```bash
pnpm dev                              # starts web + (if wired) agents in parallel
pnpm run web:dev                      # Next.js dev server only  (port 3000)
pnpm run agents:dev                   # uvicorn --reload only    (port 8000)
```

### Build
```bash
pnpm build                            # builds all workspaces (runs `next build` for web)
cd apps/web && pnpm build             # frontend only
```

### Lint (frontend)
```bash
cd apps/web && pnpm lint              # runs `next lint` (ESLint with eslint-config-next)
```

### Database (Prisma)
```bash
pnpm run db:generate                  # generate Prisma client after schema changes
pnpm run db:migrate                   # run pending migrations (dev)
pnpm run db:studio                    # open Prisma Studio UI
```

### Backend tests
```bash
cd apps/agents
pytest tests/ -v                      # run all tests
pytest tests/test_foo.py -v           # single file
pytest tests/test_foo.py::test_bar -v # single test
```
`pytest.ini` sets `asyncio_mode = auto`, so `async` test functions run without extra decoration.

### Docker (infrastructure: Postgres + Redis)
```bash
docker-compose up -d                  # start Postgres 16 + Redis 7 for local dev
docker-compose down                   # stop and remove containers
```
Production stack (includes backend + frontend containers + nginx) lives in `docker-compose.production.yml`.

---

## Architecture — Key Patterns to Know

### Event pipeline: PostgreSQL → Redis → Agents

The backend has a three-stage event bus that triggers autonomous agents:

1. **PostgreSQL triggers** call `pg_notify('agent_events', payload)` (see `apps/agents/app/db/triggers.sql`).
2. **`pg_listener`** (`apps/agents/app/workers/pg_listener.py`) holds a persistent `LISTEN` connection via `asyncpg` and forwards every notification to the Redis `agent_events` pub/sub channel.
3. **`redis_worker`** (`apps/agents/app/workers/redis_worker.py`) subscribes to that channel and dispatches to the correct agent handler based on the `type` field in the JSON payload (`task_stuck`, `approval_overdue`, `invoice_created`).

Both the pg_listener and redis_worker reconnect automatically with exponential back-off (5 s → 60 s cap).

### Agent execution model

All agents extend `BaseAgent` (`apps/agents/app/agents/base_agent.py`), which:
- Calls the subclass's `run()` method.
- On success/failure, writes an `AgentLog` row to Postgres *and* publishes the log entry to the Redis `agent_logs` channel (consumed by the frontend's SSE endpoint for real-time updates).

Agents are triggered in two ways:
- **Scheduled** — via APScheduler cron jobs defined in `apps/agents/app/workers/scheduler.py` (daily task health check at 09:00, hourly approval nudge, Friday 16:00 timesheet reminder).
- **Event-driven** — via the pg_listener → redis_worker pipeline described above, *and* via a polling loop inside `AgentOrchestrator` (`apps/agents/app/workers/agent_orchestrator.py`) that checks every 10–30 seconds for stuck tasks, overdue approvals, and due broadcasts.

### FastAPI startup & shutdown

`apps/agents/app/main.py` uses a Lifespan context manager. On startup it launches the scheduler, pg_listener, redis_worker, and agent_orchestrator as concurrent asyncio tasks. On shutdown it cancels the tasks and closes the asyncpg connection pool.

### Database access (backend)

The backend does **not** use Prisma at runtime. It uses raw `asyncpg` queries through a simple connection-pool helper in `apps/agents/app/db.py` (`get_conn()` context manager). Prisma is used only for schema definition and migrations; the generated client lives in `packages/database` and is consumed by the Next.js frontend (server-side).

All SQL in the routers and agents uses positional `$1, $2…` parameters and casts enum columns explicitly (e.g., `'ACTIVE'::\"TaskStatus\"`).

### Frontend data fetching

Pages fetch data directly from the FastAPI backend via `fetch()` against `NEXT_PUBLIC_API_URL`. Many pages include mock/fallback data so the UI remains functional when the backend is unavailable. TanStack React Query is a declared dependency but much of the current code uses plain `useEffect` + `useState`.

The frontend receives real-time agent logs via a Server-Sent Events (SSE) endpoint at `apps/web/app/api/agent-feed/`.

### Shared packages

- `packages/database` — Prisma schema (`prisma/schema.prisma`) is the single source of truth for the DB model. Run `pnpm run db:generate` after any schema change.
- `packages/types` — shared TS types imported by the frontend via the `@zoark/types` path alias.
- `next.config.js` declares `transpilePackages: ['@zoark/database', '@zoark/types']` so Next.js can handle the workspace imports.

### Configuration

Backend settings live in `apps/agents/app/config.py` (a Pydantic `BaseSettings` class, reads from `.env`). A comprehensive template is at `.env.example`. Key vars for local dev: `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`. LLM and Pinecone keys default to empty string, which puts those features into mock/fallback mode — no API calls are made.

### Middleware stack (backend, order matters)

Applied in `main.py`: CORS → RateLimitMiddleware (120 req/min sliding-window per IP, in-memory) → SecurityHeaders → InputSanitization → RequestLogging.

---

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs:
- **Frontend**: type-check (`tsc --noEmit`), lint (`next lint`), build (`next build`).
- **Backend**: spins up Postgres 16 + Redis 7 as services, runs `pytest`.
