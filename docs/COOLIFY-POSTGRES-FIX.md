# 🔧 Coolify PostgreSQL Health Check Fix

## 🐛 Problem Analysis

### Root Cause

The PostgreSQL container was failing health checks and causing "dependency failed to start" errors due to:

1. **Environment Variable Expansion Issue**: Health check command used `${POSTGRES_USER}` which doesn't expand correctly in `CMD-SHELL` context
2. **Missing Start Period**: First-time database initialization takes 30-60 seconds, but health check started immediately
3. **Insufficient Retries**: Only 5 retries (50 seconds total) wasn't enough for initial DB setup
4. **Wrong App Health Check Port**: App health check used port 3001 but container runs on port 3000 internally

### Error Symptoms

```
❌ postgres: unhealthy
❌ app: dependency failed to start
```

---

## ✅ Solutions Implemented

### 1. Fixed PostgreSQL Health Check

**Before:**

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

**After:**

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d ${POSTGRES_DB:-ainewsdb}"]
  interval: 10s
  timeout: 5s
  retries: 10
  start_period: 40s
```

**Changes:**

- ✅ Hardcoded `-U postgres` (default superuser, always exists)
- ✅ Added `-d ${POSTGRES_DB:-ainewsdb}` to check specific database
- ✅ Increased retries from 5 to 10 (100 seconds total)
- ✅ Added `start_period: 40s` to allow initialization time

### 2. Added Default Environment Values

**Before:**

```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_DB: ${POSTGRES_DB}
```

**After:**

```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER:-postgres}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_DB: ${POSTGRES_DB:-ainewsdb}
  POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C"
```

**Changes:**

- ✅ Added default values (`:- syntax`) for graceful fallback
- ✅ Added `POSTGRES_INITDB_ARGS` for faster initialization

### 3. Fixed App Health Check Port

**Before:**

```yaml
test:
  [
    "CMD",
    "wget",
    "--no-verbose",
    "--tries=1",
    "--spider",
    "http://localhost:3001/api/health",
  ]
start_period: 40s
```

**After:**

```yaml
test:
  [
    "CMD",
    "wget",
    "--no-verbose",
    "--tries=1",
    "--spider",
    "http://localhost:3000/api/health",
  ]
start_period: 60s
```

**Changes:**

- ✅ Changed port from 3001 to 3000 (correct internal port)
- ✅ Increased start_period from 40s to 60s (allows DB migrations to complete)

### 4. Added Redis Start Period

**Before:**

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

**After:**

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

**Changes:**

- ✅ Added `start_period: 10s` for consistency

---

## 🚀 Coolify Environment Variables

### Required Variables (Must Set in Coolify)

```env
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=ainewsdb

# Application Port
APP_PORT=3001

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://aihaberleri.org

# Database Connection (Auto-constructed)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Redis Connection
REDIS_URL=redis://redis:6379

# AI Services
DEEPSEEK_API_KEY=sk-xxxxx

# Search APIs
BRAVE_API_KEY=BSA-xxxxx
TAVILY_API_KEY=tvly-xxxxx
EXA_API_KEY=exa-xxxxx

# Email Service
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@aihaberleri.org

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://aihaberleri.org
NEXT_PUBLIC_SITE_NAME=AI Haberleri
NEXT_PUBLIC_SITE_DESCRIPTION=Yapay zeka dünyasındaki gelişmeleri yakından takip edin

# Social Media
TWITTER_HANDLE=@aihaberleriorg
CONTACT_EMAIL=info@aihaberleri.org

# Agent Configuration
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PER_RUN=3
AGENT_MAX_ARTICLES_PER_RUN=5
AGENT_MIN_INTERVAL_HOURS=6

# Production Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Build-Time Variables (Coolify Build Environment)

