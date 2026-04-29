/**
 * Pipeline Type Contracts — Strict TypeScript Interface Chain
 *
 * CANONICAL PIPELINE FLOW:
 * CollectedArticle
 *   → DeduplicatedArticle
 *   → ScoredArticle
 *   → TrendEnrichedArticle (runtime queue stage / no additional type today)
 *   → ArticleWithSources
 *   → SynthesizedArticle
 *   → EnrichedArticle
 *   → ArticleWithVisuals
 *   → ArticleWithSEO
 *   → PublishedArticle
 *
 * Pipeline type flow (current canonical runtime order):
 * CollectedArticle
 *   → DeduplicatedArticle
 *   → ScoredArticle
 *   → TrendEnrichedArticle
 *   → ArticleWithSources
 *   → SynthesizedArticle
 *   → EnrichedArticle
 *   → ArticleWithVisuals
 *   → ArticleWithSEO
 *   → PublishedArticle
 *
 * Queue / type alignment:
 * - UNIQUE_ARTICLES → DeduplicatedArticle
 * - RELEVANT_ARTICLES → ScoredArticle
 * - TREND_ENRICHMENT → TrendEnrichedArticle
 * - ENRICHED_ARTICLES → ArticleWithSources
 * - CONTENT_SYNTHESIS → SynthesizedArticle
 * - CONTENT_VALIDATION → EnrichedArticle
 * - ARTICLES_WITH_VISUALS → ArticleWithVisuals
 * - SEO_OPTIMIZATION → ArticleWithSEO
 * - DATABASE_PUBLISHER → PublishedArticle
 *
 * QUEUE / TYPE ALIGNMENT:
 * ContentCollector      → CollectedArticle
 * DuplicateDetector     → DeduplicatedArticle
 * RelevanceFilter       → ScoredArticle
 * TrendEnricher         → ScoredArticle (trendScore enriched at runtime)
 * SourceGatherer        → ArticleWithSources
 * ContentSynthesizer    → SynthesizedArticle
 * ContentValidator      → EnrichedArticle
 * VisualGenerator       → ArticleWithVisuals
 * SEOOptimizer          → ArticleWithSEO
 * DatabasePublisher     → PublishedArticle
 *
 * RE-ENRICH LOOP:
 * DatabasePublisher rejects → PipelineReEnrichPayload → SourceGatherer (aggressive mode)
 *
 * REPLACES: All `as any` casts for inter-agent metadata.
 */

// ─────────────────────────────────────────────────────────────────────────────
// RE-ENRICHMENT METADATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata added by DatabasePublisher when an article fails a quality gate
 * and is re-queued to ContentEnricher (now SourceGatherer) for a deeper pass.
 */
export interface ReEnrichMetadata {
  /** Forces aggressive multi-service source gathering (Exa, Firecrawl, Google News wide-net) */
  _forceReEnrich?: boolean;
  /** Why the article was rejected: english_title | dictionary_content | low_quality | missing_content | emergency_template */
  _rejectionReason?: string;
  /** How many times this article has been re-enriched (max: 3 in DatabasePublisher) */
  _retryCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A single external source gathered for article enrichment */
export interface ArticleSource {
  title: string;
  url: string;
  content: string;
  relevanceScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHESIZED CONTENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Result of TR content synthesis by LLM */
export interface SynthesizedContentTR {
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
  metaTitle?: string;
  /** Quality score assigned by the LLM (0-100). Used by DatabasePublisher for quality gate. */
  score: number;
}

/** Result of EN content synthesis by LLM */
export interface SynthesizedContentEN {
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
  metaTitle?: string;
}

/** Combined bilingual synthesis output */
export interface SynthesizedContent {
  tr: SynthesizedContentTR;
  en: SynthesizedContentEN;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STAGE OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Output of SourceGatherer agent.
 * UniqueArticle + gathered external sources + re-enrich metadata passthrough.
 */
export interface ArticleWithSources {
  // ── Original article fields (pass-through from UniqueArticle) ──
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source?: string;
  trendScore?: number;
  category?: string;
  relevanceScore: number;
  reasoning: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
  topic?: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  embedding?: number[];

  // ── SourceGatherer output ──
  sources: ArticleSource[];
  /** true when all external search services returned 0 results */
  hasNoExternalSources?: boolean;

  // ── Re-enrich metadata (passthrough) ──
  _forceReEnrich?: boolean;
  _rejectionReason?: string;
  _retryCount?: number;
}

/**
 * Output of ContentSynthesizer agent.
 * ArticleWithSources + LLM-synthesized bilingual content.
 */
export interface SynthesizedArticle extends ArticleWithSources {
  synthesizedContent: SynthesizedContent;
}

/**
 * Output of ContentValidator agent.
 * Final enriched article shape — backward-compatible with VisualGenerator.
 *
 * NOTE: This is the canonical definition. visual-generator.agent.ts should
 * import EnrichedArticle from here, NOT from content-enricher.agent.ts.
 */
export interface EnrichedArticle extends ArticleWithSources {
  synthesizedContent: SynthesizedContent;
  /** Injected by BaseAgent during processing for tracking */
  agentLogId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-ENRICH PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

/** Re-enrich job name (DatabasePublisher → ENRICHED_ARTICLES); izleme/debug için sabit. */
export const RE_ENRICH_JOB_NAME = "source-gatherer-re-enrich";

/**
 * Shape of the object DatabasePublisher pushes into the enricher queue
 * when an article fails a quality gate and needs deep re-enrichment.
 * This replaces all `as any` constructions in the re-queue path.
 */
export interface PipelineReEnrichPayload {
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source?: string;
  trendScore?: number;
  relevanceScore?: number;
  category?: string;
  reasoning?: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
  topic?: string;
  isDuplicate: boolean;
  _retryCount: number;
  _forceReEnrich: true;
  _rejectionReason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRISMA ERROR HELPER TYPE
// ─────────────────────────────────────────────────────────────────────────────

/** Typed Prisma client error shape (replaces `(error as any).code` casts) */
export interface PrismaClientError extends Error {
  code: string;
  meta?: Record<string, unknown>;
}

/** Type guard for Prisma errors */
export function isPrismaError(error: unknown): error is PrismaClientError {
  return (
    error instanceof Error &&
    typeof (error as PrismaClientError).code === "string"
  );
}
