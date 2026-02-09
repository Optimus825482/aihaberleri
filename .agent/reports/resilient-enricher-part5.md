# Resilient Content Enricher Agent - Part 5: Core Logic Implementation

## 6. CODE CHANGES (Continued)

### Add Core Enrichment Methods

```typescript
private async enrichWithRetry(
  article: UniqueArticle,
  articleNum: number,
  total: number,
  attempt: number = 1
): Promise<EnrichedArticle> {
  const MAX_ATTEMPTS = 2;

  this.logger.info(`[${articleNum}/${total}] Enriching (attempt ${attempt}): ${article.title.substring(0, 50)}...`);

  try {
    // Wrap entire enrichment in timeout
    return await Promise.race([
      this.enrichWithDegradation(article, articleNum, total),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Article timeout (60s)')), MAX_ARTICLE_TIMEOUT)
      )
    ]);
  } catch (error: any) {
    this.logger.warn(`[${articleNum}] Attempt ${attempt} failed: ${error.message}`);

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      return this.enrichWithRetry(article, articleNum, total, attempt + 1);
    }

    // Emergency fallback
    this.logger.error(`[${articleNum}] All attempts failed, using emergency template`);
    return this.generateTemplateContent(article);
  }
}

private async enrichWithDegradation(
  article: UniqueArticle,
  articleNum: number,
  total: number
): Promise<EnrichedArticle> {
  let sources: Array<{ title: string; url: string; content: string; relevanceScore: number }> = [];
  let qualityLevel: string;

  // Layer 1: Tavily (high-priority only)
  if ((article.trendScore || 0) > 80) {
    this.logger.info(`[${articleNum}] Layer 1: Trying Tavily (high-priority)`);
    sources = await tavilyBreaker.execute(
      async () => {
        const result = await Promise.race([
          this.gatherSourcesWithPriority(article),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Layer 1 timeout')), LAYER_1_TIMEOUT)
          )
        ]);
        return result;
      },
      () => []
    );

    if (sources.length >= 5) {
      qualityLevel = 'EXCELLENT';
      this.logger.success(`[${articleNum}] Layer 1 success: ${sources.length} sources (EXCELLENT)`);
      return this.synthesizeWithFallback(article, sources, qualityLevel, articleNum);
    }
  }

  // Layer 2: SearXNG + Jina
  this.logger.info(`[${articleNum}] Layer 2: Trying SearXNG + Jina`);
  const additionalSources = await jinaBreaker.execute(
    async () => {
      const result = await Promise.race([
        this.gatherSourcesSearXNGOnly(article),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Layer 2 timeout')), LAYER_2_TIMEOUT)
        )
      ]);
      return result;
    },
    () => []
  );

  sources.push(...additionalSources);

  if (sources.length >= 3) {
    qualityLevel = 'GOOD';
    this.logger.success(`[${articleNum}] Layer 2 success: ${sources.length} sources (GOOD)`);
    return this.synthesizeWithFallback(article, sources, qualityLevel, articleNum);
  }

  // Layer 3: Original article content
  this.logger.info(`[${articleNum}] Layer 3: Using original article content`);
  if (sources.length >= 1 || article.description) {
    qualityLevel = 'ACCEPTABLE';
    sources.push({
      title: article.title,
      url: article.url,
      content: article.description || article.title,
      relevanceScore: 100
    });
    this.logger.success(`[${articleNum}] Layer 3: ${sources.length} sources (ACCEPTABLE)`);
    return this.synthesizeWithFallback(article, sources, qualityLevel, articleNum);
  }

  // Layer 4: Emergency template
  this.logger.warn(`[${articleNum}] Layer 4: Emergency template (no sources)`);
  return this.generateTemplateContent(article);
}

private async synthesizeWithFallback(
  article: UniqueArticle,
  sources: Array<{ title: string; url: string; content: string; relevanceScore: number }>,
  qualityLevel: string,
  articleNum: number
): Promise<EnrichedArticle> {
  try {
    const synthesized = await llmBreaker.execute(
      async () => {
        return await Promise.race([
          this.synthesizeContent(article, sources, article.suggestedCategory || 'teknoloji'),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('LLM timeout')), LAYER_3_TIMEOUT)
          )
        ]);
      },
      () => {
        throw new Error('LLM circuit breaker open');
      }
    );

    // Try A/B test (optional, can fail silently)
    let titleABTest: TitleABTestData | undefined;
    try {
      const variants = await Promise.race([
        generateTitleVariants(synthesized.tr.content, article.suggestedCategory || 'teknoloji'),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('A/B timeout')), 5000))
      ]);
      titleABTest = initializeABTestData(variants);
    } catch {
      // Silent fail for A/B test
    }

    return {
      ...article,
      sources,
      synthesizedContent: synthesized,
      titleABTest
    };
  } catch (error: any) {
    this.logger.warn(`[${articleNum}] LLM synthesis failed: ${error.message}, using template`);
    return this.generateTemplateContent(article, sources);
  }
}
```