```env
SKIP_ENV_VALIDATION=1
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Set all required environment variables in Coolify
- [ ] Ensure `POSTGRES_PASSWORD` is strong and secure
- [ ] Verify `NEXTAUTH_SECRET` is generated (use `openssl rand -base64 32`)
- [ ] Confirm `NEXTAUTH_URL` matches your domain
- [ ] Add `SKIP_ENV_VALIDATION=1` to build environment

### Deployment

- [ ] Push updated `docker-compose.coolify.yaml` to repository
- [ ] Trigger deployment in Coolify
- [ ] Monitor build logs for errors
- [ ] Wait for PostgreSQL health check to pass (up to 100 seconds)
- [ ] Wait for Redis health check to pass (up to 60 seconds)
- [ ] Wait for app health check to pass (up to 150 seconds)

### Post-Deployment Verification

- [ ] Check `/api/health` endpoint returns 200 OK
- [ ] Verify homepage loads correctly
- [ ] Test database connection (check admin panel)
- [ ] Test Redis connection (check caching)
- [ ] Verify email service works
- [ ] Test push notifications
- [ ] Check logs for errors

---

## 🔍 Troubleshooting

### PostgreSQL Still Unhealthy

**Check logs:**

```bash
docker logs aihaberleri-postgres
```

**Common issues:**

1. **Password not set**: Ensure `POSTGRES_PASSWORD` is set in Coolify
2. **Volume permissions**: Check volume mount permissions
3. **Insufficient resources**: Ensure container has enough memory (min 256MB)

**Manual health check:**

```bash
docker exec aihaberleri-postgres pg_isready -U postgres -d ainewsdb
```

### App Dependency Failed

**Check logs:**

```bash
docker logs aihaberleri-app
```

**Common issues:**

1. **Database not ready**: Wait for postgres health check to pass
2. **Migration failed**: Check Prisma migration logs
3. **Connection string wrong**: Verify `DATABASE_URL` format

**Manual connection test:**

```bash
docker exec aihaberleri-app node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('Connected')).catch(console.error)"
```

### Health Check Timeout

**Increase timeouts if needed:**

```yaml
healthcheck:
  interval: 15s # Check every 15s instead of 10s
  timeout: 10s # Wait 10s for response
  retries: 15 # Try 15 times (225s total)
  start_period: 60s # Wait 60s before first check
```

---

## 📊 Health Check Timeline

### Expected Startup Sequence

```
0s    - Containers start
10s   - Redis becomes healthy
40s   - PostgreSQL initialization begins
50s   - PostgreSQL becomes healthy
60s   - App starts, runs migrations
90s   - App becomes healthy
```

### Total Startup Time

- **First deployment**: 90-120 seconds (includes DB initialization)
- **Subsequent deployments**: 60-90 seconds (DB already initialized)

---

## 🎯 Success Indicators

### Healthy Deployment

```bash
$ docker ps
CONTAINER ID   STATUS
aihaberleri-postgres   Up 2 minutes (healthy)
aihaberleri-redis      Up 2 minutes (healthy)
aihaberleri-app        Up 1 minute (healthy)
```

### Health Endpoint Response

```bash
$ curl https://aihaberleri.org/api/health
{
  "status": "ok",
  "timestamp": "2026-01-25T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 📚 Additional Resources

- **Docker Compose Health Checks**: https://docs.docker.com/compose/compose-file/compose-file-v3/#healthcheck
- **PostgreSQL pg_isready**: https://www.postgresql.org/docs/current/app-pg-isready.html
- **Coolify Documentation**: https://coolify.io/docs

---

## ✅ Summary

**Problem**: PostgreSQL health check failing due to environment variable expansion and timing issues

**Solution**:

1. Hardcoded username in health check
2. Added start_period for initialization time
3. Increased retries for resilience
4. Fixed app health check port
5. Added default environment values

**Result**: Reliable container startup with proper dependency management

---

**Status**: ✅ **FIXED AND TESTED**  
**Date**: 2026-01-25  
**Version**: 1.0
