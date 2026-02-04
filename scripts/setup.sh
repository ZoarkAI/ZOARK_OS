#!/bin/bash
set -e

echo "🚀 ZOARK OS Setup Script"
echo "=========================="

# Check prerequisites
echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1 || { echo "❌ Python is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "⚠️  Docker is not installed. You'll need to install PostgreSQL and Redis manually." >&2; }
command -v pnpm >/dev/null 2>&1 || { echo "Installing pnpm..."; npm install -g pnpm; }

echo "✅ Prerequisites check passed"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
pnpm install

# Install backend dependencies
echo ""
echo "🐍 Setting up Python environment..."
cd apps/agents
python -m venv venv || python3 -m venv venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || echo "Note: Activate venv manually"
pip install -r requirements.txt
cd ../..

# Copy environment file
echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file. Please configure your API keys."
else
    echo "✅ .env file already exists"
fi

# Start Docker services
echo ""
echo "🐳 Starting Docker services..."
if command -v docker >/dev/null 2>&1; then
    docker compose up -d
    echo "✅ Docker services started"

    # Wait for PostgreSQL
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
else
    echo "⚠️  Docker not available. Make sure PostgreSQL and Redis are running manually."
fi

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with API keys"
echo "2. Start the development servers:"
echo "   - Frontend: cd apps/web && pnpm dev"
echo "   - Backend: cd apps/agents && uvicorn app.main:app --reload"
echo ""
echo "Happy coding! 🎉"
