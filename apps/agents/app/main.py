import asyncio
import json
import time
import logging
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.middleware.security import SecurityHeadersMiddleware, RequestLoggingMiddleware, InputSanitizationMiddleware

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Sentry if configured
if settings.sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
        )
        logger.info("Sentry initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}")


# ── Rate-limit middleware ─────────────────────────────────────────────────────
# Sliding-window, per-IP.  For multi-worker deployments swap for Redis-backed.

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.rpm = requests_per_minute
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        ip = request.client.host if request.client else "0.0.0.0"
        now = time.time()
        cutoff = now - 60.0
        hits = [t for t in self._hits[ip] if t > cutoff]
        if len(hits) >= self.rpm:
            return Response(
                content=json.dumps({"detail": "Rate limit exceeded. Try again later."}),
                status_code=429,
                media_type="application/json",
            )
        hits.append(now)
        self._hits[ip] = hits
        return await call_next(request)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.workers.scheduler import start_scheduler
    from app.workers.pg_listener import start_pg_listener
    from app.workers.redis_worker import start_worker
    from app.workers.agent_orchestrator import start_orchestrator, stop_orchestrator

    start_scheduler()
    pg_task = asyncio.create_task(start_pg_listener())
    worker_task = asyncio.create_task(start_worker())
    await start_orchestrator()

    yield  # ← app serves requests here

    # Graceful shutdown
    pg_task.cancel()
    worker_task.cancel()
    await stop_orchestrator()
    await asyncio.gather(pg_task, worker_task, return_exceptions=True)
    from app.db import close_pool
    await close_pool()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    description="Agentic workflow engine API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — env-driven; comma-separate multiple origins if needed
_origins = [o.strip() for o in settings.cors_origin.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting — 120 requests / minute per IP
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_requests_per_minute)

# Security middleware (order matters - first added = last executed)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(InputSanitizationMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.routers import (  # noqa: E402
    tasks, projects, users, invoices, intelligence, broadcast,
    team, email_accounts, pipelines, rag_documents, agent_schedule, agent_activity, task_details,
    auth, oauth, api_keys, custom_agents
)

app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(users.router)
app.include_router(invoices.router)
app.include_router(intelligence.router)
app.include_router(broadcast.router)
app.include_router(team.router)
app.include_router(email_accounts.router)
app.include_router(pipelines.router)
app.include_router(rag_documents.router)
app.include_router(agent_schedule.router)
app.include_router(agent_activity.router)
app.include_router(task_details.router)
app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(api_keys.router)
app.include_router(custom_agents.router)


# ── Root & health ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "ZOARK OS API", "version": "0.1.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    checks: dict[str, str] = {}

    # Database ping
    try:
        from app.db import get_conn
        async with get_conn() as conn:
            await conn.fetchval("SELECT 1")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    # Redis ping
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    healthy = all(v == "ok" for v in checks.values())
    return JSONResponse(
        content={"status": "healthy" if healthy else "degraded", **checks},
        status_code=200 if healthy else 503,
    )
