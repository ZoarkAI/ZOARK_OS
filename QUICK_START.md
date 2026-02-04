# ZOARK OS - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Prerequisites

**Required:**
- Docker Desktop (for databases)
- Node.js >= 18
- Python >= 3.11
- pnpm >= 8

**Quick Install:**
```bash
# Install pnpm
npm install -g pnpm

# Verify installations
docker --version
node --version
python --version
pnpm --version
```

### 2. Clone & Setup

```bash
# Navigate to project
cd zoark-os

# Install all dependencies
pnpm install

# Copy environment file
cp .env.example .env
```

### 3. Start Services

```bash
# Start PostgreSQL & Redis
docker compose up -d

# Verify services are running
docker compose ps
```

Expected output:
```
NAME              STATUS          PORTS
zoark-postgres    Up 10 seconds   0.0.0.0:5432->5432/tcp
zoark-redis       Up 10 seconds   0.0.0.0:6379->6379/tcp
```

### 4. Setup Database

```bash
# Run migrations
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

### 5. Setup Python Backend

```bash
cd apps/agents

# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

cd ../..
```

### 6. Start Development Servers

Open **3 separate terminals**:

**Terminal 1 - Frontend:**
```bash
cd apps/web
pnpm dev
```
✅ Frontend running at http://localhost:3000

**Terminal 2 - Backend API:**
```bash
cd apps/agents
# Activate venv first if not already active
uvicorn app.main:app --reload
```
✅ API running at http://localhost:8000
✅ API Docs at http://localhost:8000/docs

**Terminal 3 - Agent Worker (Optional):**
```bash
cd apps/agents
# Activate venv first if not already active
python -m app.workers.redis_worker
```

### 7. Open Your Browser

Navigate to:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Prisma Studio**: `npx prisma studio` (in packages/database)

## 🎯 What You'll See

### Homepage (localhost:3000)
- Welcome screen with link to dashboard
- Link to API documentation

### Dashboard
Navigate through 4 main sections:
1. **The Pulse** - Task board (DONE/ACTIVE/BACKLOG/GAP columns)
2. **Proactive Directory** - Personnel management with timesheet tracking
3. **Flow Engine** - Visual approval pipelines
4. **Intelligence Hub** - RAG search and agent activity feed

## 📝 Test the Agents

### Test Task Monitor Agent
```python
# In apps/agents directory with venv activated
python -c "
import asyncio
from app.agents.task_monitor import TaskMonitorAgent

async def test():
    agent = TaskMonitorAgent()
    result = await agent.execute()
    print('Task Monitor Result:', result)

asyncio.run(test())
"
```

### Test Timesheet Drafter Agent
```python
python -c "
import asyncio
from app.agents.timesheet_drafter import TimesheetDrafterAgent

async def test():
    agent = TimesheetDrafterAgent()
    result = await agent.execute()
    print('Timesheet Drafter Result:', result)

asyncio.run(test())
"
```

## 🛠️ Common Commands

```bash
# Stop all services
docker compose down

# Restart services
docker compose restart

# View logs
docker compose logs -f

# Reset database (WARNING: deletes all data)
cd packages/database
npx prisma migrate reset

# Open Prisma Studio (database GUI)
cd packages/database
npx prisma studio
```

## 🐛 Troubleshooting

### "docker: command not found"
Install Docker Desktop from https://www.docker.com/products/docker-desktop

### "Port 3000 already in use"
```bash
# Find and kill process
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

### "Module not found" errors in Python
```bash
cd apps/agents
pip install -r requirements.txt
```

### Prisma Client not generated
```bash
cd packages/database
npx prisma generate
```

## 🎓 Next Steps

1. **Add Sample Data**: Use Prisma Studio to create projects, tasks, users
2. **Explore API**: Check out http://localhost:8000/docs
3. **Customize Agents**: Modify agent behavior in `apps/agents/app/agents/`
4. **Build Features**: Refer to IMPLEMENTATION_STATUS.md for remaining tasks

## 📚 Additional Resources

- **Full Implementation Plan**: See the original plan in `~/.claude/plans/`
- **API Documentation**: http://localhost:8000/docs
- **Database Schema**: `packages/database/prisma/schema.prisma`
- **Agent Architecture**: See IMPLEMENTATION_STATUS.md

## ⚡ Pro Tips

1. **Use Prisma Studio** for quick database inspection:
   ```bash
   cd packages/database && npx prisma studio
   ```

2. **Watch Agent Logs** to see autonomous behaviors:
   ```bash
   cd apps/agents && python -m app.workers.redis_worker
   ```

3. **Auto-reload** is enabled for both frontend and backend
   - Next.js: Hot Module Replacement
   - FastAPI: `--reload` flag

4. **Type Safety**: Run `pnpm generate-api-types` after changing FastAPI models

Happy Building! 🚀
