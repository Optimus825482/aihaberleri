/**
 * Content Validator Agent
 *
 * RESPONSIBILITIES:
 * 1. Validate synthesized TR/EN content quality
 * 2. Reject articles with English titles, dictionary content, empty bodies
 * 3. Enforce minimum content length and score thresholds
 * 4. Map validated SynthesizedArticle → EnrichedArticle (backward compat)
 * 5. Emit to ARTICLES_WITH_VISUALS queue
 *
 * EXTRACTED FROM: content-enricher.agent.ts (inline validation logic)
 *                 database-publisher.agent.ts (quality gate checks)
 *
 * INPUT:  SynthesizedArticle[]
 * OUTPUT: EnrichedArticle[]
 * QUEUE:  Listens on CONTENT_VALIDATION, emits to ARTICLES_WITH_VISUALS
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import type {
  SynthesizedArticle,
  EnrichedArticle,
  SynthesizedContent,
} from "./pipeline-types";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum word count for TR content to pass validation */
const MIN_TR_WORD_COUNT = 100;
/** Minimum word count for EN content to pass validation */
const MIN_EN_WORD_COUNT = 80;
/** Minimum LLM score to pass validation (out of ~1000) */
const MIN_SCORE_THRESHOLD = 100;
/** Maximum dictionary red-flag matches before rejection */
const MAX_DICTIONARY_FLAGS = 1;

// ─────────────────────────────────────────────────────────────────────────────
// AGENT
// ─────────────────────────────────────────────────────────────────────────────

export class ContentValidatorAgent extends BaseAgent<
  SynthesizedArticle[],
  EnrichedArticle[]
