@echo off
echo ========================================
echo ZOARK OS - Installing Dependencies
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0"

echo Step 1: Installing pnpm globally...
call npm install -g pnpm
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install pnpm
    pause
    exit /b 1
)
echo ✓ pnpm installed
echo.

echo Step 2: Installing workspace dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Workspace dependencies installed
echo.

echo Step 3: Installing web app dependencies...
cd apps\web
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install web dependencies
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo ✓ Web app dependencies installed
echo.

echo Step 4: Installing database package dependencies...
cd packages\database
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install database dependencies
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo ✓ Database package dependencies installed
echo.

echo Step 5: Installing types package dependencies...
cd packages\types
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install types dependencies
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo ✓ Types package dependencies installed
echo.

echo ========================================
echo ✓ All Node.js dependencies installed!
echo ========================================
echo.
echo Next steps:
echo 1. Install Docker Desktop if not already installed
echo 2. Run: docker compose up -d
echo 3. Run: start-services.bat
echo.
pause
