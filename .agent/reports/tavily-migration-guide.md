# Tavily Implementation - Migration Guide

**Tarih:** 2026-02-08  
**Proje:** AI Haberleri

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Ensure `TAVILY_API_KEY` is set in all environments:

```bash
# .env.local (Development)
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx

# .env.production (Production)
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
```

**Verify:**

```bash
echo $TAVILY_API_KEY
```

---

### 2. Database Migration

#### Step 1: Generate Migration

```bash
npx prisma migrate dev --name add_tavily_usage
```

This will:

- Create migration file in `prisma/migrations/`
- Apply migration to development database
- Regenerate Prisma Client

#### Step 2: Review Migration

Check the generated SQL:

```sql
-- CreateTable
CREATE TABLE "TavilyUsage" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "TavilyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TavilyUsage_feature_idx" ON "TavilyUsage"("feature");

-- CreateIndex
CREATE INDEX "TavilyUsage_timestamp_idx" ON "TavilyUsage"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "TavilyUsage_feature_timestamp_idx" ON "TavilyUsage"("feature", "timestamp");
```

#### Step 3: Apply to Production

```bash
# Production deployment
npx prisma migrate deploy
```

---

### 3. Test Implementation

Run all test scripts to verify functionality:

```bash
# Test research API
tsx src/scripts/test-tavily-research.ts

# Test extract API
tsx src/scripts/test-tavily-extract.ts

# Test crawl API
tsx src/scripts/test-tavily-crawl.ts

# Test map API
tsx src/scripts/test-tavily-map.ts

# Test monitoring
tsx src/scripts/test-tavily-monitor.ts
```

**Expected Output:**

- ✅ All tests pass
- ✅ No errors
- ✅ Database records created

---

## 🚀 Deployment Steps

### Step 1: Code Deployment

```bash
# Commit changes
git add .
git commit -m "feat: Add Tavily agentic features (research, extract, crawl, map, monitoring)"

# Push to repository
git push origin main
```

### Step 2: Database Migration

```bash
# On production server
npx prisma migrate deploy
```

### Step 3: Restart Services

```bash
# Restart Next.js server
pm2 restart eventflow

# Or with Docker
docker-compose restart
```

### Step 4: Verify Deployment

```bash
# Check database
npx prisma studio

# Check API health
curl https://your-domain.com/api/health

# Check Tavily integration
tsx -e "import { getUsageSummary } from './src/lib/tavily-monitor'; getUsageSummary().then(console.log)"
```

---

## 🔄 Rollback Plan

If issues occur, rollback using:

### Step 1: Revert Code

```bash
git revert HEAD
git push origin main
```

### Step 2: Rollback Database

```bash
# Find migration to rollback
npx prisma migrate status

# Rollback migration
npx prisma migrate resolve --rolled-back <migration-name>
```

### Step 3: Restart Services

```bash
pm2 restart eventflow
```

---

## 📊 Post-Deployment Monitoring

### 1. Check Credit Usage

```bash
# Get current usage
tsx -e "import { getUsageSummary } from './src/lib/tavily-monitor'; getUsageSummary().then(s => console.log(\`Used: \${s.current.totalCredits}/1000 credits (\${s.current.percentUsed.toFixed(1)}%)\`))"
```

### 2. Monitor Logs

```bash
# Check application logs
pm2 logs eventflow

# Check for Tavily errors
pm2 logs eventflow | grep "Tavily"
```

### 3. Database Queries

```sql
-- Check usage records
SELECT
  feature,
  COUNT(*) as call_count,
  SUM(credits) as total_credits
FROM "TavilyUsage"
WHERE timestamp >= date_trunc('month', CURRENT_DATE)
GROUP BY feature
ORDER BY total_credits DESC;

-- Check daily usage
SELECT
  DATE(timestamp) as date,
  SUM(credits) as daily_credits
FROM "TavilyUsage"
WHERE timestamp >= date_trunc('month', CURRENT_DATE)
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

## 🎯 Integration Points

### 1. Content Enricher Agent

**File:** `src/agents/content-enricher.agent.ts`

**Change:** Uses `gatherSourcesWithPriority()` instead of `gatherSources()`

**Behavior:**

- High-priority articles (trendScore > 80): Use Tavily extract
- Low-priority articles (trendScore ≤ 80): Use SearXNG + Jina

**Monitoring:**

```typescript
// Automatic credit tracking
await trackCreditUsage("extract", urlCount, {
  articleId: article.id,
  trendScore: article.trendScore,
});
```

### 2. Weekly Digest (Future)

**Planned Integration:**

```typescript
// Weekly cron job
async function generateWeeklyDigest() {
  const topics = [
    "AI breakthroughs this week",
    "New AI tools and frameworks",
    "AI industry news",
  ];

  const results = await batchResearch(topics, { model: "mini" });

  // Track usage
  await trackCreditUsage("research", topics.length * 10);

  // Generate newsletter
  await generateNewsletter(results);
}
```

---

## 🔍 Troubleshooting

### Issue 1: API Key Not Found

**Error:** `TAVILY_API_KEY is not configured`

**Solution:**

```bash
# Check environment variable
echo $TAVILY_API_KEY

