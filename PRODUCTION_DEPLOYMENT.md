# Production Deployment Guide - ZOARK OS

Complete guide for deploying ZOARK OS to production with all new features.

## Phase 1: Database Migration

### Prerequisites
- PostgreSQL 14+ running
- Environment variables configured (.env file)
- Prisma CLI installed

### Steps

1. **Generate Prisma Client**
```bash
cd packages/database
npx prisma generate
```

2. **Create Migration**
```bash
npx prisma migrate dev --name add_production_models
```

3. **Verify Database**
```bash
npx prisma studio
```

## Phase 2: Backend Deployment

### Prerequisites
- Python 3.11+
- FastAPI dependencies installed
- Redis running
- PostgreSQL running

### Environment Variables
```
DATABASE_URL=postgresql://user:password@host:5432/zoark
REDIS_URL=redis://host:6379
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=zoark-documents
CORS_ORIGIN=https://your-frontend-url.com
```

### Deployment Steps

1. **Install Dependencies**
```bash
cd apps/agents
pip install -r requirements.txt
```

2. **Run Migrations**
```bash
cd ../../packages/database
npx prisma migrate deploy
```

3. **Start Backend Server**
```bash
cd ../../apps/agents
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Production Server (Gunicorn + Uvicorn)
```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

## Phase 3: Frontend Deployment

### Prerequisites
- Node.js 18+
- pnpm installed
- Next.js 15

### Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

### Deployment Steps

1. **Install Dependencies**
```bash
cd apps/web
pnpm install
```

2. **Build**
```bash
pnpm build
```

3. **Deploy to Vercel**
```bash
pnpm deploy
```

Or deploy to your own server:
```bash
pnpm start
```

## Phase 4: Production Checklist

### Security
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure database credentials
- [ ] Enable authentication
- [ ] Set up API rate limiting
- [ ] Configure firewall rules

### Monitoring
- [ ] Set up application monitoring (e.g., Sentry)
- [ ] Configure logging (e.g., ELK stack)
- [ ] Set up alerting for critical errors
- [ ] Monitor database performance
- [ ] Monitor API response times

### Backup & Recovery
- [ ] Set up automated database backups
- [ ] Test backup restoration
- [ ] Document recovery procedures
- [ ] Set up disaster recovery plan

### Performance
- [ ] Enable caching (Redis)
- [ ] Optimize database queries
- [ ] Enable CDN for static assets
- [ ] Configure database connection pooling
- [ ] Monitor and optimize agent execution

### Testing
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Run load tests
- [ ] Test all agent workflows
- [ ] Test email integrations

## Phase 5: Post-Deployment

### Verification
1. **Health Check**
```bash
curl https://your-api-url.com/health
```

2. **Test Core Features**
- Create a project
- Create tasks
- Assign team members
- Create broadcast email
- Verify agent execution

3. **Monitor Logs**
```bash
# View application logs
tail -f /var/log/zoark-os/app.log

# View agent activity
curl https://your-api-url.com/agent-activity
```

### Ongoing Maintenance
- Monitor agent performance
- Review error logs daily
- Update dependencies monthly
- Backup database daily
- Review and optimize slow queries

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma connection
npx prisma db execute --stdin < /dev/null
```

### Agent Execution Issues
```bash
# Check agent logs
curl https://your-api-url.com/agent-activity?limit=100

# Check agent schedules
curl https://your-api-url.com/agents/schedule
```

### API Issues
```bash
# Check API health
curl https://your-api-url.com/health

# View API documentation
https://your-api-url.com/docs
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple backend instances behind load balancer
- Use Redis for session management
- Configure database connection pooling
- Use CDN for static assets

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database indexes
- Enable query caching
- Optimize agent execution

### Database Scaling
- Use read replicas for reporting
- Partition large tables
- Archive old data
- Optimize indexes

## Support & Documentation

- API Documentation: `/docs`
- GitHub Issues: Report bugs and feature requests
- Email: support@zoark-os.com
