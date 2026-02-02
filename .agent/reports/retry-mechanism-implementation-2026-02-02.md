# Retry Mechanism Implementation Report

**Date:** 2026-02-02  
**Status:** ✅ IMPLEMENTED

## 🎯 Problem Statement

**Observed Issue:**

```
Stage 1 (Batch Filter):    20 → 10 articles
Stage 2 (Topic Extract):   10 → 10 articles with topics
Stage 3 (Smart Select):    10 → 4 unique topics (60% duplicate rate)
Stage 4 (Processing):      4 → 0 articles published (100% duplicate rate)
```

**Root Cause:**

- **Stage 3 (Topic-based duplicate check):** Only checks `topic` field in database
- **Stage 4 (URL/Content duplicate check):** More aggressive, checks:
  - Exact URL match
  - Multi-entity + number match
  - Title similarity
  - Content similarity

**Result:** Articles pass Stage 3 but fail Stage 4, leading to 0 publications.

## 💡 Solution Design

### 3-Attempt Retry Strategy

**Attempt 1: Normal Smart Filtering**

- Run smart filtering pipeline (Stages 1-3)
- Select top N unique topics
- Try to publish

**Attempt 2: Exclude Duplicates, Retry**

- If Attempt 1 published 0 articles:
  - Collect all URLs and topics that were duplicates
  - Filter them out from Stage 2 pool (articles with topics)
  - Select next best articles by score
  - Try to publish again

**Attempt 3: Final Attempt**

- If Attempt 2 still published 0 articles:
  - Exclude all previous duplicates
  - Select remaining best articles
  - Final attempt to publish

**Give Up:**

- If all 3 attempts fail → Wait for next scheduled execution

## 🛠️ Implementation

### Code Location

`src/services/agent.service.ts` - Lines ~250-330

### Key Components

**1. Retry Loop:**

```typescript
let published: Array<{ id: string; slug: string }> = [];
let attempt = 1;
const maxAttempts = 3;
const excludedUrls = new Set<string>();
const excludedTopics = new Set<string>();

while (attempt <= maxAttempts && published.length === 0) {
  // Try to publish
  published = await processAndPublishArticles(...);

  if (published.length > 0) {
    break; // Success!
  }

  // Prepare for retry...
}
```

**2. Duplicate Exclusion:**

```typescript
// Collect duplicates from failed attempt
articlesForProcessing.forEach((item) => {
  if (item.article.url) {
    excludedUrls.add(item.article.url);
  }
  if (item.topic) {
    excludedTopics.add(item.topic);
  }
});
```

**3. Remaining Articles Selection:**

```typescript
// Get articles that weren't duplicates
const remainingArticles = filteringResult.stage2_with_topics.filter(
  (article) =>
    !excludedUrls.has(article.url || "") &&
    !excludedTopics.has(article.topic || ""),
);

// Sort by score and take top N
const retryArticles = remainingArticles
  .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0))
  .slice(0, retryCount);
```

## 📊 Expected Behavior

### Scenario 1: Success on First Attempt

```
Attempt 1: 4 articles → 2 published ✅
Result: 2 articles published (no retry needed)
```

### Scenario 2: Success on Second Attempt

```
Attempt 1: 4 articles → 0 published (all duplicates)
  Excluded: 4 URLs, 4 topics
  Remaining: 6 articles from Stage 2 pool

Attempt 2: 4 articles (next best) → 1 published ✅
Result: 1 article published
```

### Scenario 3: Success on Third Attempt

```
Attempt 1: 4 articles → 0 published
  Excluded: 4 URLs, 4 topics

Attempt 2: 4 articles → 0 published
  Excluded: 8 URLs, 8 topics

Attempt 3: 2 articles (remaining) → 1 published ✅
Result: 1 article published
```

### Scenario 4: All Attempts Failed

```
Attempt 1: 4 articles → 0 published
Attempt 2: 4 articles → 0 published
Attempt 3: 2 articles → 0 published
Result: 0 articles published, wait for next execution
```

## 📈 Expected Impact

### Before Retry Mechanism

```
Publication Rate: 0% (when all selected articles are duplicates)
Wasted Opportunities: 6-10 articles in Stage 2 pool never tried
```

