# Tavily Agentic Features Implementation Plan

**Tarih:** 2026-02-08  
**Proje:** AI Haberleri  
**Hedef:** Tavily'nin yeni agentic özelliklerini entegre ederek haber kalitesini artırmak

---

## 🎯 Keşfedilen Yeni Özellikler

### Mevcut Durum

- ✅ `search()` - Basic web search (1-2 credits)
- ❌ `extract()` - URL content extraction (1 credit/URL)
- ❌ `crawl()` - Site-wide crawling (1 credit/page)
- ❌ `map()` - URL discovery (faster than crawl)
- ❌ `research()` - AI-powered research (10-20 credits)

### Yeni Fırsatlar

#### 1. research() API - Deep Research

**Ne Yapar:** AI-synthesized comprehensive research with citations
**Credit Cost:** 10 credits (mini), 20 credits (pro)
**Süre:** 30-120 saniye
**Use Case:** Haber yazmadan önce derin araştırma

#### 2. extract() API - Batch URL Processing

**Ne Yapar:** Extract content from specific URLs (max 20)
**Credit Cost:** 1 credit per URL
**Süre:** 2-5 saniye
**Use Case:** RSS feed URL'lerinden içerik çekme

#### 3. crawl() API - Site-Wide Extraction

**Ne Yapar:** Crawl entire website with semantic instructions
**Credit Cost:** 1 credit per page
**Süre:** Varies (depth-dependent)
**Use Case:** Documentation sites'tan otomatik içerik toplama

#### 4. map() API - URL Discovery

**Ne Yapar:** Discover URLs without extracting content
**Credit Cost:** Cheaper than crawl
**Süre:** Fast
**Use Case:** Site structure discovery

---

## 📊 Credit Management Strategy

### Aylık Budget: 1000 Credits

**Mevcut Kullanım (Tahmini):**

- search() advanced: 2 credits × 50 calls/day = 100 credits/day = 3000 credits/month ❌ OVER BUDGET!

**Optimized Strategy:**

| Feature           | Credits | Daily Usage | Monthly Total | Priority |
| ----------------- | ------- | ----------- | ------------- | -------- |
| search() basic    | 1       | 30 calls    | 900           | HIGH     |
| search() advanced | 2       | 5 calls     | 300           | MEDIUM   |
| extract()         | 1/URL   | 10 URLs     | 300           | HIGH     |
| research() mini   | 10      | 1 call      | 300           | LOW      |
| research() pro    | 20      | 0 calls     | 0             | VERY LOW |
| crawl()           | 1/page  | 0           | 0             | FUTURE   |

**Total Monthly:** ~1800 credits (OVER BUDGET!)

**Optimization:**

1. search() basic için SearXNG fallback kullan (free)
2. search() advanced sadece critical queries için
3. extract() batch processing ile efficiency artır
4. research() sadece weekly digest için (4 calls/month = 40 credits)

**Revised Budget:**

- search() basic: 15 calls/day × 30 days = 450 credits
- search() advanced: 3 calls/day × 30 days = 180 credits
- extract(): 5 URLs/day × 30 days = 150 credits
- research() mini: 1 call/week × 4 weeks = 40 credits
- **Total: 820 credits/month** ✅ UNDER BUDGET

---

## 🚀 Implementation Plan

### Phase 1: research() API Integration (Priority: MEDIUM)

**Hedef:** Weekly digest için comprehensive research

**Dosya:** `src/lib/tavily-research.ts` (YENİ)

**Implementation:**

```typescript
import { TavilyClient } from "tavily-python"; // veya @tavily/core

export interface ResearchResult {
  content: string;
  sources: Array<{ url: string; title: string }>;
  responseTime: number;
}

export async function conductResearch(
  topic: string,
  model: "mini" | "pro" | "auto" = "mini",
): Promise<ResearchResult> {
  const client = new TavilyClient({
    apiKey: process.env.TAVILY_API_KEY,
  });

  // Start research (async)
  const result = await client.research({
    input: topic,
    model,
    stream: false, // Disable streaming for simplicity
    citation_format: "numbered",
  });

  const requestId = result.request_id;

  // Poll until completed
  let response = await client.getResearch(requestId);
  while (response.status !== "completed" && response.status !== "failed") {
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s poll
    response = await client.getResearch(requestId);
  }

  if (response.status === "failed") {
    throw new Error("Research failed");
  }

  return {
    content: response.content,
    sources: response.sources || [],
    responseTime: response.response_time,
  };
}
```

