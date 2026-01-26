# 🚀 Deployment Action Plan - Coolify PostgreSQL Fix

## 📊 Executive Summary

**Problem**: PostgreSQL container health check failing, causing deployment failure  
**Root Cause**: Environment variable expansion issue + insufficient startup time  
**Solution**: Fixed health check command + added start periods + corrected app port  
**Status**: ✅ **READY TO DEPLOY**

---

## 🎯 Immediate Actions Required

### Action 1: Update docker-compose.coolify.yaml ✅

**Status**: ✅ **COMPLETED**

Changes made:

- Fixed PostgreSQL health check command
- Added start_period to all services
- Increased retries for PostgreSQL
- Fixed app health check port (3001 → 3000)
- Added default environment values

**File**: `docker-compose.coolify.yaml` (already updated)

### Action 2: Configure Coolify Environment Variables

**Status**: ⏳ **PENDING - USER ACTION REQUIRED**

**Priority**: 🔴 **CRITICAL**

Follow the guide in `COOLIFY-ENV-SETUP.md` to set all required environment variables.

**Minimum Required Variables:**

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<GENERATE_WITH_OPENSSL>
POSTGRES_DB=ainewsdb
NEXTAUTH_SECRET=<GENERATE_WITH_OPENSSL>
NEXTAUTH_URL=https://aihaberleri.org
DATABASE_URL=postgresql://postgres:<PASSWORD>@postgres:5432/ainewsdb
REDIS_URL=redis://redis:6379
```

**Generate secrets:**

```bash
# PostgreSQL password
openssl rand -base64 32

# NextAuth secret
openssl rand -base64 32
```

### Action 3: Set Build Environment Variables

**Status**: ⏳ **PENDING - USER ACTION REQUIRED**

**Priority**: 🔴 **CRITICAL**

In Coolify's **Build Environment** section, add:

```env
SKIP_ENV_VALIDATION=1
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Important**: These should ONLY be in build environment!

### Action 4: Push Changes to Repository

**Status**: ⏳ **PENDING - USER ACTION REQUIRED**

**Priority**: 🟡 **HIGH**

```bash
git add docker-compose.coolify.yaml
git commit -m "fix: PostgreSQL health check and container startup issues"
git push origin main
```

### Action 5: Trigger Deployment

**Status**: ⏳ **PENDING - USER ACTION REQUIRED**

**Priority**: 🟡 **HIGH**

1. Go to Coolify dashboard
2. Navigate to your project
3. Click "Deploy" or wait for auto-deployment
4. Monitor build logs

---

## 📋 Deployment Timeline

### Phase 1: Pre-Deployment (5-10 minutes)

- [ ] Review `COOLIFY-POSTGRES-FIX.md` for technical details
- [ ] Review `COOLIFY-ENV-SETUP.md` for environment setup
- [ ] Generate secure passwords and secrets
- [ ] Set all environment variables in Coolify
- [ ] Set build environment variables
- [ ] Push updated docker-compose.coolify.yaml

### Phase 2: Deployment (3-5 minutes)

- [ ] Trigger deployment in Coolify
- [ ] Monitor build logs
- [ ] Wait for build to complete
- [ ] Wait for containers to start

### Phase 3: Health Check Verification (2-3 minutes)

Expected timeline:

```
0s    - Containers start
10s   - Redis becomes healthy ✅
40s   - PostgreSQL becomes healthy ✅
60s   - App starts, runs migrations
90s   - App becomes healthy ✅
```

### Phase 4: Post-Deployment Verification (5 minutes)

- [ ] Check `/api/health` endpoint
- [ ] Verify homepage loads
- [ ] Test admin panel login
- [ ] Check database connection
- [ ] Test Redis caching
- [ ] Verify email service
- [ ] Test push notifications

---

## 🔍 Monitoring & Verification

### 1. Check Container Status

```bash
docker ps
```

Expected output:

```
CONTAINER ID   STATUS
aihaberleri-postgres   Up 2 minutes (healthy)
aihaberleri-redis      Up 2 minutes (healthy)
aihaberleri-app        Up 1 minute (healthy)
```

### 2. Check Health Endpoint

```bash
curl https://aihaberleri.org/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-25T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 3. Check Container Logs

```bash
# PostgreSQL logs
docker logs aihaberleri-postgres

# Redis logs
docker logs aihaberleri-redis

# App logs
docker logs aihaberleri-app
```

### 4. Manual Health Checks

```bash
# PostgreSQL
docker exec aihaberleri-postgres pg_isready -U postgres -d ainewsdb

# Redis
docker exec aihaberleri-redis redis-cli ping

# App
docker exec aihaberleri-app wget -q -O- http://localhost:3000/api/health
```

---

## 🚨 Troubleshooting Guide

### Issue 1: PostgreSQL Still Unhealthy

**Symptoms:**

```
❌ postgres: unhealthy
```

**Diagnosis:**

```bash
# Check logs
docker logs aihaberleri-postgres

