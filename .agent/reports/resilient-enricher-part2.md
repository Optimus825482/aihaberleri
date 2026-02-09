# Resilient Content Enricher Agent - Part 2: Implementation Details

## 2. TIMEOUT CONFIGURATION (Aggressive)

### Current Timeouts (Too Generous)

```typescript
JINA_TIMEOUT = 10000;           // 10s
TAVILY_TIMEOUT = 15000;         // 15s
Source gathering: 30000;        // 30s
Content synthesis: 45000;       // 45s
A/B test: 10000;                // 10s
TOTAL per article: ~95s         // Too slow!
```

### New Timeouts (Aggressive)

```typescript
// API Timeouts
JINA_TIMEOUT = 8000; // 8s (reduced from 10s)
TAVILY_TIMEOUT = 12000; // 12s (reduced from 15s)
SEARXNG_TIMEOUT = 5000; // 5s (new)

// Layer Timeouts
LAYER_1_TIMEOUT = 20000; // 20s (Tavily priority)
LAYER_2_TIMEOUT = 25000; // 25s (SearXNG + Jina)
LAYER_3_TIMEOUT = 30000; // 30s (LLM synthesis)
LAYER_4_TIMEOUT = 5000; // 5s (Template)

// Total per article
MAX_ARTICLE_TIMEOUT = 60000; // 60s HARD LIMIT
```

**Rationale:**

- Faster fail = faster fallback
- 60s max ensures 4 articles complete in 4 minutes
- Circuit breaker prevents cascading failures

---

## 3. GRACEFUL DEGRADATION STRATEGY

### Quality Levels

| Sources | Quality Level | Action                        |
| ------- | ------------- | ----------------------------- |
| 5+      | EXCELLENT     | Full enrichment (Layer 1/2)   |
| 3-4     | GOOD          | Standard enrichment (Layer 2) |
| 1-2     | ACCEPTABLE    | Minimal enrichment (Layer 3)  |
| 0       | EMERGENCY     | Template-based (Layer 4)      |

### Implementation

```typescript
async function enrichWithDegradation(article: UniqueArticle) {
  let sources: Source[] = [];
  let qualityLevel: string;

  // Layer 1: Try Tavily (high-priority only)
  if (article.trendScore > 80) {
    sources = await tryTavily(article).catch(() => []);
    if (sources.length >= 5) {
      qualityLevel = "EXCELLENT";
      return synthesizeContent(article, sources, qualityLevel);
    }
  }

  // Layer 2: Try SearXNG + Jina
  const additionalSources = await trySearXNGJina(article).catch(() => []);
  sources.push(...additionalSources);

  if (sources.length >= 3) {
    qualityLevel = "GOOD";
    return synthesizeContent(article, sources, qualityLevel);
  }

  // Layer 3: Use original article
  if (sources.length >= 1 || article.description) {
    qualityLevel = "ACCEPTABLE";
    sources.push({
      title: article.title,
      url: article.url,
      content: article.description || "",
      relevanceScore: 100,
    });
    return synthesizeContent(article, sources, qualityLevel);
  }

  // Layer 4: Emergency template
  qualityLevel = "EMERGENCY";
  return generateTemplateContent(article);
}
```
