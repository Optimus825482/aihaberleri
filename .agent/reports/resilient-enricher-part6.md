# Resilient Content Enricher Agent - Part 6: Helper Methods & Templates

## 6. CODE CHANGES (Continued)

### Add Helper Methods

```typescript
private async gatherSourcesSearXNGOnly(article: UniqueArticle): Promise<
  Array<{ title: string; url: string; content: string; relevanceScore: number }>
> {
  const sources: Array<{ title: string; url: string; content: string; relevanceScore: number }> = [];
  const seenUrls = new Set<string>();
  seenUrls.add(this.normalizeUrl(article.url));

  const keywords = this.extractSearchKeywords(article.title, article.description);

  this.logger.info(`🔍 SearXNG-only search: "${keywords}"`);

  const candidateUrls: Array<{ title: string; url: string; relevanceScore: number }> = [];

  try {
    const searchResults = await Promise.race([
      searxngSearch(keywords, { count: 8, time_range: 'week', categories: 'general,news' }),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('SearXNG timeout')), SEARXNG_TIMEOUT)
      )
    ]);

    for (const result of searchResults) {
      if (candidateUrls.length >= 8) break;

      const normalizedUrl = this.normalizeUrl(result.url);
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);

      if (this.shouldSkipUrl(result.url)) continue;

      const relevanceScore = this.calculateRelevanceScoreSearXNG(result, article.title);

      if (relevanceScore >= 30) {
        candidateUrls.push({ title: result.title, url: result.url, relevanceScore });
      }
    }
  } catch (error: any) {
    this.logger.warn(`SearXNG search failed: ${error.message}`);
    return [];
  }

  candidateUrls.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topCandidates = candidateUrls.slice(0, TARGET_SOURCE_COUNT);

  this.logger.info(`📖 Reading ${topCandidates.length} URLs with Jina...`);

  const contentResults = await Promise.allSettled(
    topCandidates.map(async (candidate) => {
      const content = await this.readUrlContent(candidate.url);
      return { ...candidate, content };
    })
  );

  for (const result of contentResults) {
    if (result.status === 'fulfilled' && result.value.content && result.value.content.length > 100) {
      sources.push({
        title: result.value.title,
        url: result.value.url,
        content: result.value.content,
        relevanceScore: result.value.relevanceScore
      });
    }
  }

  this.logger.info(`✅ SearXNG + Jina: ${sources.length} sources`);
  return sources;
}

private generateTemplateContent(
  article: UniqueArticle,
  sources: Array<{ title: string; url: string; content: string; relevanceScore: number }> = []
): EnrichedArticle {
  this.logger.warn(`Generating template-based content for: ${article.title}`);

  const category = article.suggestedCategory || 'teknoloji';
  const description = article.description || article.title;

  // Turkish template
  const trTitle = article.title;
  const trExcerpt = description.substring(0, 200);
  const trContent = `
<p>${description}</p>
<h2>Detaylar</h2>
<p>Bu haber ${category} kategorisinde yayınlanmıştır. Daha fazla bilgi için kaynak siteyi ziyaret edebilirsiniz.</p>
<p><strong>Kaynak:</strong> <a href="${article.url}" target="_blank" rel="noopener nofollow">${new URL(article.url).hostname}</a></p>
${sources.length > 0 ? `<h2>İlgili Kaynaklar</h2><ul>${sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener nofollow">${s.title}</a></li>`).join('')}</ul>` : ''}
`;

  // English template
  const enTitle = article.title;
  const enExcerpt = description.substring(0, 200);
  const enContent = `
<p>${description}</p>
<h2>Details</h2>
<p>This news article is published in the ${category} category. For more information, please visit the source website.</p>
<p><strong>Source:</strong> <a href="${article.url}" target="_blank" rel="noopener nofollow">${new URL(article.url).hostname}</a></p>
${sources.length > 0 ? `<h2>Related Sources</h2><ul>${sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener nofollow">${s.title}</a></li>`).join('')}</ul>` : ''}
`;

  const keywords = this.extractSearchKeywords(article.title, description).split(' ').slice(0, 6);

  return {
    ...article,
    sources: sources.length > 0 ? sources : [{
      title: article.title,
      url: article.url,
      content: description,
      relevanceScore: 100
    }],
    synthesizedContent: {
      tr: {
        title: trTitle,
        excerpt: trExcerpt,
        content: trContent,
        keywords,
        metaDescription: trExcerpt.substring(0, 160),
        score: 500 // Low score for template content
      },
      en: {
        title: enTitle,
        excerpt: enExcerpt,
        content: enContent,
        keywords,
        metaDescription: enExcerpt.substring(0, 160)
      }
    }
  };
}
```

---

## 7. IMPLEMENTATION PLAN

### Phase 1: Preparation (15 minutes)

1. ✅ Backup current `content-enricher.agent.ts`
2. ✅ Review all code changes
3. ✅ Test circuit breaker logic locally

### Phase 2: Implementation (30 minutes)

1. Add CircuitBreaker class (top of file)
2. Update timeout constants
3. Replace `process()` method
4. Add `enrichWithConcurrencyLimit()` method
5. Add `enrichWithRetry()` method
6. Add `enrichWithDegradation()` method
7. Add `synthesizeWithFallback()` method
8. Add `gatherSourcesSearXNGOnly()` method
9. Add `generateTemplateContent()` method

### Phase 3: Testing (20 minutes)

1. Test with 1 article (verify all layers work)
2. Test with 4 articles (verify concurrency limit)
3. Test timeout scenarios (force failures)
4. Test emergency template (remove API keys)

### Phase 4: Deployment (10 minutes)

1. Commit changes
2. Deploy to production
3. Monitor logs for first 30 minutes
4. Verify success rate > 80%
