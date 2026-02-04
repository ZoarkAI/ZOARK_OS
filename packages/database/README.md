# ZOARK OS Database

## Setup Instructions

### Prerequisites

1. **Install Docker Desktop** (for PostgreSQL and Redis):
   - Download from https://www.docker.com/products/docker-desktop
   - Or install PostgreSQL and Redis manually

### Start Services

```bash
# From project root
docker compose up -d

# Check services are running
docker compose ps
```

### Run Migrations

```bash
# From project root
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
```

### Apply PostgreSQL Triggers

After running migrations, apply the trigger functions:

```bash
# Connect to PostgreSQL
docker exec -it zoark-postgres psql -U zoark -d zoark

# Or if using local PostgreSQL
psql -U zoark -d zoark

# Then run
\i ../../apps/agents/app/db/triggers.sql
```

### Verify Setup

```bash
# Open Prisma Studio to view/edit data
npx prisma studio
```

## Schema Overview

- **Project**: Core project entity with health score tracking
- **Task**: Tasks with status (DONE/ACTIVE/BACKLOG/GAP)
- **User**: Personnel with timesheet status
- **Invoice**: Invoices with approval workflows
- **ApprovalStep**: Multi-stage approval pipeline
- **AgentLog**: Audit trail for all agent actions

## Critical Indexes

- `Task (status, lastUpdated)` - For finding stuck tasks
- `ApprovalStep (status, deadline)` - For nudge queries
- `AgentLog (timestamp)` - For activity feed

## Database Triggers

- **notify_task_update**: Fires when task is stuck (ACTIVE >48h)
- **notify_approval_overdue**: Fires when approval is past deadline
- **notify_invoice_created**: Fires when invoice with PDF is created

All triggers publish to PostgreSQL NOTIFY channel `agent_events` which is consumed by Redis worker.