# Add to .env
echo "TAVILY_API_KEY=tvly-xxxxxxxxxxxxx" >> .env

# Restart server
pm2 restart eventflow
```

### Issue 2: Database Migration Failed

**Error:** `Migration failed to apply`

**Solution:**

```bash
# Check migration status
npx prisma migrate status

# Reset database (development only!)
npx prisma migrate reset

# Reapply migrations
npx prisma migrate deploy
```

### Issue 3: Credit Budget Exceeded

**Error:** `⚠️ Tavily credit usage: 85%`

**Solution:**

```typescript
// Check usage
const summary = await getUsageSummary();
console.log(summary.current);

// Adjust priority threshold
const PRIORITY_THRESHOLD = 90; // Increase to reduce Tavily usage

// Or disable Tavily temporarily
const USE_TAVILY = false;
```

### Issue 4: Slow Response Times

**Error:** Research/crawl taking too long

**Solution:**

```typescript
// Reduce maxDepth for crawl
const docs = await crawlDocumentation(url, topic, {
  maxDepth: 1, // Reduce from 2 to 1
});

// Reduce URL count for extract
const extracted = await batchExtract(urls.slice(0, 5)); // Reduce from 10 to 5
```

---

## 📈 Performance Optimization

### 1. Caching

```typescript
// Cache research results
const cacheKey = `research:${topic}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const research = await conductResearch(topic);
await redis.set(cacheKey, JSON.stringify(research), "EX", 3600); // 1 hour
```

### 2. Parallel Processing

```typescript
// Process multiple articles in parallel
const results = await Promise.all(
  articles.map((article) => enrichArticle(article)),
);
```

### 3. Rate Limiting

```typescript
// Limit concurrent Tavily calls
const pLimit = require("p-limit");
const limit = pLimit(5); // Max 5 concurrent calls

const results = await Promise.all(
  urls.map((url) => limit(() => extractUrl(url))),
);
```

---

## 🎓 Training & Documentation

### For Developers

1. Read implementation summary: `.agent/reports/tavily-implementation-summary-2026-02-08.md`
2. Review quick reference: `.agent/reports/tavily-quick-reference.md`
3. Run test scripts to understand functionality
4. Review code in `src/lib/tavily-*.ts`

### For Operations

1. Monitor credit usage daily
2. Set up alerts for 80% usage
3. Review monthly usage reports
4. Adjust priority thresholds as needed

---

## 📞 Support & Resources

**Documentation:**

- Implementation Summary: `.agent/reports/tavily-implementation-summary-2026-02-08.md`
- Quick Reference: `.agent/reports/tavily-quick-reference.md`
- Migration Guide: This file

**Code:**

- Research: `src/lib/tavily-research.ts`
- Extract: `src/lib/tavily-extract.ts`
- Crawl: `src/lib/tavily-crawl.ts`
- Map: `src/lib/tavily-map.ts`
- Monitor: `src/lib/tavily-monitor.ts`

**Tests:**

- `src/scripts/test-tavily-*.ts`

**Tavily Documentation:**

- https://docs.tavily.com

---

## ✅ Deployment Verification

After deployment, verify:

- [ ] Environment variables set
- [ ] Database migration applied
- [ ] Test scripts pass
- [ ] Credit monitoring working
- [ ] Content enricher using priority routing
- [ ] No errors in logs
- [ ] Usage tracking in database

---

**Prepared by:** Kiro AI  
**Date:** 2026-02-08  
**Status:** Ready for Production Deployment 🚀
