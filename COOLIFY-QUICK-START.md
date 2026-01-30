# 🚀 Coolify Deployment - Quick Start Checklist

## Pre-Deployment Checklist

### ✅ GitHub Repository
- [ ] Repository pushed to GitHub
- [ ] Branch: `main` is up-to-date
- [ ] `.gitignore` configured (no secrets committed)
- [ ] `docker-compose.coolify.yaml` present in root

### ✅ Coolify Server Setup
- [ ] Coolify installed and running
- [ ] Domain configured (aihaberleri.org)
- [ ] SSL enabled (Let's Encrypt)
- [ ] PostgreSQL resource created
- [ ] Network `coolify` exists

### ✅ Environment Variables (Coolify Dashboard)
Copy from `.env.coolify.example`:

**Critical (Required)**:
- [ ] `DATABASE_URL` (Internal URL from Coolify PostgreSQL)
- [ ] `REDIS_PASSWORD` (Generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_SECRET` (Generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` (https://aihaberleri.org)
- [ ] `DEEPSEEK_API_KEY`
- [ ] `BRAVE_API_KEY`

**Recommended**:
- [ ] SMTP settings (Email notifications)
- [ ] `UNSPLASH_ACCESS_KEY` (Image fallback)

**Optional**:
- [ ] Firebase credentials (Push notifications)
- [ ] Twitter/Facebook API keys (Social media posting)

---

## Deployment Steps

### 1. Create Resource in Coolify

```
Resource Type: Docker Compose
Repository: https://github.com/Optimus825482/aihaberleri.git
Branch: main
Docker Compose File: docker-compose.coolify.yaml
```

### 2. Add Environment Variables

Go to: **Project → Environment**

Paste all variables from `.env.coolify.example`

⚠️ **CRITICAL**: Use PostgreSQL **Internal URL** for `DATABASE_URL`
```
✅ CORRECT: postgresql://postgres:PASSWORD@postgres:5432/postgresainewsdb
❌ WRONG:   postgresql://postgres:PASSWORD@77.42.68.4:5435/postgresainewsdb
```

### 3. Save & Deploy

- Click **"Save"**
- Click **"Deploy"**
- Monitor logs in **"Logs"** tab

Expected: ~3-5 minutes

### 4. First-Time Setup (One-Time)

After successful deployment:

```bash
# Access app container
docker exec -it aihaberleri-app sh

# Run database migrations
npx prisma migrate deploy

# Seed initial data (categories, settings)
npx prisma db seed

# Exit container
exit
```

### 5. Verify Deployment

**Check Logs**:
```
App Logs:
✅ Server running on port 3000
✅ Database connected

Worker Logs:
✅ Starting News Agent Worker
✅ Redis connected
✅ Database connected
```

**Test URLs**:
- [ ] Homepage: https://aihaberleri.org
- [ ] Admin Login: https://aihaberleri.org/admin/login
- [ ] Health Check: https://aihaberleri.org/api/health (should return 200)

---

## Post-Deployment

### Container Status Check

Coolify Dashboard → **Containers**

Expected status:
- ✅ `aihaberleri-app` - Running (Healthy)
- ✅ `aihaberleri-worker` - Running (Healthy)
- ✅ `aihaberleri-redis` - Running (Healthy)

### Create Admin User

```bash
# Access app container
docker exec -it aihaberleri-app sh

# Open Prisma Studio (optional, for GUI)
npx prisma studio

# Or use psql directly
docker exec -it postgres psql -U postgres -d postgresainewsdb

# Create admin user
INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@aihaberleri.org',
  '$2a$10$...', -- bcrypt hash of your password
  'Admin',
  'ADMIN',
  NOW(),
  NOW()
);
```

**Or use seed script** (recommended):
```bash
npx prisma db seed
# Default: admin@example.com / admin123
```

### Enable Auto-Deploy

Coolify automatically creates GitHub webhook.

Verify:
1. GitHub → Repository → Settings → Webhooks
2. Should see Coolify webhook URL
3. Test by pushing a commit:

```bash
git add .
git commit -m "test: auto-deploy verification"
git push origin main

# Watch Coolify Dashboard → Logs for auto-deployment
```

---

## Ongoing Maintenance

### Update Environment Variables

1. Coolify Dashboard → Environment
2. Add/modify variables
3. **Click "Save"**
4. **⚠️ MUST CLICK "Redeploy"** (variables won't apply without redeploy)

### Restart Containers

**Full restart**:
```
Coolify Dashboard → Project → Redeploy
```

**Single container**:
```
Coolify Dashboard → Containers → [Container] → Restart
```

**Worker restart** (after code changes to agent logic):
```
Coolify Dashboard → Containers → aihaberleri-worker → Restart
```

### View Logs

**Real-time logs**:
```
Coolify Dashboard → Logs → [Select container] → Follow
```

**Search logs**:
```
Logs tab → Search field → Enter keyword
```

**Download logs**:
```
Logs tab → Download button
```

### Database Backup

**Automatic** (Coolify built-in):
- Coolify Dashboard → PostgreSQL → Backups
- Configure schedule (daily recommended)

**Manual backup**:
```bash
docker exec postgres pg_dump -U postgres postgresainewsdb > backup_$(date +%Y%m%d).sql
```

### Database Access

**Via psql**:
```bash
docker exec -it postgres psql -U postgres -d postgresainewsdb
```

**Via Prisma Studio** (GUI):
```bash
docker exec -it aihaberleri-app npx prisma studio
# Access at http://localhost:5555
```

---

## Troubleshooting

### Deployment Failed

**Check**:
1. Build logs in Coolify Dashboard
2. Look for Docker build errors
3. Verify all required env vars are set

**Common issues**:
- Missing `DEEPSEEK_API_KEY` → Build succeeds but agent fails
- Wrong `DATABASE_URL` → Database connection errors
- Missing `NEXTAUTH_SECRET` → Auth fails

### Containers Restarting

**Check health status**:
```
Coolify Dashboard → Containers → [Container] → Health
```

**Worker restarting**:
- Check logs for database connection errors
- Verify `DATABASE_URL` uses internal hostname (`postgres:5432`)
- Check Redis connectivity

**App restarting**:
- Check port conflicts
- Verify Next.js build succeeded
- Check available memory (min 1GB recommended)

### Worker Not Processing Jobs

**Verify worker is running**:
```bash
docker exec aihaberleri-worker pgrep -f "news-agent.worker"
# Should return process ID
```

**Check Redis connection**:
```bash
docker exec aihaberleri-redis redis-cli ping
# Should return: PONG
```

**Manual job trigger**:
- Login to Admin Panel: https://aihaberleri.org/admin
- Go to Agent Settings
- Click "Hemen Çalıştır" (Run Now)

### Agent Not Creating Articles

**Check DeepSeek API**:
- Verify `DEEPSEEK_API_KEY` is valid
- Check API quota: https://platform.deepseek.com

**Check Brave Search API**:
- Verify `BRAVE_API_KEY` is valid
- Check API limits

**Check Agent Logs**:
```
Admin Panel → Dashboard → Agent Logs
Look for errors in execution history
```

---

## Performance Tuning

### Resource Limits

Current limits in `docker-compose.coolify.yaml`:

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G

worker:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G

redis:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
```

**Adjust if needed** based on server capacity.

### Redis Memory

Current: 256MB with LRU eviction

**Monitor usage**:
```bash
docker exec aihaberleri-redis redis-cli info memory
```

**Increase if needed**:
Edit `docker-compose.coolify.yaml`:
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb
```

---

## Emergency Procedures

### Site Down

1. **Check Coolify Dashboard**
   - All containers running?
   - Any recent failed deployments?

2. **Rollback**
   - Coolify Dashboard → Deployments
   - Select previous successful deployment
   - Click "Redeploy This Version"

3. **Emergency restart**
   ```
   Coolify Dashboard → Project → Stop All
   Wait 10 seconds
   Coolify Dashboard → Project → Start All
   ```

### Database Issue

1. **Check PostgreSQL status**
   ```
   Coolify Dashboard → PostgreSQL → Status
   ```

2. **Restart PostgreSQL**
   ```
   Coolify Dashboard → PostgreSQL → Restart
   ```

3. **Restore from backup**
   ```
   Coolify Dashboard → PostgreSQL → Backups → Restore
   ```

---

## Success Indicators

✅ **Deployment Successful** when you see:

**App Container**:
```
✅ Server running on port 3000
✅ Database connected
✅ Redis connected
```

**Worker Container**:
```
✅ Starting News Agent Worker
✅ Redis connected
✅ Database connected
✅ Worker ready to process jobs
```

**Website**:
```
✅ Homepage loads
✅ Admin login works
✅ Articles visible
✅ Agent logs showing executions
```

---

## Quick Reference

| Task | Command/Location |
|------|------------------|
| View Logs | Coolify Dashboard → Logs |
| Restart App | Dashboard → app → Restart |
| Restart Worker | Dashboard → worker → Restart |
| Update Env Vars | Dashboard → Environment → Save → Redeploy |
| Rollback | Dashboard → Deployments → Previous → Redeploy |
| Database Backup | Dashboard → PostgreSQL → Backups |
| Run Migrations | `docker exec aihaberleri-app npx prisma migrate deploy` |
| Create Admin | `docker exec aihaberleri-app npx prisma db seed` |
| Test Agent | Admin Panel → Agent Settings → Hemen Çalıştır |

---

## Support

📚 **Full Documentation**: [COOLIFY-DEPLOYMENT-GUIDE.md](COOLIFY-DEPLOYMENT-GUIDE.md)

🐛 **Issues**: Open GitHub issue with:
- Coolify logs (last 100 lines)
- Container status
- Error messages

🔧 **Quick Help**: Check troubleshooting section in main guide

---

**Last Updated**: 29 Ocak 2026
**Version**: 1.0.0
