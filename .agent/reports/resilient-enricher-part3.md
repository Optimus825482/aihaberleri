# Resilient Content Enricher Agent - Part 3: Error Recovery & Performance

## 4. ERROR RECOVERY MECHANISM

### Current (No Recovery)

```typescript
// Single failure = complete failure
const enriched = await enrichArticle(article);
if (!enriched) throw new Error("Failed");
```

### New (Retry + Skip)

```typescript
async function enrichWithRetry(article: UniqueArticle, attempt = 1) {
  const MAX_ATTEMPTS = 2;

  try {
    return await enrichWithDegradation(article);
  } catch (error) {
    logger.warn(`Attempt ${attempt} failed: ${error.message}`);

    if (attempt < MAX_ATTEMPTS) {
      // Retry with exponential backoff
      await sleep(1000 * attempt);
      return enrichWithRetry(article, attempt + 1);
    }

    // After 2 attempts, use emergency template
    logger.error(`All attempts failed, using emergency template`);
    return generateTemplateContent(article);
  }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    // If circuit is OPEN, use fallback immediately
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = "HALF_OPEN"; // Try again after 1 minute
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      return fallback();
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= 3) {
      this.state = "OPEN"; // Stop trying after 3 failures
    }
  }
}

// Usage
const tavilyBreaker = new CircuitBreaker();
const jinaBreaker = new CircuitBreaker();

const sources = await tavilyBreaker.execute(
  () => fetchTavilySources(article),
  () => [], // Fallback to empty array
);
```

---

## 5. PERFORMANCE OPTIMIZATION

### Current (Overload)

```typescript
// Process 4 articles in parallel
const results = await Promise.all(
  articles.map((article) => enrichArticle(article)),
);
// Problem: All 4 hit APIs simultaneously → Rate limits
```

### New (Controlled Concurrency)

```typescript
async function enrichWithConcurrencyLimit(
  articles: UniqueArticle[],
  concurrency = 2,
) {
  const results: EnrichedArticle[] = [];

  // Process in batches of 2
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);

    logger.info(
      `Processing batch ${i / concurrency + 1}: ${batch.length} articles`,
    );

    const batchResults = await Promise.allSettled(
      batch.map((article) => enrichWithRetry(article)),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    // Small delay between batches to avoid rate limits
    if (i + concurrency < articles.length) {
      await sleep(2000); // 2s delay
    }
  }

  return results;
}
```

### Caching Strategy

```typescript
// Cache successful patterns to avoid redundant API calls
const sourceCache = new Map<string, Source[]>();

async function getCachedSources(article: UniqueArticle) {
  const cacheKey = `${article.title.substring(0, 50)}`;

  if (sourceCache.has(cacheKey)) {
    logger.info(`Cache hit for: ${cacheKey}`);
    return sourceCache.get(cacheKey)!;
  }

  const sources = await gatherSources(article);
  sourceCache.set(cacheKey, sources);

  // Expire cache after 1 hour
  setTimeout(() => sourceCache.delete(cacheKey), 3600000);

  return sources;
}
```
