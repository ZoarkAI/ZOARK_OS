@echo off
echo ========================================
echo ZOARK OS - Starting Services
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0"

REM Check if Docker is running
echo Checking Docker...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✓ Docker is running
echo.

REM Start Docker services
echo Starting Docker services (PostgreSQL + Redis)...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo Failed to start Docker services
    pause
    exit /b 1
)
echo ✓ Docker services started
echo.

REM Wait for PostgreSQL to be ready
echo Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul
echo.

REM Generate Prisma client
echo Generating Prisma client...
cd packages\database
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo Failed to generate Prisma client
    cd ..\..
    pause
    exit /b 1
)
echo ✓ Prisma client generated
echo.

REM Run database migrations
echo Running database migrations...
call npx prisma migrate dev --name init
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Migrations had issues (this may be normal if already applied)
)
cd ..\..
echo ✓ Database setup complete
echo.

echo ========================================
echo ✓ Services Started!
echo ========================================
echo.
echo Docker Services:
docker compose ps
echo.
echo ========================================
echo.
echo To start the application:
echo.
echo Terminal 1 - Frontend:
echo   cd apps\web
echo   npm run dev
echo.
echo Terminal 2 - Backend:
echo   cd apps\agents
echo   venv\Scripts\activate
echo   pip install -r requirements.txt  (first time only)
echo   uvicorn app.main:app --reload
echo.
echo Then open: http://localhost:3000
echo.
pause
