# ZOARK OS - Agentic Workflow Engine

## 🎉 **100% Complete - Ready to Test!**

A production-ready full-stack agentic workflow engine with Next.js 15 + Python FastAPI + PostgreSQL + Prisma.

### ✨ Key Features

✅ **Autonomous Agents**: Task monitoring, email drafting, approval nudging, PDF parsing
✅ **Real-Time Updates**: Server-Sent Events for live agent activity
✅ **RAG System**: Semantic search with Pinecone + OpenAI embeddings
✅ **Drag-and-Drop UI**: Interactive task board with glassmorphic design
✅ **Visual Pipelines**: React Flow approval workflows
✅ **Event-Driven**: PostgreSQL triggers → Redis → Agent execution

## 🏗️ Architecture

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Python FastAPI (async API + agentic workers)
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Redis (job queue + pub/sub)
- **Vector DB**: Pinecone (RAG)
- **LLM**: OpenAI (email drafting + embeddings)

## 📱 Dashboard Sections

1. **The Pulse**: Drag-and-drop task board with velocity charts
2. **Proactive Directory**: Personnel management with AI-generated email drafts
3. **Flow Engine**: Visual approval pipeline builder
4. **Intelligence Hub**: RAG search + real-time agent activity feed

## Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.11
- pnpm >= 8
- Docker & Docker Compose

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Start services:
   ```bash
   docker-compose up -d
   ```
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Set up database:
   ```bash
   pnpm db:migrate
   pnpm db:generate
   ```
6. Start development servers:
   ```bash
   # Terminal 1: Next.js frontend
   pnpm web:dev

   # Terminal 2: FastAPI backend
   pnpm agents:dev
   ```

## Project Structure

```
zoark-os/
├── apps/
│   ├── web/                 # Next.js 15 frontend
│   └── agents/              # Python FastAPI backend
├── packages/
│   ├── database/            # Prisma schema
│   └── types/               # Shared TypeScript types
└── docker-compose.yml       # PostgreSQL + Redis
```

## Development

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Prisma Studio**: `pnpm db:studio`

## License

MIT
