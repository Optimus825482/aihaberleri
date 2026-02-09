# Resilient Content Enricher Agent - Part 4: Code Changes & Implementation

## 6. CODE CHANGES NEEDED

### File 1: `src/agents/content-enricher.agent.ts`

#### Change 1: Add Circuit Breakers (Top of file)

```typescript
// Add after imports
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = "HALF_OPEN";
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = "CLOSED";
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();
      if (this.failures >= 3) this.state = "OPEN";
      return fallback();
    }
  }
}

const tavilyBreaker = new CircuitBreaker();
const jinaBreaker = new CircuitBreaker();
const llmBreaker = new CircuitBreaker();
```

#### Change 2: Update Timeout Constants

```typescript
// Replace existing constants
const JINA_TIMEOUT = 8000; // Reduced from 10s
const TAVILY_TIMEOUT = 12000; // Reduced from 15s
const SEARXNG_TIMEOUT = 5000; // New
const LAYER_1_TIMEOUT = 20000; // New
const LAYER_2_TIMEOUT = 25000; // New
const LAYER_3_TIMEOUT = 30000; // New
const MAX_ARTICLE_TIMEOUT = 60000; // New
const TARGET_SOURCE_COUNT = 3; // Reduced from 5
```

#### Change 3: Replace `process()` Method

```typescript
protected async process(job: Job<UniqueArticle[]>): Promise<AgentResult<EnrichedArticle[]>> {
  const articles = job.data;
  const startTime = Date.now();

  this.logger.info(`Enriching ${articles.length} articles with resilient strategy...`);

  if (articles.length === 0) {
    return {
      success: true,
      data: [],
      skipNextQueue: true,
      metrics: { processingTime: Date.now() - startTime, apiCalls: 0, tokensUsed: 0, itemsProcessed: 0 }
    };
  }

  try {
    // CONTROLLED CONCURRENCY: Process 2 articles at a time
    const enrichedArticles = await this.enrichWithConcurrencyLimit(articles, 2);

    this.logger.success(`🏁 Enrichment complete: ${enrichedArticles.length}/${articles.length} articles`);

    return {
      success: true,
      data: enrichedArticles,
      nextQueue: QUEUE_NAMES.ARTICLES_WITH_VISUALS,
      metrics: {
        processingTime: Date.now() - startTime,
        apiCalls: enrichedArticles.length * 8,
        tokensUsed: enrichedArticles.length * 12500,
        itemsProcessed: enrichedArticles.length
      }
    };
  } catch (error) {
    this.logger.error("Content enrichment failed:", this.serializeError(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metrics: { processingTime: Date.now() - startTime, apiCalls: 0, tokensUsed: 0, itemsProcessed: 0 }
    };
  }
}
```

#### Change 4: Add New Methods

```typescript
// Add these new methods to ContentEnricherAgent class

private async enrichWithConcurrencyLimit(
  articles: UniqueArticle[],
  concurrency: number
): Promise<EnrichedArticle[]> {
  const results: EnrichedArticle[] = [];

  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    this.logger.info(`Processing batch ${Math.floor(i / concurrency) + 1}: ${batch.length} articles`);

    const batchResults = await Promise.allSettled(
      batch.map((article, idx) => this.enrichWithRetry(article, i + idx + 1, articles.length))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    if (i + concurrency < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}
```
