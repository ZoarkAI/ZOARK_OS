# ZOARK OS Setup Script for Windows (PowerShell)

Write-Host "🚀 ZOARK OS Setup Script" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

$hasNode = Get-Command node -ErrorAction SilentlyContinue
$hasPython = Get-Command python -ErrorAction SilentlyContinue
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue
$hasPnpm = Get-Command pnpm -ErrorAction SilentlyContinue

if (-not $hasNode) {
    Write-Host "❌ Node.js is required but not installed. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

if (-not $hasPython) {
    Write-Host "❌ Python is required but not installed. Please install from https://www.python.org/" -ForegroundColor Red
    exit 1
}

if (-not $hasDocker) {
    Write-Host "⚠️  Docker is not installed. You'll need to install PostgreSQL and Redis manually." -ForegroundColor Yellow
}

if (-not $hasPnpm) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Install frontend dependencies
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
pnpm install

# Install backend dependencies
Write-Host "`n🐍 Setting up Python environment..." -ForegroundColor Yellow
Set-Location apps\agents
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Set-Location ..\..

# Copy environment file
Write-Host "`n⚙️  Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file. Please configure your API keys." -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Start Docker services
Write-Host "`n🐳 Starting Docker services..." -ForegroundColor Yellow
if ($hasDocker) {
    docker compose up -d
    Write-Host "✅ Docker services started" -ForegroundColor Green

    # Wait for PostgreSQL
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} else {
    Write-Host "⚠️  Docker not available. Make sure PostgreSQL and Redis are running manually." -ForegroundColor Yellow
}

# Run database migrations
Write-Host "`n🗄️  Running database migrations..." -ForegroundColor Yellow
Set-Location packages\database
npx prisma migrate dev --name init
npx prisma generate
Set-Location ..\..

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Configure your .env file with API keys"
Write-Host "2. Start the development servers:"
Write-Host "   - Frontend: cd apps\web && pnpm dev"
Write-Host "   - Backend: cd apps\agents && .\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload"
Write-Host "`nHappy coding! 🎉" -ForegroundColor Cyan
