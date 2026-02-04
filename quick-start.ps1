# ZOARK OS - Quick Start Script
# Run this in PowerShell to set up and start the application

Write-Host "`n🚀 ZOARK OS Quick Start" -ForegroundColor Cyan
Write-Host "======================`n" -ForegroundColor Cyan

# Step 1: Install pnpm if needed
Write-Host "Step 1: Checking pnpm..." -ForegroundColor Yellow
$pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmExists) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "✅ pnpm installed`n" -ForegroundColor Green
} else {
    Write-Host "✅ pnpm already installed`n" -ForegroundColor Green
}

# Step 2: Install Node dependencies
Write-Host "Step 2: Installing Node.js dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes...`n" -ForegroundColor Gray
pnpm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node dependencies installed`n" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install Node dependencies" -ForegroundColor Red
    Write-Host "Try running manually: pnpm install`n" -ForegroundColor Yellow
    exit 1
}

# Step 3: Check Docker
Write-Host "Step 3: Checking Docker..." -ForegroundColor Yellow
$dockerExists = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerExists) {
    Write-Host "❌ Docker not found!" -ForegroundColor Red
    Write-Host "`nPlease install Docker Desktop from:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop`n" -ForegroundColor Cyan
    Write-Host "After installing Docker, run this script again.`n" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is installed but not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and run this script again.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker is running`n" -ForegroundColor Green

# Step 4: Start Docker services
Write-Host "Step 4: Starting Docker services..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker services started`n" -ForegroundColor Green
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
} else {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    exit 1
}

# Step 5: Generate Prisma client and run migrations
Write-Host "Step 5: Setting up database..." -ForegroundColor Yellow
Push-Location packages\database

Write-Host "Generating Prisma client..." -ForegroundColor Gray
npx prisma generate

Write-Host "Running database migrations..." -ForegroundColor Gray
npx prisma migrate dev --name init

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database setup complete`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database migration had issues, but continuing..." -ForegroundColor Yellow
}

Pop-Location

# Step 6: Setup Python environment
Write-Host "Step 6: Checking Python environment..." -ForegroundColor Yellow
if (-not (Test-Path "apps\agents\venv\Scripts\Activate.ps1")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Gray
    Push-Location apps\agents
    python -m venv venv
    Pop-Location
}

Write-Host "✅ Python environment ready`n" -ForegroundColor Green
Write-Host "⚠️  Note: Python dependencies need manual installation due to compatibility" -ForegroundColor Yellow
Write-Host "   Run: cd apps\agents; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt`n" -ForegroundColor Gray

# Done!
Write-Host "======================`n" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!`n" -ForegroundColor Green

Write-Host "Next steps to start the application:`n" -ForegroundColor Cyan

Write-Host "1. Start the Frontend (Terminal 1):" -ForegroundColor White
Write-Host "   cd apps\web" -ForegroundColor Gray
Write-Host "   pnpm dev`n" -ForegroundColor Gray

Write-Host "2. Start the Backend (Terminal 2):" -ForegroundColor White
Write-Host "   cd apps\agents" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   pip install -r requirements.txt  # First time only" -ForegroundColor Gray
Write-Host "   uvicorn app.main:app --reload`n" -ForegroundColor Gray

Write-Host "3. Open your browser:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:8000/docs`n" -ForegroundColor Cyan

Write-Host "For detailed testing guide, see: IMPLEMENTATION_COMPLETE.md`n" -ForegroundColor Yellow

# Offer to start frontend now
$startNow = Read-Host "Would you like to start the frontend now? (y/n)"
if ($startNow -eq "y" -or $startNow -eq "Y") {
    Write-Host "`nStarting frontend..." -ForegroundColor Green
    Push-Location apps\web
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm dev"
    Pop-Location
    Write-Host "✅ Frontend starting in new window!`n" -ForegroundColor Green
    Write-Host "Open http://localhost:3000 in your browser`n" -ForegroundColor Cyan
}

Write-Host "Happy coding! 🎉`n" -ForegroundColor Cyan
