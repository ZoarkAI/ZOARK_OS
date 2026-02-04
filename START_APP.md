# How to Start the ZOARK OS App

## Quick Start (Copy-Paste These Commands)

### Terminal 1 - Start Backend
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\agents
.\venv\Scripts\Activate.ps1
$env:DATABASE_URL = "postgresql://zoark:zoark@localhost:5432/zoark"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 - Start Frontend (in a NEW terminal)
```powershell
cd C:\Users\vamsi\ZEEL_automation\apps\web
npm run dev
```

---

## What You'll See

**Backend Terminal:**
- Should show "Application startup complete"
- May show some warnings (ignore them)
- Should NOT crash or show errors

**Frontend Terminal:**
- Should show "Ready in X ms"
- Should show "Local: http://localhost:3000"

---

## Open the App

Go to: **http://localhost:3000**

You should see:
1. Landing page with "ZOARK OS" title
2. Click "Enter Dashboard" or go to http://localhost:3000/pulse
3. You'll see the full dashboard with sidebar + main content

---

## If Backend Crashes

The backend is crashing because of missing dependencies or import errors. 

**Solution:** I need to see the actual error message. Please:
1. Stop the backend (Ctrl+C)
2. Start it again with the commands above
3. Copy the FULL error message when it crashes
4. Send it to me

---

## Current Issue

The backend starts but crashes when the frontend tries to call APIs like:
- `/auth/me`
- `/users`  
- `/custom-agents`
- `/workflows`

This is likely because:
1. Some Python packages are missing
2. Database connection issues
3. Import errors in the code

**I need you to start the backend manually and send me the error output so I can fix it.**