**Use Case:**

```typescript
// Weekly digest generation
const weeklyTopics = [
  "AI breakthroughs this week",
  "New AI tools and frameworks",
  "AI industry news and funding",
];

for (const topic of weeklyTopics) {
  const research = await conductResearch(topic, "mini");
  // Generate newsletter section from research.content
}
```

**Credit Usage:** 10 credits × 3 topics = 30 credits/week = 120 credits/month

**Test:**

```bash
# Test research API
tsx scripts/test-tavily-research.ts
```

---

### Phase 2: extract() Batch Processing (Priority: HIGH)

**Hedef:** RSS feed URL'lerinden efficient content extraction

**Dosya:** `src/lib/tavily-extract.ts` (YENİ)

**Implementation:**

```typescript
import { TavilyClient } from "tavily-python";

export interface ExtractResult {
  url: string;
  content: string;
  failed: boolean;
}

export async function batchExtract(
  urls: string[],
  query?: string,
  chunksPerSource: number = 3,
): Promise<ExtractResult[]> {
  const client = new TavilyClient({
    apiKey: process.env.TAVILY_API_KEY,
  });

  // Batch in groups of 20 (API limit)
  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += 20) {
    batches.push(urls.slice(i, i + 20));
  }

  const allResults: ExtractResult[] = [];

  for (const batch of batches) {
    const response = await client.extract({
      urls: batch,
      query,
      chunks_per_source: chunksPerSource,
      extract_depth: "basic", // Use 'advanced' for JS-heavy pages
    });

    // Map successful results
    for (const result of response.results) {
      allResults.push({
        url: result.url,
        content: result.raw_content,
        failed: false,
      });
    }

    // Map failed results
    for (const failed of response.failed_results || []) {
      allResults.push({
        url: failed.url,
        content: "",
        failed: true,
      });
    }
  }

  return allResults;
}
```

**Integration:** `src/agents/content-enricher.agent.ts`

```typescript
// BEFORE: SearXNG + Jina Reader (slow, unreliable)
const sources = await this.gatherSources(article);

// AFTER: Tavily extract() (fast, reliable)
const candidateUrls = await this.findCandidateUrls(article); // SearXNG for URL discovery
const extracted = await batchExtract(
  candidateUrls.slice(0, 10), // Max 10 URLs
  article.title, // Query for relevance ranking
  3, // 3 chunks per source
);

const sources = extracted
  .filter((e) => !e.failed && e.content.length > 100)
  .map((e) => ({
    title: e.url,
    url: e.url,
    content: e.content,
    relevanceScore: 100,
  }));
```

**Credit Usage:** 10 URLs × 1 credit = 10 credits per article × 3 articles/day = 30 credits/day = 900 credits/month ❌ TOO HIGH!

**Optimization:** Use extract() only for high-priority articles

```typescript
if (article.trendScore > 80) {
  // Use Tavily extract() for high-priority
  const extracted = await batchExtract(urls);
} else {
  // Use SearXNG + Jina Reader for low-priority (free)
  const sources = await this.gatherSourcesSearXNG(article);
}
```

**Revised Credit Usage:** 1 article/day × 10 URLs = 10 credits/day = 300 credits/month ✅

---

### Phase 3: crawl() for Documentation (Priority: LOW)

**Hedef:** AI documentation sites'tan otomatik içerik toplama

**Dosya:** `src/lib/tavily-crawl.ts` (YENİ)

**Implementation:**

```typescript
export async function crawlDocumentation(
  url: string,
  instructions: string,
  maxDepth: number = 2,
): Promise<Array<{ url: string; content: string }>> {
  const client = new TavilyClient({
    apiKey: process.env.TAVILY_API_KEY,
  });

  const response = await client.crawl({
    url,
    max_depth: maxDepth,
    instructions,
    chunks_per_source: 3, // For agentic use
    select_paths: ["/docs/.*", "/api/.*"], // Focus on docs
    exclude_paths: ["/blog/.*"], // Exclude blog
  });

  return response.results.map((r) => ({
    url: r.url,
    content: r.raw_content,
  }));
}
```

