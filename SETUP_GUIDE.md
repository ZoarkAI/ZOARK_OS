# ZOARK OS - Complete Setup Guide

## Current Status

### ✅ Completed
- Project structure created
- All source code files in place
- Configuration files ready (.env, docker-compose.yml, etc.)
- Python virtual environment created

### ❌ Required Actions

## Step 1: Install Docker Desktop (Required)

1. Download Docker Desktop for Windows:
   https://www.docker.com/products/docker-desktop

2. Install Docker Desktop
   - Run the installer
   - Restart your computer when prompted
   - Launch Docker Desktop
   - Wait for Docker to start (whale icon in system tray should be active)

3. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```

## Step 2: Install Node.js Dependencies

Open PowerShell or Command Prompt (NOT Git Bash) and run:

```powershell
# Navigate to project
cd C:\Users\vamsi\ZEEL_automation

# Install pnpm if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install

# Verify installation
dir apps\web\node_modules
```

## Step 3: Install Python Dependencies

There's a known issue with Python 3.13 and pydantic-core requiring Rust compiler.

### Option A: Use Python 3.11 or 3.12 (Recommended)

1. Download Python 3.11 from https://www.python.org/downloads/
2. Install it
3. Recreate virtual environment:
   ```powershell
   cd apps\agents
   Remove-Item -Recurse -Force venv
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

### Option B: Install Rust (If staying with Python 3.13)

1. Download Rust from https://rustup.rs/
2. Install Rust
3. Restart your terminal
4. Install dependencies:
   ```powershell
   cd apps\agents
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

## Step 4: Start Docker Services

```powershell
cd C:\Users\vamsi\ZEEL_automation
docker compose up -d
```

Verify services are running:
```powershell
docker compose ps
```

Expected output:
```
NAME              STATUS          PORTS
zoark-postgres    Up              0.0.0.0:5432->5432/tcp
zoark-redis       Up              0.0.0.0:6379->6379/tcp
```

## Step 5: Run Database Migrations

```powershell
cd packages\database
npx prisma generate
npx prisma migrate dev --name init
```

## Step 6: Start Development Servers

You need 2-3 terminal windows:

### Terminal 1: Frontend (Next.js)
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\web
pnpm dev
```

Frontend will be available at: http://localhost:3000

### Terminal 2: Backend (FastAPI)
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\agents
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Backend API will be available at: http://localhost:8000
API Docs at: http://localhost:8000/docs

### Terminal 3: Workers (Optional)
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\agents
.\venv\Scripts\Activate.ps1
python -m app.workers.redis_worker
```

## Step 7: Test the Application

1. Open browser to http://localhost:3000

2. Test each dashboard section:
   - **The Pulse** - Drag-and-drop task board
   - **Proactive Directory** - Personnel management
   - **Flow Engine** - Approval pipelines
   - **Intelligence Hub** - RAG search + agent activity feed

3. Test API at http://localhost:8000/docs
   - Try GET /tasks
   - Try POST /tasks
   - Try POST /intelligence/search

## Troubleshooting

### Frontend won't start
```powershell
cd apps\web
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
pnpm install
pnpm dev
```

### Backend connection errors
Check Docker services:
```powershell
docker compose ps
docker compose logs postgres
docker compose logs redis
```

### Database connection issues
Verify DATABASE_URL in .env:
```
DATABASE_URL="postgresql://zoark:zoark@localhost:5432/zoark"
```

Test connection:
```powershell
cd packages\database
npx prisma studio
```

### Python import errors
Activate venv first:
```powershell
cd apps\agents
.\venv\Scripts\Activate.ps1
python -c "from app import main; print('Success!')"
```

## Configuration

### API Keys (.env file)

The .env file has placeholder values. For full functionality:

1. **OpenAI API Key** - For RAG embeddings and email drafting
   Get from: https://platform.openai.com/api-keys

2. **Pinecone API Key** - For vector database
   Get from: https://www.pinecone.io/

3. **SendGrid API Key** - For email sending (optional for testing)
   Get from: https://sendgrid.com/

Update .env:
```bash
OPENAI_API_KEY="sk-your-actual-key"
PINECONE_API_KEY="your-actual-key"
SENDGRID_API_KEY="SG.your-actual-key"
```

## Testing Without API Keys

The application works in "mock mode" without real API keys:
- RAG search returns mock results
- Email drafts use template-based generation
- Agents log to database but don't send actual emails

## Quick Start (Mock Mode)

If you just want to see the UI immediately:

1. Install Node dependencies (Step 2)
2. Start only the frontend:
   ```powershell
   cd apps\web
   pnpm dev
   ```
3. Open http://localhost:3000

The UI will work with mock data - no Docker or backend required!

## Next Steps After Setup

1. Read `IMPLEMENTATION_COMPLETE.md` for detailed testing guide
2. Read `DEPLOYMENT.md` for production deployment
3. Customize agents in `apps/agents/app/agents/`
4. Customize UI in `apps/web/app/(dashboard)/`

## Support

For issues:
- Check `IMPLEMENTATION_COMPLETE.md` for troubleshooting
- Check logs in Docker: `docker compose logs -f`
- Check browser console for frontend errors
- Check terminal for backend errors