### After Retry Mechanism

```
Publication Rate: 5-15% (tries up to 3 times with different articles)
Utilizes Full Pool: Uses all 10 articles from Stage 2 if needed
Success Rate: 70-80% (at least 1 article published per execution)
```

## 🔍 Logging & Monitoring

### Attempt Start

```
============================================================
🔄 ATTEMPT 1/3: Processing articles...
============================================================
   Articles to process: 4
   Excluded URLs: 0
   Excluded topics: 0
```

### Attempt Failed

```
⚠️  Attempt 1 failed: 0 articles published (all duplicates)
🔄 Preparing retry 2/3...

📊 Retry 2 statistics:
   Original pool: 10 articles
   Excluded: 4 URLs, 4 topics
   Remaining: 6 articles
   Selected for retry: 4 articles
```

### Final Result

```
============================================================
✅ FINAL RESULT: 1 haber yayınlandı (2 attempts)
============================================================
```

## 🎯 Benefits

1. **Higher Publication Rate:** Tries multiple times instead of giving up
2. **Better Resource Utilization:** Uses full Stage 2 pool (10 articles)
3. **Intelligent Exclusion:** Learns from duplicates, doesn't retry same articles
4. **Graceful Degradation:** If no articles available, gives up cleanly
5. **Transparent Logging:** Clear visibility into retry process

## 🔗 Integration with Smart Filtering

**Smart Filtering Pipeline:**

```
Stage 1: Batch Filter (20 → 10)
Stage 2: Topic Extract (10 → 10 with topics) ← RETRY POOL
Stage 3: Smart Select (10 → 4 unique topics)
Stage 4: Process & Publish (4 → ? published)
  ↓ If 0 published
Stage 4 Retry 1: (next 4 from Stage 2 pool)
  ↓ If still 0 published
Stage 4 Retry 2: (remaining from Stage 2 pool)
  ↓ If still 0 published
Give Up: Wait for next execution
```

## 📝 Configuration

**Retry Settings:**

- `maxAttempts`: 3 (hardcoded, can be made configurable)
- `retryCount`: Same as `targetCount` (3-5 articles per attempt)
- `excludedUrls`: Set of URLs from failed attempts
- `excludedTopics`: Set of topics from failed attempts

**Future Enhancements:**

- Make `maxAttempts` configurable via database settings
- Add retry delay between attempts (rate limit protection)
- Track retry statistics in AgentLog metadata
- Add retry metrics to admin dashboard

## 🚀 Testing

### Manual Test

```bash
npm run worker:trigger
```

### Expected Log Output

```
Stage 1-3: Smart filtering completes
Attempt 1: 4 articles → 0 published (all duplicates)
Retry 2: 4 articles from remaining pool
Attempt 2: 4 articles → 1 published ✅
Final Result: 1 article published (2 attempts)
```

## 🔗 Related Documents

- [Type Mismatch Fix Report](.agent/reports/type-mismatch-fix-2026-02-02.md)
- [Intelligent Filtering System Design](.agent/reports/intelligent-filtering-system-design.md)
- [Smart Filtering Implementation Summary](.agent/reports/smart-filtering-implementation-summary.md)
- [News Creation System Analysis](.agent/reports/news-creation-system-analysis-detailed-2026-02-02.md)

## ✅ Verification Checklist

- [x] Retry loop implemented (max 3 attempts)
- [x] Duplicate exclusion (URLs + topics)
- [x] Remaining articles selection from Stage 2 pool
- [x] Comprehensive logging for each attempt
- [x] Graceful failure handling
- [x] TypeScript compilation successful
- [ ] Manual testing with worker trigger
- [ ] Monitor production logs for retry behavior
- [ ] Track publication rate improvement

## 📊 Success Metrics

**Target Metrics (After Implementation):**

- Publication rate: 5-15% (up from 0% in worst case)
- Average attempts per execution: 1.5-2.0
- Success rate (at least 1 article): 70-80%
- Retry utilization: 30-40% of executions need retry

**Monitoring:**

- Track `attempt` count in logs
- Monitor "FINAL RESULT" messages
- Count executions with 0 publications
- Measure time impact of retries