**Use Case:**

```typescript
// Crawl OpenAI docs for new features
const docs = await crawlDocumentation(
  "https://platform.openai.com/docs",
  "Find new API features and updates",
  2,
);

// Generate news article from docs
const article = await synthesizeArticle(docs);
```

**Credit Usage:** ~50 pages × 1 credit = 50 credits per crawl

**Frequency:** Weekly (4 crawls/month = 200 credits/month)

---

### Phase 4: map() for Site Discovery (Priority: LOW)

**Hedef:** Site structure discovery before crawling

**Dosya:** `src/lib/tavily-map.ts` (YENİ)

**Implementation:**

```typescript
export async function mapSite(
  url: string,
  instructions: string,
  maxDepth: number = 2,
): Promise<string[]> {
  const client = new TavilyClient({
    apiKey: process.env.TAVILY_API_KEY,
  });

  const response = await client.map({
    url,
    max_depth: maxDepth,
    instructions,
  });

  return response.results; // Array of URLs
}
```

**Use Case:**

```typescript
// Discover API docs URLs
const apiUrls = await mapSite(
  "https://docs.example.com",
  "Find all API documentation pages",
  2,
);

// Then extract content from discovered URLs
const extracted = await batchExtract(apiUrls.slice(0, 20));
```

**Credit Usage:** Cheaper than crawl (exact cost TBD)

---

## 📋 Implementation Checklist

### Phase 1: research() API ✅

- [ ] Create `src/lib/tavily-research.ts`
- [ ] Implement `conductResearch()` function
- [ ] Add weekly digest generation
- [ ] Test with `scripts/test-tavily-research.ts`
- [ ] Monitor credit usage

### Phase 2: extract() Batch Processing ✅

- [ ] Create `src/lib/tavily-extract.ts`
- [ ] Implement `batchExtract()` function
- [ ] Integrate with `content-enricher.agent.ts`
- [ ] Add priority-based routing (Tavily vs SearXNG)
- [ ] Test with `scripts/test-tavily-extract.ts`
- [ ] Monitor credit usage

### Phase 3: crawl() Documentation ⏳

- [ ] Create `src/lib/tavily-crawl.ts`
- [ ] Implement `crawlDocumentation()` function
- [ ] Add weekly documentation crawl job
- [ ] Test with `scripts/test-tavily-crawl.ts`
- [ ] Monitor credit usage

### Phase 4: map() Site Discovery ⏳

- [ ] Create `src/lib/tavily-map.ts`
- [ ] Implement `mapSite()` function
- [ ] Integrate with crawl workflow
- [ ] Test with `scripts/test-tavily-map.ts`

---

## 🔍 Credit Monitoring

**Dashboard Metrics:**

- Daily credit usage by feature
- Monthly credit burn rate
- Credit remaining
- Alert when >80% used

**Implementation:** `src/lib/tavily-monitor.ts`

```typescript
export async function trackCreditUsage(
  feature: "search" | "extract" | "crawl" | "research",
  credits: number,
) {
  await db.tavilyUsage.create({
    data: {
      feature,
      credits,
      timestamp: new Date(),
    },
  });

  // Check monthly total
  const monthlyTotal = await db.tavilyUsage.aggregate({
    where: {
      timestamp: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    _sum: { credits: true },
  });

  if (monthlyTotal._sum.credits! > 800) {
    console.warn("⚠️ Tavily credit usage >80%");
    // Send alert
  }
}
```

---

## 🚀 Deployment Strategy

### Week 1: research() API

- Implement research() integration
- Test with weekly digest
- Monitor credit usage

### Week 2: extract() Batch Processing

- Implement extract() integration
- A/B test: Tavily vs SearXNG
- Optimize priority routing

### Week 3: Monitoring & Optimization

- Add credit monitoring dashboard
- Optimize credit usage
- Fine-tune priority thresholds

### Week 4: crawl() & map() (Optional)

- Implement if credits allow
- Test documentation crawling
- Evaluate ROI

---

**Hazırlayan:** Kiro AI  
**Tarih:** 2026-02-08  
**Durum:** Ready for Implementation
