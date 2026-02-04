@echo off
echo Starting ZOARK OS Application...
echo.

REM Start Docker Desktop if not running
echo Checking Docker Desktop...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting 30 seconds for Docker to start...
    timeout /t 30 /nobreak
)

REM Start PostgreSQL and Redis containers
echo Starting PostgreSQL and Redis...
docker start zoark-postgres 2>nul || docker run -d --name zoark-postgres -e POSTGRES_USER=zoark -e POSTGRES_PASSWORD=zoark -e POSTGRES_DB=zoark -p 5432:5432 postgres:15
docker start zoark-redis 2>nul || docker run -d --name zoark-redis -p 6379:6379 redis:7

echo Waiting for databases to be ready...
timeout /t 5 /nobreak

echo.
echo ========================================
echo Backend and Frontend servers need to be started manually:
echo.
echo TERMINAL 1 - Backend:
echo   cd apps\agents
echo   .\venv\Scripts\Activate.ps1
echo   $env:DATABASE_URL = "postgresql://zoark:zoark@localhost:5432/zoark"
echo   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
echo.
echo TERMINAL 2 - Frontend:
echo   cd apps\web
echo   npm run dev
echo.
echo Then open: http://localhost:3000
echo ========================================
pause
