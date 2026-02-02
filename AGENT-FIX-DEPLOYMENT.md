# 🚨 URGENT: Agent Fix Deployment

**Date:** 2026-02-02  
**Priority:** CRITICAL  
**Downtime:** 0 minutes (zero-downtime)

---

## 🎯 WHAT'S FIXED

1. ✅ Agent now publishes **1 article** per run (was: 3-5)
2. ✅ AI keyword filter fixed - no more false positives (e.g., "Tennessee betting")

---

## 🚀 DEPLOYMENT (3 STEPS)

### Step 1: Verify Production Database Settings

```bash
npx tsx scripts/fix-production-settings.ts
```

**Expected Output:**

```
✅ agent.minArticles         = 1
✅ agent.maxArticles         = 1
✅ agent.intervalHours       = 0.25
```

### Step 2: Deploy Code Changes

```bash
# Build
npm run build

# Deploy (choose one)
git push origin main  # Coolify auto-deploy
# or
docker-compose up -d --build
# or
pm2 restart all
```

### Step 3: Restart Worker (CRITICAL!)

```bash
# Find worker container
docker ps | grep worker

# Restart worker
docker restart <worker-container-id>

# Verify restart
docker logs -f <worker-container-id>
```

---

## ✅ VERIFICATION

### Check Logs (First Run)

Look for these lines:

```
📊 Haber sayısı ayarları: min=1, max=1  ✅ (was: min=3, max=5)
🎯 Hedef haber sayısı: 1                ✅ (was: 3-5)
✅ FINAL RESULT: 1 haber yayınlandı     ✅ (was: 3)
```

### Check Published Article

- [ ] Only 1 article published
- [ ] Article is AI-related (not "Tennessee betting" or similar)

---

## 🚨 IF SOMETHING GOES WRONG

### Problem: Agent still publishes 3 articles

**Solution:** Worker not restarted!

```bash
docker restart <worker-container-id>
```

### Problem: Non-AI articles still published

**Solution:** Code not deployed!

```bash
npm run build
docker-compose up -d --build
```

---

## 📞 QUICK COMMANDS

```bash
# Check worker logs
docker logs -f $(docker ps | grep worker | awk '{print $1}')

# Check database settings
npx tsx scripts/check-agent-settings.ts

# Restart worker
docker restart $(docker ps | grep worker | awk '{print $1}')
```

---

**READY TO DEPLOY!** 🚀

**Estimated Time:** 5 minutes  
**Risk:** LOW (zero-downtime, easy rollback)
