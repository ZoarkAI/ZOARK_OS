# Phase 1: Get It Running - Step-by-Step Checklist

## Current Status

✅ Node.js v22.16.0 installed
✅ Python 3.13.3 installed
✅ Python venv exists
❌ Docker Desktop not installed
❌ Node dependencies not installed
❌ Python dependencies not installed
❌ Database not initialized

---

## Step 1: Install Docker Desktop (CRITICAL - 15 min + restart)

### Action Required:
1. Open your web browser
2. Go to: https://www.docker.com/products/docker-desktop
3. Click "Download for Windows"
4. Run the installer (Docker Desktop Installer.exe)
5. Follow the installation wizard:
   - Accept the terms
   - Use recommended settings (WSL 2)
   - Click "Install"
6. **IMPORTANT**: Restart your computer when prompted
7. After restart, launch "Docker Desktop" from Start menu
8. Wait for Docker to start (whale icon in system tray should be stable)

### Verify Docker Installation:
Open PowerShell and run:
```powershell
docker --version
docker compose version
```

Expected output:
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
```

**❌ DO NOT PROCEED until Docker is installed and running!**

---

## Step 2: Install pnpm Globally (5 min)

### Open PowerShell (NOT Git Bash) and run:
```powershell
npm install -g pnpm
```

### Verify installation:
```powershell
pnpm --version
```

Expected output: `9.x.x` or similar

---

## Step 3: Install Node.js Dependencies (10 min)

### In PowerShell:
```powershell
cd C:\Users\vamsi\ZEEL_automation
pnpm install
```

This will install dependencies for:
- Root workspace
- apps/web (Next.js frontend)
- packages/database (Prisma)
- packages/types (TypeScript types)

### Verify installation:
```powershell
dir apps\web\node_modules\.bin\next
```

Expected: File should exist

**Estimated time**: 5-10 minutes (depends on internet speed)

---

## Step 4: Fix Python Dependencies (30 min)

### Option A: Use Newer Pydantic (RECOMMENDED - Faster)

Open PowerShell:
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\agents

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install newer pydantic first (has pre-built wheels for Python 3.13)
pip install pydantic==2.10.4

# Now install all dependencies
pip install -r requirements.txt
```

**If this works, skip Option B!**

### Option B: Install Rust Compiler (If Option A fails)

1. Download Rust installer:
   - Go to: https://rustup.rs/
   - Download `rustup-init.exe`
   - Run the installer
   - Choose option 1 (default installation)
   - Wait for installation to complete

2. Restart PowerShell (IMPORTANT!)

3. Install Python dependencies:
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\agents
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Verify installation:
```powershell
# Should be activated (see "(venv)" in prompt)
python -c "import fastapi; print('✅ FastAPI installed')"
python -c "from prisma import Prisma; print('✅ Prisma installed')"
```

---

## Step 5: Start Docker Services (5 min)

### In PowerShell:
```powershell
cd C:\Users\vamsi\ZEEL_automation

# Start PostgreSQL and Redis
docker compose up -d

# Wait 5 seconds for services to start
timeout /t 5

# Verify services are running
docker compose ps
```

### Expected output:
```
NAME              STATUS          PORTS
zoark-postgres    Up X seconds    0.0.0.0:5432->5432/tcp
zoark-redis       Up X seconds    0.0.0.0:6379->6379/tcp
```

### If services aren't running:
```powershell
# Check logs
docker compose logs postgres
docker compose logs redis

# Try restarting
docker compose down
docker compose up -d
```

---

## Step 6: Initialize Database (5 min)

### In PowerShell:
```powershell
cd C:\Users\vamsi\ZEEL_automation\packages\database

# Generate Prisma client (creates TypeScript types)
npx prisma generate

# Run database migrations (creates tables)
npx prisma migrate dev --name init
```

### Expected output:
```
Applying migration `20240203000000_init`
Your database is now in sync with your schema.

✔ Generated Prisma Client (5.x.x) to ...
```

### Verify database:
```powershell
# Open Prisma Studio (visual database browser)
npx prisma studio
```

This will open http://localhost:5555 in your browser.
You should see 6 tables: Project, Task, User, Invoice, ApprovalStep, AgentLog

---

## Step 7: Start Backend Server (5 min)

### Open NEW PowerShell window (Terminal 1):
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\agents

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start FastAPI server
uvicorn app.main:app --reload
```

### Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Test backend:
Open browser and visit:
- http://localhost:8000 → Should show: `{"message":"ZOARK OS API"}`
- http://localhost:8000/docs → Should show Swagger UI
- http://localhost:8000/health → Should show: `{"status":"healthy"}`

**✅ If you see these, backend is working!**

---

## Step 8: Start Frontend Server (5 min)

### Open NEW PowerShell window (Terminal 2):
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\web

# Start Next.js development server
pnpm dev
```

### Expected output:
```
  ▲ Next.js 15.1.0
  - Local:        http://localhost:3000

  ✓ Ready in 2.3s
```

### Test frontend:
Open browser and visit:
- http://localhost:3000/pulse → Task board
- http://localhost:3000/directory → Personnel directory
- http://localhost:3000/flow → Approval pipeline
- http://localhost:3000/intelligence → RAG search + agent feed