> {
  protected config = {
    name: "content-validator",
    queueName: QUEUE_NAMES.CONTENT_VALIDATION,
    nextQueueName: QUEUE_NAMES.ARTICLES_WITH_VISUALS,
    enableMetrics: true,
  };

  constructor() {
    super("content-validator");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESS
  // ─────────────────────────────────────────────────────────────────────────

  protected async process(
    job: Job<SynthesizedArticle[]>,
  ): Promise<AgentResult<EnrichedArticle[]>> {
    const articles = job.data;
    const startTime = Date.now();

    this.logger.info(
      `🔍 Validating ${articles.length} synthesized articles...`,
    );

    if (articles.length === 0) {
      return {
        success: true,
        data: [],
        skipNextQueue: true,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          tokensUsed: 0,
          itemsProcessed: 0,
        },
      };
    }

    const validated: EnrichedArticle[] = [];
    const rejected: Array<{ title: string; reasons: string[] }> = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const num = i + 1;
      const reasons = this.validate(article);

      if (reasons.length === 0) {
        // ✅ Passed — map SynthesizedArticle → EnrichedArticle
        const enriched: EnrichedArticle = {
          // Core article fields
          title: article.title,
          description: article.description,
          url: article.url,
          publishedDate: article.publishedDate,
          source: article.source,
          trendScore: article.trendScore,
          category: article.category,
          relevanceScore: article.relevanceScore,
          reasoning: article.reasoning,
          suggestedCategory: article.suggestedCategory,
          suggestedTags: article.suggestedTags,
          topic: article.topic,
          isDuplicate: article.isDuplicate,
          duplicateReason: article.duplicateReason,
          embedding: article.embedding,

          // Source data
          sources: article.sources,
          hasNoExternalSources: article.hasNoExternalSources,

          // Synthesized content (validated)
          synthesizedContent: article.synthesizedContent,
        };
        validated.push(enriched);
        this.logger.success(
          `✅ [${num}/${articles.length}] Passed: ${article.synthesizedContent.tr.title.substring(0, 50)}...`,
        );
      } else {
        rejected.push({
          title: article.title.substring(0, 60),
          reasons,
        });
        this.logger.warn(
          `❌ [${num}/${articles.length}] Rejected: "${article.title.substring(0, 50)}" — ${reasons.join(", ")}`,
        );
      }
    }

    // Summary
    if (rejected.length > 0) {
      this.logger.warn(
        `📊 Validation summary: ${validated.length} passed, ${rejected.length} rejected`,
      );
      for (const r of rejected) {
        this.logger.warn(`   ↳ "${r.title}": ${r.reasons.join(", ")}`);
      }
    }

    this.logger.success(
      `🏁 Validation complete: ${validated.length}/${articles.length} articles passed`,
    );

    return {
      success: true,
      data: validated,
      nextQueue: QUEUE_NAMES.ARTICLES_WITH_VISUALS,
      skipNextQueue: validated.length === 0,
      metrics: {
        processingTime: Date.now() - startTime,
        apiCalls: 0,
        tokensUsed: 0,
        itemsProcessed: validated.length,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION LOGIC
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run all validation checks on a synthesized article.
   * Returns an array of rejection reasons (empty = passed).
   */
  private validate(article: SynthesizedArticle): string[] {
    const reasons: string[] = [];
    const { synthesizedContent: sc } = article;

    // ── 1. EMERGENCY TEMPLATE DETECTION ──
    if (this.isEmergencyTemplate(sc)) {
      reasons.push("emergency_template");
      return reasons; // No point checking further
    }

    // ── 2. ENGLISH TITLE CHECK ──
    if (this.isEnglishTitle(sc.tr.title)) {
      reasons.push("english_title");
    }

    // ── 3. DICTIONARY CONTENT CHECK ──
    if (this.hasDictionaryContent(sc.tr.content)) {
      reasons.push("dictionary_content");
    }
    if (this.hasDictionaryContent(sc.en.content)) {
      reasons.push("dictionary_content_en");
    }

    // ── 4. MINIMUM CONTENT LENGTH ──
    const trWordCount = this.countWords(sc.tr.content);
    const enWordCount = this.countWords(sc.en.content);
    if (trWordCount < MIN_TR_WORD_COUNT) {
      reasons.push(`tr_too_short (${trWordCount}w < ${MIN_TR_WORD_COUNT}w)`);
    }
    if (enWordCount < MIN_EN_WORD_COUNT) {
      reasons.push(`en_too_short (${enWordCount}w < ${MIN_EN_WORD_COUNT}w)`);
    }

    // ── 5. SCORE THRESHOLD ──
    if (sc.tr.score < MIN_SCORE_THRESHOLD) {
      reasons.push(`low_score (${sc.tr.score} < ${MIN_SCORE_THRESHOLD})`);
    }

    // ── 6. MISSING REQUIRED FIELDS ──
    if (!sc.tr.title || sc.tr.title.trim().length === 0) {
      reasons.push("missing_tr_title");
    }
    if (!sc.en.title || sc.en.title.trim().length === 0) {
      reasons.push("missing_en_title");
    }
    if (!sc.tr.excerpt || sc.tr.excerpt.trim().length === 0) {
      reasons.push("missing_tr_excerpt");
    }
    if (!sc.tr.metaDescription || sc.tr.metaDescription.trim().length === 0) {
      reasons.push("missing_tr_meta");
    }

    // ── 7. KEYWORDS VALIDATION ──
    if (!sc.tr.keywords || sc.tr.keywords.length < 3) {
      reasons.push(`insufficient_tr_keywords (${sc.tr.keywords?.length || 0})`);
    }

    // ── 8. ZERO-SOURCE HARD REJECT ──
    if (article.hasNoExternalSources) {
      reasons.push("zero_external_sources");
      this.logger.warn(
        `🚫 Article REJECTED — no external sources (100% LLM-generated): "${article.title.substring(0, 50)}"`,
      );
    }

    return reasons;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Check if the synthesis output is an emergency template (score: 0, empty content) */
  private isEmergencyTemplate(sc: SynthesizedContent): boolean {
    return (
      sc.tr.score === 0 &&
      (!sc.tr.content || sc.tr.content.trim().length === 0) &&
      (!sc.tr.title || sc.tr.title.trim().length === 0)
    );
  }

  /** Check if a title is in English (no Turkish characters + all ASCII) */
  private isEnglishTitle(title: string): boolean {
    if (!title || title.trim().length === 0) return false;
    const isAllAscii = /^[a-zA-Z0-9\s\-:,.'""!?&@#$%()—–]+$/.test(title.trim());
    const hasTurkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(title);
    return isAllAscii && !hasTurkishChars;
  }

  /** Check if content contains dictionary/reference patterns */
  private hasDictionaryContent(content: string): boolean {
    if (!content) return false;
    const lower = content.toLowerCase();
    const dictionaryRedFlags = [
      "pronunciation",
      "synonyms",
      "antonyms",
      "etymology",
      "definition of",
      "merriam-webster",
      "dictionary.com",
      "see the full definition",
      "word of the day",
      "noun.",
      "verb.",
      "adjective.",
    ];
    const matchCount = dictionaryRedFlags.filter((p) =>
      lower.includes(p),
    ).length;
    return matchCount > MAX_DICTIONARY_FLAGS;
  }

  /** Count words in HTML content (strip tags first) */
  private countWords(html: string): number {
    if (!html) return 0;
    const text = html
      .replace(/<[^>]*>/g, " ") // Strip HTML tags
      .replace(/&[a-z]+;/gi, " ") // Strip HTML entities
      .replace(/\s+/g, " ")
      .trim();
    return text.split(" ").filter((w) => w.length > 0).length;
  }
}
