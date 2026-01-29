# 🚨 URGENT DEPLOYMENT CHECKLIST

**Tarih:** 29 Ocak 2026  
**Durum:** 🔴 CRITICAL - Immediate deployment required  
**Sorun:** Duplicate detection fix local'de ama production'da değil

---

## 📋 DEPLOYMENT STEPS

### 1. Commit Changes

```bash
git add .
git commit -m "fix: Enhanced duplicate detection in publishArticle - prevents duplicate articles after rewrite"
```

### 2. Push to Repository

```bash
git push origin main
```

### 3. Deploy to Production (Coolify)

**Option A: Auto-deploy (if configured)**

- Coolify otomatik olarak yeni commit'i algılar
- Build başlatır
- Deploy eder

**Option B: Manual deploy**

```bash
# Coolify dashboard'a git
# Project → Deployments → Deploy Now
```

### 4. Restart Worker Container

```bash
# Worker container'ı restart et (yeni kodu alsın)
docker restart <worker-container-name>

# VEYA Coolify'dan:
# Services → Worker → Restart
```

### 5. Verify Deployment

```bash
# Check logs
docker logs -f <app-container-name>
docker logs -f <worker-container-name>

# Test duplicate detection
# Manuel tetikleme yap ve logları izle
```

---

## 🔍 VERIFICATION

### Check 1: Code Version

```bash
# Container içinde dosyayı kontrol et
docker exec <app-container-name> cat /app/src/services/content.service.ts | grep "isDuplicateNews"

# Beklenen: isDuplicateNews çağrısı olmalı
```

### Check 2: Worker Logs

```bash
# Worker loglarında şu mesajları ara:
docker logs <worker-container-name> | grep "DUPLICATE"

# Beklenen:
# 🗑️ DUPLICATE (TITLE_SIMILARITY_XX%): ...
# 🗑️ Duplicate detected, skipped: ...
```

### Check 3: Database

```sql
-- Son 1 saatte oluşturulan Tesla haberleri
SELECT
    id,
    title,
    "createdAt",
    "sourceUrl"
FROM "Article"
WHERE
    LOWER(title) LIKE '%tesla%'
    AND "createdAt" >= NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;

-- Beklenen: Sadece 1 Tesla haberi olmalı
```

---

## 📝 CHANGED FILES

### Critical Files (MUST deploy)

- ✅ `src/services/content.service.ts`
  - `publishArticle()` - 2-layer duplicate check
  - `processAndPublishArticles()` - null check
  - Return type: `Promise<{...} | null>`

### Supporting Files (Optional)

- `src/services/news.service.ts` - Title similarity threshold (70%)
- `WORKER-DUPLICATE-RACE-CONDITION-FIX.md` - Documentation

---

## ⚠️ ROLLBACK PLAN

Eğer deployment sorun çıkarırsa:

### Option 1: Git Revert

```bash
git revert HEAD
git push origin main
```

### Option 2: Coolify Rollback

```bash
# Coolify dashboard → Deployments → Previous version → Rollback
```

### Option 3: Manual Fix

```bash
# Eski kodu geri yükle
git checkout HEAD~1 src/services/content.service.ts
git commit -m "revert: Rollback duplicate detection changes"
git push origin main
```

---

## 🎯 POST-DEPLOYMENT MONITORING

### 1. Watch Worker Logs (30 minutes)

```bash
docker logs -f <worker-container-name> | grep -E "(DUPLICATE|Haber yayınlandı|Processing job)"
```

### 2. Check Article Count

```sql
-- Her 5 dakikada bir çalıştır
SELECT
    DATE_TRUNC('hour', "createdAt") as hour,
    COUNT(*) as article_count
FROM "Article"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Beklenen: Saatlik article count düşmeli (duplicate'ler yok)
```

### 3. Monitor Duplicate Rate

```sql
-- Duplicate olabilecek haberler (aynı sourceUrl)
SELECT
    "sourceUrl",
    COUNT(*) as count,
    STRING_AGG(title, ' | ') as titles
FROM "Article"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY "sourceUrl"
HAVING COUNT(*) > 1;

-- Beklenen: Boş sonuç (duplicate yok)
```

---

## 📊 SUCCESS METRICS

| Metric          | Before | Target | How to Measure              |
| --------------- | ------ | ------ | --------------------------- |
| Duplicate Rate  | ~15%   | <2%    | SQL query (sourceUrl count) |
| Articles/Hour   | ~10    | ~3-5   | Article count by hour       |
| Worker Errors   | High   | Low    | Error logs count            |
| False Positives | ~5%    | <2%    | Manual review               |

---

## 🚀 DEPLOYMENT COMMAND (Quick)

```bash
# All-in-one deployment
git add . && \
git commit -m "fix: Enhanced duplicate detection - prevents duplicate articles" && \
git push origin main && \
echo "✅ Pushed to repository. Check Coolify for auto-deploy status."
```

---

## 📞 EMERGENCY CONTACTS

- **Coolify Dashboard:** https://your-coolify-url.com
- **Database:** PostgreSQL connection string in .env.production
- **Worker Logs:** Docker logs or Coolify logs panel

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Code committed to git
- [ ] Pushed to main branch
- [ ] Coolify build started
- [ ] App container restarted
- [ ] Worker container restarted
- [ ] Logs verified (no errors)
- [ ] Duplicate detection working (test with manual trigger)
- [ ] Database checked (no new duplicates)
- [ ] Monitoring active (30 minutes)

---

**DEPLOY NOW!** 🚀

Time is critical - every minute, more duplicates may be created.
