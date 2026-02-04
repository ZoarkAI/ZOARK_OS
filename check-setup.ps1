# ZOARK OS - Setup Verification Script
# Run this in PowerShell to check your setup status

Write-Host "`n=== ZOARK OS Setup Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker installed: $dockerVersion" -ForegroundColor Green

        # Check Docker is running
        $dockerInfo = docker info 2>$null
        if ($dockerInfo) {
            Write-Host "✅ Docker daemon is running" -ForegroundColor Green
        } else {
            Write-Host "❌ Docker is installed but not running. Please start Docker Desktop." -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Docker not found. Install from https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Docker not found. Install from https://www.docker.com/products/docker-desktop" -ForegroundColor Red
}

Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js not found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
}

Write-Host ""

# Check pnpm
Write-Host "Checking pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version 2>$null
    if ($pnpmVersion) {
        Write-Host "✅ pnpm installed: $pnpmVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  pnpm not found. Installing..." -ForegroundColor Yellow
        npm install -g pnpm
        Write-Host "✅ pnpm installed" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  pnpm not found. Run: npm install -g pnpm" -ForegroundColor Yellow
}

Write-Host ""

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion) {
        Write-Host "✅ Python installed: $pythonVersion" -ForegroundColor Green

        # Check if Python 3.13 (will need Rust)
        if ($pythonVersion -match "3\.13") {
            Write-Host "⚠️  Python 3.13 requires Rust compiler for some dependencies" -ForegroundColor Yellow
            Write-Host "   Consider using Python 3.11 or 3.12, or install Rust from https://rustup.rs/" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Python not found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Python not found" -ForegroundColor Red
}

Write-Host ""

# Check Node dependencies
Write-Host "Checking Node.js dependencies..." -ForegroundColor Yellow
if (Test-Path "apps\web\node_modules") {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependencies not installed. Run: pnpm install" -ForegroundColor Red
}

Write-Host ""

# Check Python virtual environment
Write-Host "Checking Python virtual environment..." -ForegroundColor Yellow
if (Test-Path "apps\agents\venv") {
    Write-Host "✅ Python venv exists" -ForegroundColor Green

    # Check if dependencies are installed
    if (Test-Path "apps\agents\venv\Lib\site-packages\fastapi") {
        Write-Host "✅ Python dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Python dependencies not installed" -ForegroundColor Red
        Write-Host "   Run: cd apps\agents; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Python venv not found" -ForegroundColor Red
    Write-Host "   Run: cd apps\agents; python -m venv venv" -ForegroundColor Yellow
}

Write-Host ""

# Check Docker services
Write-Host "Checking Docker services..." -ForegroundColor Yellow
try {
    $dockerPs = docker compose ps 2>$null
    if ($dockerPs) {
        Write-Host "Docker services status:" -ForegroundColor Green
        docker compose ps
    } else {
        Write-Host "⚠️  Docker services not running. Run: docker compose up -d" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Docker Compose not available or services not started" -ForegroundColor Yellow
}

Write-Host ""

# Check .env file
Write-Host "Checking configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green

    # Check for placeholder API keys
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "your-openai-api-key") {
        Write-Host "⚠️  API keys not configured (using placeholders)" -ForegroundColor Yellow
        Write-Host "   App will run in mock mode - configure keys for full functionality" -ForegroundColor Gray
    } else {
        Write-Host "✅ API keys appear to be configured" -ForegroundColor Green
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Install any missing prerequisites (Docker, pnpm, etc.)" -ForegroundColor Gray
Write-Host "2. Run: pnpm install (to install Node dependencies)" -ForegroundColor Gray
Write-Host "3. Run: docker compose up -d (to start PostgreSQL + Redis)" -ForegroundColor Gray
Write-Host "4. Run: cd packages\database; npx prisma migrate dev" -ForegroundColor Gray
Write-Host "5. Start frontend: cd apps\web; pnpm dev" -ForegroundColor Gray
Write-Host "6. Start backend: cd apps\agents; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "See SETUP_GUIDE.md for detailed instructions!" -ForegroundColor Cyan
Write-Host ""
