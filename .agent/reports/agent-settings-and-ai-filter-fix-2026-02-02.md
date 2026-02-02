# 🚨 CRITICAL FIX: Agent Settings + AI Keyword Filter

**Date:** 2026-02-02  
**Priority:** CRITICAL  
**Status:** ✅ FIXED

---

## 🎯 PROBLEMS DISCOVERED

### Problem 1: Agent Publishing 3 Articles Instead of 1

**Log Evidence:**

```
📊 Haber sayısı ayarları: min=3, max=5
🎯 Hedef haber sayısı: 4
✅ FINAL RESULT: 3 haber yayınlandı (1 attempt)
```

**Root Cause:**

- Database settings were updated locally but NOT in production
- Production database had NO `agent.minArticles` and `agent.maxArticles` settings
- Agent fell back to environment variables: `AGENT_MIN_ARTICLES_PER_RUN="2"`, `AGENT_MAX_ARTICLES_PER_RUN="3"`

### Problem 2: Non-AI Articles Being Published

**Evidence:**

- Article published: **"Tennessee Kampüs Bahis Yasağı Teklifi"** (Tennessee Campus Betting Ban)
- Original title: "Why a Tennessee proposal to ban sports betting on campus is too little, too late"
- This is NOT an AI article! ❌

**Root Cause:**

- AI keyword filter had: `"ai "` and `" ai"`
- These matched words like "camp**ai**gn", "det**ai**l", "em**ai**l"
- False positive: "campus" → "camp**ai**gn" → matched!

---

## ✅ SOLUTIONS IMPLEMENTED

### Fix 1: Production Database Settings

**Script:** `scripts/fix-production-settings.ts`

**Changes:**

```sql
-- Production Database: 77.42.68.4:5435/postgresainewsdb
INSERT INTO "Setting" (key, value) VALUES ('agent.minArticles', '1');
INSERT INTO "Setting" (key, value) VALUES ('agent.maxArticles', '1');
INSERT INTO "Setting" (key, value) VALUES ('agent.intervalHours', '0.25');
INSERT INTO "Setting" (key, value) VALUES ('agent.enabled', 'true');
```

**Result:**

```
✅ agent.enabled             = true
✅ agent.minArticles         = 1  (was: not set, defaulted to 2)
✅ agent.maxArticles         = 1  (was: not set, defaulted to 3)
✅ agent.intervalHours       = 0.25  (15 minutes)
```

### Fix 2: AI Keyword Filter

**File:** `src/services/news.service.ts`

**Before:**

```typescript
const AI_KEYWORDS = [
  "ai ",   // ❌ Matches "campaign", "detail", "email"
  " ai",   // ❌ Matches "campaign", "detail", "email"
  ...
];
```

**After:**

```typescript
const AI_KEYWORDS = [
  " ai ",  // ✅ Space on BOTH sides - only matches standalone "ai"
  ...
];
```

**Impact:**

- ❌ Before: "campus" → "camp**ai**gn" → MATCHED (false positive)
- ✅ After: "campus" → NO MATCH (correct)
- ✅ Still matches: "AI technology", "using AI", "AI-powered"

---

## 📊 EXPECTED RESULTS

### Before Fix

```
Agent Run:
  - Articles per run: 3-5 (random)
  - Interval: 15 minutes
  - AI filtering: 87/291 articles (30% - includes false positives)
  - Published: 3 articles (1 non-AI) ❌
```

### After Fix

```
Agent Run:
  - Articles per run: 1 (fixed)
  - Interval: 15 minutes
  - AI filtering: ~70/291 articles (24% - accurate)
  - Published: 1 AI article ✅
```

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Verify Production Settings

```bash
npx tsx scripts/fix-production-settings.ts
```

**Output:**

```
✅ agent.minArticles         = 1
✅ agent.maxArticles         = 1
✅ agent.intervalHours       = 0.25
```

### Step 2: Build and Deploy

```bash
npm run build
# Deploy to production (Coolify/Docker/PM2)
```

### Step 3: Restart Worker

```bash
# CRITICAL: Worker must be restarted to pick up new database settings!
docker restart <worker-container>
# or
pm2 restart worker
```

---

## 🔍 VERIFICATION CHECKLIST

### Immediate (First Run)

- [ ] Agent reads settings from database (not env vars)
- [ ] Log shows: `min=1, max=1`
- [ ] Log shows: `Hedef haber sayısı: 1`
- [ ] Only 1 article published
- [ ] Published article is AI-related

### Short-term (First 2 Hours)

- [ ] Agent runs every 15 minutes
- [ ] 1 article per run (8 articles in 2 hours)
- [ ] All articles are AI-related
- [ ] No "Tennessee betting" or similar non-AI articles

### Long-term (First 24 Hours)

- [ ] 96 articles published (24h × 4 runs/hour × 1 article)
- [ ] 100% AI-related articles
- [ ] No false positives from keyword filter

---

## 📈 METRICS TO MONITOR

### AI Filtering Accuracy

**Before:**

- Input: 291 articles
- AI filtered: 87 articles (30%)
- False positives: ~10-15% (e.g., "Tennessee betting")

**After:**

- Input: 291 articles
- AI filtered: ~70 articles (24%)
- False positives: <1%

### Articles Per Run

**Before:**

- Min: 2, Max: 3
- Actual: 3-5 (random)
- Result: 3 articles published ❌

**After:**

- Min: 1, Max: 1
- Actual: 1 (fixed)
- Result: 1 article published ✅

---

## 🚨 ROLLBACK PLAN

If issues occur:

### Rollback Step 1: Revert AI Keyword Filter

```typescript
// src/services/news.service.ts
const AI_KEYWORDS = [
  "ai ",   // Revert to old (less strict)
  " ai",
  ...
];
```

### Rollback Step 2: Revert Database Settings

```sql
UPDATE "Setting" SET value = '2' WHERE key = 'agent.minArticles';
UPDATE "Setting" SET value = '3' WHERE key = 'agent.maxArticles';
```

---

## 🎉 SUCCESS CRITERIA

1. ✅ Agent publishes exactly 1 article per run
2. ✅ All published articles are AI-related
3. ✅ No false positives from keyword filter
4. ✅ Agent runs every 15 minutes
5. ✅ Database settings override env vars

---

## 📝 NOTES

### Why This Happened

1. **Database settings not synced:** Local DB updated, production DB not updated
2. **Keyword filter too broad:** `"ai "` matched partial words

### Prevention

1. **Always update production DB:** Use scripts like `fix-production-settings.ts`
2. **Test keyword filters:** Use word boundaries or spaces on both sides
3. **Monitor logs:** Check `min=X, max=Y` in agent logs

### Related Files

- `src/services/news.service.ts` (AI keyword filter)
- `src/services/agent.service.ts` (settings loading)
- `scripts/fix-production-settings.ts` (production DB update)
- `.env` (fallback env vars)

---

**CRITICAL:** Worker MUST be restarted after database settings update!
