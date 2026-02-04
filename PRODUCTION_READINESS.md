# ZOARK OS — Production Readiness

Last updated: 2026-02-03

---

## Status: Production Ready

All blockers have been resolved. The checklist below documents what is in place and what you need to configure when you deploy.

---

## What is in place

| Area | Details |
|---|---|
| **Database** | Prisma schema with indexes on hot query paths. Triggers fire `pg_notify` for agent events. |
| **CRUD APIs** | Projects, Tasks, Users, Invoices, ApprovalSteps — full CRUD, parameterised SQL, proper 404s. |
| **CORS** | Env-driven via `CORS_ORIGIN`. Supports comma-separated list of origins. Defaults to `localhost:3000` for dev. |
| **Rate limiting** | 120 requests / minute per IP. Sliding-window middleware, returns 429 with JSON body. |
| **Health check** | `GET /health` pings both PostgreSQL and Redis. Returns 503 if either is down. |
| **Lifespan management** | Replaced deprecated `on_event("startup")` with FastAPI `lifespan` context manager. Graceful shutdown cancels pg_listener and redis_worker tasks, closes DB pool. |
| **Reconnect logic** | Both `pg_listener` and `redis_worker` reconnect automatically on connection drop with exponential back-off (5 s → 10 s → … → 60 s cap). |
| **Timezone handling** | All `datetime.utcnow()` calls replaced with `datetime.now(timezone.utc)`. DB params stripped of tzinfo to match PostgreSQL `TIMESTAMP` columns. |
| **Multi-provider email** | SMTP (Gmail / Outlook / Yahoo / Proton / Zoho / iCloud / custom), SendGrid, Resend. Graceful fallback to draft-log when unconfigured. |
| **Task Monitor Agent** | Detects stuck tasks (>48 h), sends HTML alert email to `ALERT_EMAIL`. |
| **Approval Nudger Agent** | Escalating urgency (low → medium → high → critical), 24 h cooldown, sends HTML email to assignee. |
| **Timesheet Drafter Agent** | Per-user context (recent tasks, GitHub activity), sends HTML reminder. Preview + send endpoints available. |
| **Email Parser Agent** | Downloads + parses real PDFs (httpx + PyPDF2). Falls back to mock on failure. Indexes content in vector DB. |
| **RAG / Embeddings** | Uses real OpenAI when `OPENAI_API_KEY` is set; otherwise mock vectors. |
| **Pinecone client** | Uses real Pinecone when `PINECONE_API_KEY` is set; otherwise in-memory store with cosine-similarity ranking. |
| **SSE agent feed** | `/api/agent-feed` subscribes to Redis `agent_logs`. Browser EventSource auto-reconnects. |
| **Frontend** | All API URLs read `NEXT_PUBLIC_API_URL`. Directory modal fetches live preview and sends via backend. HTML output sanitised (script tags, event handlers, javascript: URIs stripped). AbortController on fetch to prevent state updates on unmount. |
| **CI pipeline** | Frontend type-check + build, backend schema push + pytest, deploy gates on main. |
| **Test suite** | 23 integration tests — all passing, zero warnings. |
| **Environment docs** | `.env.example` with step-by-step instructions for every provider. |

---

## What you need to do when deploying

These are one-time configuration steps. Each is explained in plain English below.

### 1. Set up your `.env` file

Copy `.env.example` to `.env` on your server and fill in the real values:

```bash
cp .env.example .env
# Then edit .env with your actual credentials
```

### 2. CORS_ORIGIN — "tell the backend where your website lives"

When your Next.js app is hosted on a different URL than the FastAPI backend (which it will be — e.g. Vercel vs Railway), the backend needs to know that URL is allowed to talk to it. This is a browser security feature called CORS.

```
CORS_ORIGIN=https://your-nextjs-app.vercel.app
```

If you have multiple environments (staging + production), comma-separate them:
```
CORS_ORIGIN=https://staging.vercel.app,https://production.vercel.app
```

### 3. NEXT_PUBLIC_API_URL — "tell the frontend where the API lives"

The opposite direction: your Next.js app needs to know the URL of the FastAPI server.

```
NEXT_PUBLIC_API_URL=https://your-fastapi-app.railway.app
```

### 4. Email — pick one provider

**Cheapest path (free):** Gmail with an app password. See the setup steps in `.env.example` under the Gmail section. You get unlimited sends.

**Zero-config path:** Resend. Sign up at resend.com, get a free API key (100 emails/month), paste it in:
```
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 5. Set DEBUG=false

```
DEBUG=false
```

This stops the API from showing internal stack traces to anyone who hits an error endpoint.

### 6. Secrets

Never commit your `.env` file to Git. It's already in `.gitignore`. Use your hosting platform's secret management:
- **Railway:** Dashboard → Service → Variables
- **Vercel:** Dashboard → Settings → Environment Variables
- **Render:** Dashboard → Environment

---

## Deployment steps (end to end)

1. Deploy PostgreSQL + Redis to managed services (Railway, Supabase, Upstash).
2. Deploy FastAPI to Railway or Render. Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
3. Run `npx prisma db push` against the production database once (sets up tables + indexes + triggers).
4. Deploy Next.js to Vercel. Set `NEXT_PUBLIC_API_URL` to the FastAPI URL.
5. Set `CORS_ORIGIN` on the FastAPI service to the Vercel URL.
6. Smoke test: open the app → create a project → add a task → confirm it appears on The Pulse.

---

## Local development quick-start

```bash
# 1. Start Postgres + Redis
docker-compose up -d

# 2. Push schema
cd packages/database && npx prisma db push

# 3. Backend
cd apps/agents
cp ../../.env.example .env   # edit as needed
source venv/Scripts/activate  # Windows; Linux: source venv/bin/activate
uvicorn app.main:app --reload

# 4. Frontend (new terminal)
cd apps/web
pnpm dev
```

Open http://localhost:3000.

---

## What to watch after go-live

- **`GET /health`** — set up a monitoring alert (UptimeRobot, etc.) to ping this every 60 seconds. You'll get notified if DB or Redis goes down.
- **Rate limit hits** — if legitimate users start getting 429 errors, increase the limit in `main.py` (`RateLimitMiddleware`) or switch to a Redis-backed limiter.
- **Email delivery** — check your provider's dashboard for bounce rates in the first 24 hours.
- **Pinecone / OpenAI** — if you haven't set the API keys yet, RAG search returns mock data. Set the keys when you're ready for real semantic search.
