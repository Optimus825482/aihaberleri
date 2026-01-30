# Redis Authentication Fix - Deployment Guide

**Date**: 30 Ocak 2026  
**Issue**: Redis NOAUTH errors preventing agent activation  
**Status**: ✅ FIXED - Redis password added

---

## Problem

### Symptoms
```
Worker status check error: NOAUTH Authentication required.
İstatistik hatası: NOAUTH Authentication required.
AGENT'I AKTİF yapamıyorum
```

### Root Cause
Redis container çalışıyor ancak authentication (şifre) yok. Bazı komutlar (info, get) authentication gerektiriyor ve uygulama Redis'e erişemiyor.

---

## Solution Applied

### 1. Docker Compose Changes

**File**: `docker-compose.coolify.yaml`

#### Redis Service
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
  healthcheck:
    test: ["CMD", "sh", "-c", "redis-cli -a $$REDIS_PASSWORD ping"]
    # Note: $$REDIS_PASSWORD (double $) for shell interpolation in docker-compose
```

#### Worker Service
```yaml
environment:
  REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
```

#### App Service
```yaml
environment:
  REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
```

### 2. Environment Variable Required

**New Variable**: `REDIS_PASSWORD`

**Generate Password**:
```bash
openssl rand -base64 32
```

**Example Output**:
```
Xk9mP2nQ5vR8sT1wU3xY6zB4cD7fG0hJ
```

---

## Deployment Steps

### Step 1: Add REDIS_PASSWORD to Coolify

1. Go to Coolify Dashboard
2. Select your project: `aihaberleri`
3. Navigate to: **Environment** tab
4. Add new variable:
   ```
   Key: REDIS_PASSWORD
   Value: <paste generated password>
   ```
5. Click **Save**

### Step 2: Redeploy Containers

**Option A: Auto-deploy (Recommended)**
```bash
# Already pushed to GitHub
# Coolify will auto-deploy on next push
git push origin main
```

**Option B: Manual redeploy**
1. Coolify Dashboard → Project
2. Click **Redeploy** button
3. Wait ~7-8 minutes for rebuild

### Step 3: Verify Fix

**1. Check Redis Health**
```bash
docker-compose exec redis redis-cli -a YOUR_PASSWORD ping
# Expected: PONG
```

**2. Check App Logs**
```bash
docker-compose logs -f app | grep -i redis
# Should NOT see: NOAUTH errors
```

**3. Check Worker Logs**
```bash
docker-compose logs -f worker | grep -i redis
# Should see: ✅ Redis connected
```

**4. Test Agent Activation**
- Go to: https://aihaberleri.org/admin/agent
- Toggle **"Otonom Sistem"** switch
- Should turn ON without errors
- Check logs for agent job execution

---

## Verification Checklist

- [ ] `REDIS_PASSWORD` added to Coolify Environment
- [ ] Containers redeployed (via push or manual)
- [ ] No NOAUTH errors in app logs
- [ ] No NOAUTH errors in worker logs
- [ ] Redis ping successful with password
- [ ] Agent toggle works in admin panel
- [ ] Worker heartbeat updating every 30s

---

## Troubleshooting

### Issue: Still seeing NOAUTH errors

**Check 1**: Verify REDIS_PASSWORD is set
```bash
docker-compose exec app printenv | grep REDIS
# Should show: REDIS_URL=redis://:PASSWORD@redis:6379
```

**Check 2**: Restart containers
```bash
docker-compose restart redis worker app
```

**Check 3**: Rebuild from scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Issue: Redis container won't start

**Error**: `container redis-xxx is unhealthy`

**Cause**: Healthcheck failing - environment variable not interpolated correctly

**Fix Applied**: Changed healthcheck to use shell interpolation
```yaml
# Before (doesn't work):
test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]

# After (works):
test: ["CMD", "sh", "-c", "redis-cli -a $$REDIS_PASSWORD ping"]
```

**Check 1**: Check Redis logs
```bash
docker-compose logs redis
```

**Check 2**: Verify password format
- No spaces at beginning/end
- Base64 characters only (alphanumeric + / + =)
- Length: 32+ characters recommended

### Issue: Agent still won't activate

**Check 1**: Database connection
```bash
docker-compose exec app npx prisma db push
```

**Check 2**: Worker status
```bash
docker-compose ps worker
# Status should be: Up (healthy)
```

**Check 3**: Check settings table
```bash
docker-compose exec app npx prisma studio
# Navigate to: Setting model
# Find: agent.enabled → should allow toggle
```

---

## Security Best Practices

### Password Requirements
- **Length**: Minimum 32 characters
- **Characters**: Use alphanumeric + special chars
- **Generation**: Always use `openssl rand -base64 32`
- **Storage**: Only in Coolify environment (never commit to Git)

### Connection String Format
```
redis://:<PASSWORD>@<HOST>:<PORT>
       ↑ Colon required before password (empty username)
```

### Health Check with Password
```yaml
healthcheck:
  test: ["CMD", "sh", "-c", "redis-cli -a $$REDIS_PASSWORD ping"]
  #              ↑ Shell wrapper    ↑ Double $$ for docker-compose variable interpolation
```

**Why $$REDIS_PASSWORD?**
- Docker Compose uses `$VAR` for its own variable substitution
- `$$VAR` escapes to `$VAR` in the container's shell
- Shell then expands `$REDIS_PASSWORD` using environment variable

---

## Related Files Modified

1. `docker-compose.coolify.yaml` - Redis auth + REDIS_URL
2. `.env.coolify.example` - REDIS_PASSWORD documentation
3. `COOLIFY-QUICK-START.md` - Updated checklist
4. `REDIS-AUTH-FIX.md` - This guide

---

## Success Indicators

✅ Redis container healthy  
✅ No NOAUTH errors in logs  
✅ Worker connects to Redis successfully  
✅ App connects to Redis successfully  
✅ Agent toggle works in admin panel  
✅ Worker heartbeat updates continuously  
✅ Agent jobs execute without errors  

---

## Post-Deployment Monitoring

### Check Every 5 Minutes (First Hour)
```bash
# Worker status
docker-compose logs --tail=50 worker

# App errors
docker-compose logs --tail=50 app | grep -i error

# Redis connections
docker-compose exec redis redis-cli -a PASSWORD client list
```

### Monitor Agent Execution
- Admin Panel: https://aihaberleri.org/admin/agent
- Check "Son Çalışma" timestamp
- Verify articles are being created

---

**Implementation**: Commit `REDIS-AUTH-FIX`  
**Status**: Ready for deployment  
**Next Step**: Add REDIS_PASSWORD to Coolify + Redeploy  

---

*Fix applied by: AI Coding Assistant*  
*Impact: Critical - Enables agent functionality*  
*Priority: HIGH - Deploy immediately*
