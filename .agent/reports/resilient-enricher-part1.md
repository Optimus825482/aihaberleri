# Resilient Content Enricher Agent - Part 1: Architecture

## 🎯 PROBLEM STATEMENT

**Current Failure Rate:** 100% (0/4 articles enriched)

**Log Evidence:**

```
❌ [content-enricher] ❌ [1] Failed to enrich: We may see Apple's new iPads...
❌ [content-enricher] ❌ [2] Failed to enrich: What I Am Doing to Stay Relevant...
❌ [content-enricher] ❌ [3] Failed to enrich: New York is considering two bills...
❌ [content-enricher] ❌ [4] Failed to enrich: Jeffrey Epstein Had a Bizarre...
✅ [content-enricher] 🏁 PARALLEL enrichment complete: 0/4 articles (4 failed)
```

**Root Causes:**

1. **Insufficient sources:** SearXNG returns 0 results
2. **Timeout failures:** Jina Reader (10s), Tavily (15s) not enough
3. **LLM synthesis fails:** DeepSeek/Gemini errors
4. **No recovery:** Single failure = complete failure
5. **Parallel overload:** 4 articles simultaneously overwhelming APIs

---

## 1. NEW ARCHITECTURE: 4-LAYER FALLBACK

### Current (Fragile)

```
SearXNG → Jina → LLM → ✅ or ❌
```

### New (Resilient)

```
┌─────────────────────────────────────────┐
│ Layer 1: Tavily (High Priority)        │
│ - trendScore > 80                       │
│ - Timeout: 20s                          │
│ - Target: 5-8 sources                   │
└─────────────────────────────────────────┘
         ↓ (if fail or low priority)
┌─────────────────────────────────────────┐
│ Layer 2: SearXNG + Jina (Standard)     │
│ - Parallel search                       │
│ - Timeout: 25s                          │
│ - Target: 3-5 sources                   │
└─────────────────────────────────────────┘
         ↓ (if < 2 sources)
┌─────────────────────────────────────────┐
│ Layer 3: Original Article (Fallback)   │
│ - Use article.description               │
│ - Minimal enrichment                    │
│ - Timeout: 30s                          │
└─────────────────────────────────────────┘
         ↓ (if LLM fails)
┌─────────────────────────────────────────┐
│ Layer 4: Template-Based (Emergency)    │
│ - No LLM, pure template                 │
│ - Guaranteed success                    │
│ - Instant response                      │
└─────────────────────────────────────────┘
```

**Guarantee:** ALWAYS produce output, never fail completely