**✅ If you see these pages, frontend is working!**

---

## Step 9: Test API Endpoints (10 min)

### Visit: http://localhost:8000/docs

Test these endpoints in the Swagger UI:

### 1. GET /tasks
- Click "Try it out"
- Click "Execute"
- Should return list of mock tasks

### 2. POST /tasks
- Click "Try it out"
- Enter JSON:
```json
{
  "projectId": "proj-123",
  "title": "Test Task from API",
  "description": "Testing task creation"
}
```
- Click "Execute"
- Should return created task with ID

### 3. GET /projects
- Should return list of mock projects

### 4. GET /users
- Should return list of mock users

### 5. POST /intelligence/search
- Enter JSON:
```json
{
  "query": "invoice payment"
}
```
- Should return mock search results

**✅ If all endpoints work, API is functional!**

---

## Step 10: Test Frontend Features (10 min)

### Test The Pulse (http://localhost:3000/pulse)
- [ ] Should see 4 columns: Done, Active, Backlog, Gap
- [ ] Should see mock tasks in columns
- [ ] Try dragging a task to different column
- [ ] Should see velocity chart at bottom
- [ ] Click "New Task" button

### Test Proactive Directory (http://localhost:3000/directory)
- [ ] Should see personnel cards
- [ ] Should see statistics at top
- [ ] Try search bar
- [ ] Click on a card
- [ ] Should see user details

### Test Flow Engine (http://localhost:3000/flow)
- [ ] Should see approval pipeline visualization
- [ ] Should see React Flow canvas
- [ ] Try selecting different invoice from dropdown
- [ ] Should see approval stages

### Test Intelligence Hub (http://localhost:3000/intelligence)
- [ ] Left side: RAG search interface
- [ ] Right side: Agent activity feed
- [ ] Try entering search query
- [ ] Should see "Live" indicator on feed

---

## Phase 1 Success Criteria

Check all that apply:

- [ ] ✅ Docker Desktop installed and running
- [ ] ✅ Docker services running (postgres + redis)
- [ ] ✅ pnpm installed globally
- [ ] ✅ Node dependencies installed (node_modules exists)
- [ ] ✅ Python dependencies installed (can import fastapi)
- [ ] ✅ Database initialized (tables created)
- [ ] ✅ Backend server starts without errors
- [ ] ✅ Frontend server starts without errors
- [ ] ✅ Can access http://localhost:8000/docs
- [ ] ✅ Can access http://localhost:3000
- [ ] ✅ All 4 dashboard pages load
- [ ] ✅ API endpoints return data
- [ ] ✅ No critical errors in console

**If all checked: Phase 1 COMPLETE! 🎉**

---

## Troubleshooting

### Docker won't start
- Check if Hyper-V is enabled (Windows Features)
- Check if WSL 2 is installed: `wsl --list --verbose`
- Restart Docker Desktop
- Restart computer

### pnpm install fails
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `Remove-Item -Recurse -Force node_modules`
- Try again: `pnpm install`

### Python dependencies fail
- Make sure venv is activated (see "(venv)" in prompt)
- Try upgrading pip: `python -m pip install --upgrade pip`
- Try Option B (install Rust)

### Database migration fails
- Check Docker is running: `docker compose ps`
- Check PostgreSQL logs: `docker compose logs postgres`
- Try restarting: `docker compose restart postgres`
- Wait 10 seconds and try migration again

### Backend won't start
- Check if venv is activated
- Check if dependencies installed: `pip list | grep fastapi`
- Check if port 8000 is free: `netstat -ano | findstr :8000`
- Check logs for specific error

### Frontend won't start
- Check if node_modules exists: `dir apps\web\node_modules`
- Check if Next.js installed: `dir apps\web\node_modules\.bin\next`
- Clear Next.js cache: `Remove-Item -Recurse -Force apps\web\.next`
- Try: `cd apps\web && pnpm install && pnpm dev`

---

## After Phase 1

Once Phase 1 is complete, you'll have:
- ✅ Fully functional local development environment
- ✅ Backend API with 15+ endpoints
- ✅ Frontend UI with 4 complete pages
- ✅ PostgreSQL database with all tables
- ✅ Redis for caching and pub/sub
- ✅ Mock data for testing

**Next**: Move to Phase 2 to add API keys and connect real services!

---

## Time Estimates

| Step | Estimated Time |
|------|----------------|
| 1. Install Docker | 15 min + restart |
| 2. Install pnpm | 5 min |
| 3. Install Node deps | 10 min |
| 4. Install Python deps | 30 min |
| 5. Start Docker | 5 min |
| 6. Initialize DB | 5 min |
| 7. Start backend | 5 min |
| 8. Start frontend | 5 min |
| 9. Test API | 10 min |
| 10. Test UI | 10 min |
| **Total** | **~2 hours** |

(Plus computer restart for Docker)

---

## Need Help?

If you get stuck:
1. Read the error message carefully
2. Check the Troubleshooting section above
3. Run: `.\check-setup.ps1` to diagnose issues
4. Check SETUP_GUIDE.md for detailed instructions
5. Provide specific error messages for help