# Manual health check
docker exec aihaberleri-postgres pg_isready -U postgres -d ainewsdb
```

**Solutions:**

1. Verify `POSTGRES_PASSWORD` is set in Coolify
2. Check volume permissions
3. Increase `start_period` to 60s if needed
4. Ensure container has enough memory (min 256MB)

### Issue 2: App Dependency Failed

**Symptoms:**

```
❌ app: dependency failed to start
```

**Diagnosis:**

```bash
# Check app logs
docker logs aihaberleri-app

# Check depends_on
docker-compose ps
```

**Solutions:**

1. Wait for PostgreSQL to become healthy first
2. Verify `DATABASE_URL` format is correct
3. Check Prisma migration logs
4. Ensure Redis is healthy

### Issue 3: Health Check Timeout

**Symptoms:**

```
⚠️ Health check taking too long
```

**Diagnosis:**

```bash
# Check health check timing
docker inspect aihaberleri-postgres | grep -A 10 Health
```

**Solutions:**

1. Increase `start_period` in docker-compose.coolify.yaml
2. Increase `retries` for more attempts
3. Check server resources (CPU, memory)

### Issue 4: Wrong DATABASE_URL

**Symptoms:**

```
Error: Can't reach database server
```

**Diagnosis:**

```bash
# Check DATABASE_URL
docker exec aihaberleri-app printenv DATABASE_URL
```

**Solutions:**

1. Verify format: `postgresql://postgres:password@postgres:5432/ainewsdb`
2. Use `postgres` as hostname (not `localhost`)
3. Include password in connection string
4. Match `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

---

## 📊 Success Criteria

### ✅ Deployment Successful When:

1. **Build Phase**
   - ✅ Build completes without errors
   - ✅ No TypeScript errors
   - ✅ No lint errors
   - ✅ All pages built successfully

2. **Container Health**
   - ✅ PostgreSQL: healthy
   - ✅ Redis: healthy
   - ✅ App: healthy

3. **Functional Tests**
   - ✅ Homepage loads (200 OK)
   - ✅ `/api/health` returns OK
   - ✅ Admin panel accessible
   - ✅ Database queries work
   - ✅ Redis caching works

4. **Performance**
   - ✅ Page load time < 3 seconds
   - ✅ API response time < 500ms
   - ✅ No memory leaks
   - ✅ No CPU spikes

---

## 📚 Documentation Reference

### Technical Details

- **COOLIFY-POSTGRES-FIX.md** - Root cause analysis and technical fixes
- **COOLIFY-ENV-SETUP.md** - Environment variable setup guide
- **DEPLOYMENT-READY-SUMMARY.md** - Previous deployment status

### Configuration Files

- **docker-compose.coolify.yaml** - Updated with fixes
- **.env.example** - Environment variable template

### Deployment Guides

- **COOLIFY-DEPLOYMENT-CHECKLIST.md** - Step-by-step deployment
- **DOCKER-BUILD-FIX.md** - Build-time fixes

---

## 🎯 Next Steps After Successful Deployment

### 1. Enable Monitoring

- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error tracking (Sentry)
- Enable performance monitoring (New Relic, DataDog)

### 2. Configure Backups

- Database backups (daily)
- Volume backups (weekly)
- Configuration backups (on change)

### 3. Set Up Alerts

- Container health alerts
- Disk space alerts
- Memory usage alerts
- Error rate alerts

### 4. Performance Optimization

- Enable CDN for static assets
- Configure Redis caching
- Optimize database queries
- Enable compression

### 5. Security Hardening

- Enable HTTPS (Let's Encrypt)
- Configure security headers
- Set up WAF (Web Application Firewall)
- Enable rate limiting

---

## 📞 Support & Resources

### Documentation

- Coolify Docs: https://coolify.io/docs
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL: https://www.postgresql.org/docs/

### Community

- Coolify Discord: https://coolify.io/discord
- GitHub Issues: https://github.com/coollabsio/coolify

### Emergency Contacts

- DevOps Team: devops@aihaberleri.org
- Technical Support: support@aihaberleri.org

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All environment variables set in Coolify
- [ ] Build environment variables configured
- [ ] docker-compose.coolify.yaml pushed to repository
- [ ] Deployment triggered
- [ ] All containers healthy
- [ ] Health endpoint returns OK
- [ ] Homepage loads successfully
- [ ] Admin panel accessible
- [ ] Database connection verified
- [ ] Redis connection verified
- [ ] Email service tested
- [ ] Push notifications tested
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Documentation updated

---

**Status**: ✅ **ACTION PLAN READY**  
**Priority**: 🔴 **CRITICAL - IMMEDIATE ACTION REQUIRED**  
**Estimated Time**: 20-30 minutes total  
**Date**: 2026-01-25  
**Version**: 1.0

---

## 🚀 Quick Start Command

```bash
# 1. Generate secrets
echo "PostgreSQL Password: $(openssl rand -base64 32)"
echo "NextAuth Secret: $(openssl rand -base64 32)"

# 2. Push changes
git add docker-compose.coolify.yaml
git commit -m "fix: PostgreSQL health check and container startup issues"
git push origin main

# 3. Deploy in Coolify UI
# 4. Monitor: docker ps
# 5. Verify: curl https://aihaberleri.org/api/health
```

**Let's deploy! 🚀**
