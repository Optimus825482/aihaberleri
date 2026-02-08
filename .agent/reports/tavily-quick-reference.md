# Tavily Agentic Features - Quick Reference

**Tarih:** 2026-02-08

---

## 🚀 Quick Start

### 1. research() - Deep Research

```typescript
import { conductResearch } from "@/lib/tavily-research";

const research = await conductResearch("Latest AI breakthroughs in 2026", {
  model: "mini",
  citationFormat: "numbered",
});

console.log(research.content); // AI-synthesized research
console.log(research.sources); // Citations
```

**Cost:** 10 credits (mini), 20 credits (pro)  
**Time:** 30-120 seconds

---

### 2. extract() - Batch URL Extraction

```typescript
import { batchExtract } from "@/lib/tavily-extract";

const urls = ["https://example.com/article1", "https://example.com/article2"];

const results = await batchExtract(urls, {
  query: "AI news",
  chunksPerSource: 3,
});

const successful = results.filter((r) => !r.failed);
```

**Cost:** 1 credit per URL  
**Time:** 2-5 seconds  
**Limit:** 20 URLs per batch

---

### 3. crawl() - Site-Wide Crawling

```typescript
import { crawlDocumentation } from "@/lib/tavily-crawl";

const docs = await crawlDocumentation(
  "https://platform.openai.com/docs",
  "Find new API features",
  { maxDepth: 2 },
);

console.log(`Found ${docs.totalPages} pages`);
```

**Cost:** 1 credit per page  
**Time:** Varies by depth

---

### 4. map() - URL Discovery

```typescript
import { mapSite } from "@/lib/tavily-map";
import { batchExtract } from "@/lib/tavily-extract";

// Step 1: Discover URLs
const mapResult = await mapSite(url, {
  instructions: "Find API docs",
  selectPaths: ["/docs/.*"],
});

// Step 2: Extract content
const extracted = await batchExtract(mapResult.urls.slice(0, 20));
```

**Cost:** Cheaper than crawl  
**Time:** Fast

---

### 5. Credit Monitoring

```typescript
import { trackCreditUsage, getUsageSummary } from "@/lib/tavily-monitor";

// Track usage
await trackCreditUsage("extract", 10, { urls: 10 });

// Get summary
const summary = await getUsageSummary();
console.log(`Used: ${summary.current.percentUsed}%`);
```

---

## 📊 Credit Costs

| Feature           | Cost               | Use Case               |
| ----------------- | ------------------ | ---------------------- |
| search() basic    | 1 credit           | Basic web search       |
| search() advanced | 2 credits          | Deep search            |
| extract()         | 1 credit/URL       | URL content extraction |
| research() mini   | 10 credits         | AI research (mini)     |
| research() pro    | 20 credits         | AI research (pro)      |
| crawl()           | 1 credit/page      | Site-wide crawling     |
| map()             | Cheaper than crawl | URL discovery          |

**Monthly Budget:** 1000 credits

---

## 🎯 Best Practices

### 1. Priority-Based Routing

```typescript
// High-priority: Use Tavily
if (article.trendScore > 80) {
  const results = await batchExtract(urls);
}
// Low-priority: Use free alternatives
else {
  const results = await searxngSearch(query);
}
```

### 2. Budget Checking

```typescript
import { checkBudget } from "@/lib/tavily-monitor";

if (await checkBudget(10)) {
  // Proceed with operation
  const results = await batchExtract(urls);
} else {
  // Use fallback
  console.warn("Budget exceeded, using fallback");
}
```

### 3. Error Handling

```typescript
try {
  const results = await batchExtract(urls);
  const successful = results.filter((r) => !r.failed);

  if (successful.length === 0) {
    // All failed, use fallback
  }
} catch (error) {
  console.error("Tavily error:", error);
  // Use fallback
}
```

### 4. Quality Filtering

```typescript
import { filterQualityResults } from "@/lib/tavily-extract";

const results = await batchExtract(urls);
const quality = filterQualityResults(results, 200); // Min 200 chars
```

---

## 🧪 Testing

```bash
# Test all features
tsx src/scripts/test-tavily-research.ts
tsx src/scripts/test-tavily-extract.ts
tsx src/scripts/test-tavily-crawl.ts
tsx src/scripts/test-tavily-map.ts
tsx src/scripts/test-tavily-monitor.ts
```

---

## 📦 Database Setup

```bash
# Generate migration
npx prisma migrate dev --name add_tavily_usage

# Apply to production
npx prisma migrate deploy
```

---

## 🔍 Monitoring

```bash
# Check current usage
tsx -e "import { getUsageSummary } from './src/lib/tavily-monitor'; getUsageSummary().then(s => console.log(\`Used: \${s.current.percentUsed}%\`))"
```

---

## 💡 Common Patterns

### Pattern 1: Map + Extract Workflow

```typescript
// Discover URLs (cheap)
const mapResult = await mapSite(url, { instructions: "Find docs" });

// Filter relevant URLs
const apiUrls = filterUrls(mapResult.urls, [/\/api\//]);

// Extract content (targeted)
const extracted = await batchExtract(apiUrls.slice(0, 20));
```

### Pattern 2: Weekly Research Digest

```typescript
const topics = [
  "AI breakthroughs this week",
  "New AI tools and frameworks",
  "AI industry news",
];

const results = await batchResearch(topics, { model: "mini" });

// Generate newsletter from results
```

### Pattern 3: Priority-Based Content Enrichment

```typescript
async function enrichArticle(article) {
  if (article.trendScore > 80) {
    // High-priority: Use Tavily extract
    const urls = await findCandidateUrls(article);
    const sources = await batchExtract(urls.slice(0, 10));
    await trackCreditUsage("extract", 10);
  } else {
    // Low-priority: Use free alternatives
    const sources = await searxngSearch(article.title);
  }

  return sources;
}
```

---

## 🚨 Alerts

Automatic alerts trigger at:

- **80% usage:** Warning alert
- **90% usage:** Critical alert
- **Projected overage:** Budget warning

---

## 📞 Support

**Documentation:** `.agent/reports/tavily-implementation-summary-2026-02-08.md`  
**Test Scripts:** `src/scripts/test-tavily-*.ts`  
**Implementation:** `src/lib/tavily-*.ts`

---

**Last Updated:** 2026-02-08
