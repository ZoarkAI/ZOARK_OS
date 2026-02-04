# ZOARK OS - Deployment Guide

## 🚀 Quick Deploy

### Prerequisites
- GitHub account
- Vercel account (free tier)
- Railway/Render account (for backend)
- Supabase account (for PostgreSQL)
- Upstash account (for Redis)

### Step 1: Fork the Repository
```bash
git clone https://github.com/yourusername/zoark-os
cd zoark-os
git remote add origin https://github.com/yourusername/zoark-os.git
```

### Step 2: Set Up Supabase (PostgreSQL)
1. Go to https://supabase.com
2. Create new project
3. Copy database URL from Settings → Database
4. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### Step 3: Set Up Upstash (Redis)
1. Go to https://upstash.com
2. Create new Redis database
3. Copy Redis URL from dashboard

### Step 4: Deploy Frontend to Vercel

```bash
cd apps/web
vercel login
vercel
```

Set environment variables in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Step 5: Deploy Backend to Railway

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and deploy:
   ```bash
   cd apps/agents
   railway login
   railway init
   railway up
   ```

3. Add environment variables in Railway dashboard:
   ```
   DATABASE_URL=your-supabase-url
   REDIS_URL=your-upstash-url
   OPENAI_API_KEY=sk-...
   PINECONE_API_KEY=...
   SENDGRID_API_KEY=SG....
   ```

### Step 6: Run Migrations

```bash
cd packages/database
DATABASE_URL=your-supabase-url npx prisma migrate deploy
```

### Step 7: Apply PostgreSQL Triggers

```bash
psql your-supabase-url < apps/agents/app/db/triggers.sql
```

## 🔧 Manual Deployment (VPS)

### Requirements
- Ubuntu 22.04 LTS
- 2GB RAM minimum
- 20GB storage

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Clone and Setup

```bash
git clone https://github.com/yourusername/zoark-os.git
cd zoark-os

# Copy environment file
cp .env.example .env
nano .env  # Configure your settings

# Install dependencies
pnpm install

# Setup Python
cd apps/agents
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..

# Run database migrations
cd packages/database
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 3. Build Frontend

```bash
cd apps/web
pnpm build
cd ../..
```

### 4. Configure Systemd Services

**Frontend Service** (`/etc/systemd/system/zoark-web.service`):
```ini
[Unit]
Description=ZOARK OS Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/zoark-os/apps/web
ExecStart=/usr/bin/pnpm start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

**Backend Service** (`/etc/systemd/system/zoark-api.service`):
```ini
[Unit]
Description=ZOARK OS API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/zoark-os/apps/agents
ExecStart=/var/www/zoark-os/apps/agents/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

**Worker Service** (`/etc/systemd/system/zoark-worker.service`):
```ini
[Unit]
Description=ZOARK OS Redis Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/zoark-os/apps/agents
ExecStart=/var/www/zoark-os/apps/agents/venv/bin/python -m app.workers.redis_worker
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

**Scheduler Service** (`/etc/systemd/system/zoark-scheduler.service`):
```ini
[Unit]
Description=ZOARK OS Scheduler
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/zoark-os/apps/agents
ExecStart=/var/www/zoark-os/apps/agents/venv/bin/python -m app.workers.scheduler
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

### 5. Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable zoark-web zoark-api zoark-worker zoark-scheduler
sudo systemctl start zoark-web zoark-api zoark-worker zoark-scheduler
sudo systemctl status zoark-web zoark-api zoark-worker zoark-scheduler
```

### 6. Configure Nginx

Create `/etc/nginx/sites-available/zoark-os`:

```nginx
# Frontend
server {
    listen 80;
    server_name zoark.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.zoark.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/zoark-os /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Set Up SSL

```bash
sudo certbot --nginx -d zoark.yourdomain.com -d api.zoark.yourdomain.com
```

## 🔐 Environment Variables

### Frontend (.env)
```bash
NEXT_PUBLIC_API_URL=https://api.zoark.yourdomain.com
```

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/zoark

# Redis
REDIS_URL=redis://localhost:6379

# Pinecone
PINECONE_API_KEY=your-key
PINECONE_INDEX_NAME=zoark-documents
PINECONE_ENVIRONMENT=us-east-1

# OpenAI
OPENAI_API_KEY=sk-your-key

# SendGrid
SENDGRID_API_KEY=SG.your-key
SENDGRID_FROM_EMAIL=zoark@yourdomain.com

# App
APP_NAME=ZOARK OS API
DEBUG=false
```

## 📊 Monitoring

### Logs
```bash
# Frontend logs
sudo journalctl -u zoark-web -f

# Backend logs
sudo journalctl -u zoark-api -f

# Worker logs
sudo journalctl -u zoark-worker -f

# Scheduler logs
sudo journalctl -u zoark-scheduler -f
```

### Health Checks
- Frontend: https://zoark.yourdomain.com
- Backend: https://api.zoark.yourdomain.com/health
- API Docs: https://api.zoark.yourdomain.com/docs

## 🔄 Updates

```bash
cd /var/www/zoark-os
git pull

# Update frontend
cd apps/web
pnpm install
pnpm build
sudo systemctl restart zoark-web

# Update backend
cd ../agents
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart zoark-api zoark-worker zoark-scheduler
```

## 🐛 Troubleshooting

### Frontend not starting
```bash
cd apps/web
pnpm install
pnpm build
sudo systemctl restart zoark-web
```

### Database connection issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Run migrations
cd packages/database
npx prisma migrate deploy
```

### Redis connection issues
```bash
# Check Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping
```

## 📈 Scaling

### Horizontal Scaling
- Use load balancer (Nginx/HAProxy)
- Deploy multiple backend instances
- Use managed PostgreSQL (Supabase, AWS RDS)
- Use managed Redis (Upstash, AWS ElastiCache)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add database indexes
- Enable caching

## 🔒 Security Checklist

- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set secure environment variables
- [ ] Configure firewall (UFW)
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure CORS properly
- [ ] Use strong passwords
- [ ] Enable 2FA for admin accounts
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## 📝 License

MIT
