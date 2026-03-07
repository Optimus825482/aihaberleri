/**
 * Content Synthesizer Agent
 *
 * RESPONSIBILITIES:
 * 1. LLM-powered TR content synthesis from gathered sources
 * 2. LLM-powered EN content synthesis
 * 3. Retry loop with escalating corrective prompts (english_title, dictionary, parse_error)
 * 4. AI disclaimer injection for both TR and EN
 * 5. Emergency template generation for failed synthesis
 *
 * EXTRACTED FROM: content-enricher.agent.ts (synthesizeContent + generateEmergencyTemplate)
 *
 * INPUT:  ArticleWithSources[]
 * OUTPUT: SynthesizedArticle[]
 * QUEUE:  Listens on CONTENT_SYNTHESIS, emits to CONTENT_VALIDATION
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { callDeepSeek } from "@/lib/deepseek";
import type {
  ArticleWithSources,
  ArticleSource,
  SynthesizedArticle,
  SynthesizedContent,
  SynthesizedContentTR,
  SynthesizedContentEN,
} from "./pipeline-types";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum retry attempts for TR synthesis before falling back to emergency template */
const MAX_TR_RETRIES = 2;
/** Makale başına sentez timeout (ms). Agent timeout base-agent'ta 12 dk. */
const SYNTHESIS_TIMEOUT_MS = 180_000;

// ─────────────────────────────────────────────────────────────────────────────
// AGENT
// ─────────────────────────────────────────────────────────────────────────────

export class ContentSynthesizerAgent extends BaseAgent<
  ArticleWithSources[],
  SynthesizedArticle[]
> {
  protected config = {
    name: "content-synthesizer",
    queueName: QUEUE_NAMES.CONTENT_SYNTHESIS,
    nextQueueName: QUEUE_NAMES.CONTENT_VALIDATION,
    enableMetrics: true,
  };

  constructor() {
    super("content-synthesizer");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESS
  // ─────────────────────────────────────────────────────────────────────────

  protected async process(
    job: Job<ArticleWithSources[]>,
  ): Promise<AgentResult<SynthesizedArticle[]>> {
    const articles = job.data;
    const startTime = Date.now();
    let apiCalls = 0;
    let tokensUsed = 0;

    this.logger.info(
      `✍️ Synthesizing content for ${articles.length} articles...`,
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

    try {
      const results: SynthesizedArticle[] = [];
      const CONCURRENCY = 2;

      for (let i = 0; i < articles.length; i += CONCURRENCY) {
        const batch = articles.slice(i, i + CONCURRENCY);
        this.logger.info(
          `📦 Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(articles.length / CONCURRENCY)} (${batch.length} articles)`,
        );

        const promises = batch.map(async (article, batchIdx) => {
          const idx = i + batchIdx;
          const num = idx + 1;
          this.logger.info(
            `[${num}/${articles.length}] Synth: ${article.title.substring(0, 50)}...`,
          );

          try {
            const rejectionHint = article._rejectionReason;

            // Synthesize with timeout (agent-level 12 min in base-agent)
            const synthesizedContent: SynthesizedContent = await Promise.race([
              this.synthesizeContent(
                article,
                article.sources,
                article.category || article.suggestedCategory || "teknoloji",
                rejectionHint,
              ),
              new Promise<SynthesizedContent>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        `Synthesis timeout (${SYNTHESIS_TIMEOUT_MS / 1000}s)`,
                      ),
                    ),
                  SYNTHESIS_TIMEOUT_MS,
                ),
              ),
            ]);

            apiCalls += 2; // TR + EN LLM calls
            tokensUsed += 12000; // Approximate 6K per language

            const output: SynthesizedArticle = {
              // Pass-through all ArticleWithSources fields
              ...article,
              // Synthesizer output
              synthesizedContent,
            };

            return { success: true as const, data: output };
          } catch (error) {
            this.logger.error(
              `❌ [${num}] Synthesis failed: ${article.title.substring(0, 50)}`,
              this.serializeError(error),
            );
            return { success: false as const, error };
          }
        });

        const settled = await Promise.allSettled(promises);
        for (const r of settled) {
          if (r.status === "fulfilled" && r.value.success) {
            results.push(r.value.data);
          }
        }
      }

      this.logger.success(
        `🏁 Synthesis complete: ${results.length}/${articles.length} articles`,
      );

      return {
        success: true,
        data: results,
        nextQueue: QUEUE_NAMES.CONTENT_VALIDATION,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed,
          itemsProcessed: results.length,
        },
      };
    } catch (error) {
      this.logger.error(
        "Content synthesis failed:",
        this.serializeError(error),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed,
          itemsProcessed: 0,
        },
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SYNTHESIZE CONTENT (TR + EN with retry loop)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Synthesize content from multiple sources (TR + EN)
   * Using LLM (NVIDIA Qwen3 primary) for both TR and EN content generation
   *
   * @param initialRejectionHint  When set (re-enrichment path), the retry loop
   *   starts with this known failure reason so corrective prompts are applied
   *   from attempt 0 instead of waiting for a second rejection.
   */
  private async synthesizeContent(
    article: ArticleWithSources,
    sources: ArticleSource[],
    category: string,
    initialRejectionHint?: string,
  ): Promise<SynthesizedContent> {
    // Sanitize text to prevent JSON parsing errors in API calls
    const sanitizeForPrompt = (text: string): string => {
      return text
        .replace(/\\/g, "/")
        .replace(/[\r\n]+/g, " ")
        .replace(/[\x00-\x1f]/g, "")
        .replace(/[\u2028\u2029]/g, " ")
        .trim();
    };

    const sourcesText = sources
      .slice(0, 6)
      .map(
        (s, i) => `
--- SOURCE ${i + 1}: ${new URL(s.url).hostname} ---
Title: ${sanitizeForPrompt(s.title)}
URL: ${s.url}
Content:
${sanitizeForPrompt(s.content.substring(0, 1500))}
`,
      )
      .join("\n");

    this.logger.info(`🚀 Using LLM for BOTH TR + EN synthesis (parallel)`);

    // P2-9: Fire EN synthesis concurrently with TR (EN doesn't depend on TR output)
    const enPrompt = `You are a world-renowned investigative journalist.

Task: Create a comprehensive, original English news article by synthesizing ${sources.length} sources.

### ORIGINAL NEWS:
Title: ${article.title}
Description: ${article.description}

### SOURCES:
${sourcesText}

### RULES:
1. CREATE ORIGINAL CONTENT (synthesize, don't copy)
2. Cite sources: "According to Reuters...", "TechCrunch reports..."
3. Professional tone: Objective, neutral, third-person

### STRUCTURE & SEO RULES (CRITICAL — FOLLOW ALL):
- **Title (title):** 50-70 chars. Primary keyword in FIRST 5 words. Include year or number if possible (boosts CTR).
- **Meta Title (metaTitle):** 50-60 chars. Optimized for Google SERP. Put primary keyword first. Can differ from title, shorter and more concise.
- **Excerpt:** 2-3 sentences, must include primary keyword.
- **Meta Description (metaDescription):** 120-150 chars. NEVER exceed 155 characters. Add CTA verb ("Discover", "Learn", "Explore"). Naturally integrate primary keyword.
- **Content:** HTML formatted, min 500 words.
  - Minimum 2 <h2> headings, H2s MUST contain keywords.
  - Short paragraphs: max 3-4 sentences each.
  - Primary keyword MUST appear in FIRST paragraph.
  - Primary keyword MUST appear in LAST paragraph.
- **Keywords:** 5-8 keywords. Content density 1-2%.

Respond in JSON:
{
  "title": "SEO-Optimized English Title (50-70 chars)",
  "metaTitle": "Short SERP Title (50-60 chars)",
  "excerpt": "2-3 sentence summary",
  "content": "Full HTML article",
  "keywords": ["keyword1", "keyword2"],
  "metaDescription": "CTA-driven SEO meta description (120-150 chars, MAX 155)"
}`;

    // Start EN synthesis immediately (non-blocking)
    const enPromise = callDeepSeek([{ role: "user", content: enPrompt }], {
      model: "deepseek-chat",
      maxTokens: 6000,
      temperature: 0.7,
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ LLM EN (parallel) failed: ${msg}`);
      return null; // Will be handled after TR completes
    });

    // 🔄 RETRY LOOP: TR content synthesis with escalating prompts on failure
    let trContent: SynthesizedContentTR | null = null;
    let trSynthesisSuccess = false;
    let lastRejectionReason = initialRejectionHint ?? "";
    let activeSources = [...sources];

    for (let trAttempt = 0; trAttempt <= MAX_TR_RETRIES; trAttempt++) {
      try {
        // Build retry-aware prompt enhancements
        let retryInstructions = "";
        if (trAttempt > 0) {
          this.logger.warn(
            `🔄 TR synthesis RETRY ${trAttempt}/${MAX_TR_RETRIES}: reason="${lastRejectionReason}"`,
          );

          if (lastRejectionReason === "english_title") {
            retryInstructions = `

⚠️ KRİTİK UYARI: Önceki denemende İNGİLİZCE başlık ürettin! Bu KABUL EDİLEMEZ.
BAŞLIK %100 TÜRKÇE OLMALI. İngilizce kelime ASLA kullanma. Türkçe karakter (ç, ğ, ı, ö, ş, ü) MUTLAKA içermeli.
Örnek doğru başlık: "Google'ın Yeni Yapay Zekâ Modeli Rakiplerini Geride Bıraktı"`;
          } else if (lastRejectionReason === "dictionary_content") {
            retryInstructions = `

⚠️ KRİTİK UYARI: Önceki denemende sözlük tanımları içeren içerik ürettin!
ASLA sözlük tanımı, kelime anlamı, pronunciation, synonym, etymology KULLANMA.
Sadece HABER içeriği yaz — ne oldu, neden önemli, sektöre etkisi ne.`;
            // Filter out suspicious dictionary sources
            activeSources = activeSources.filter((s) =>
              this.isSourceContentClean(s.content),
            );
            if (activeSources.length === 0) {
              this.logger.error(
                `🚫 All sources filtered as dictionary content — cannot retry`,
              );
              break;
            }
          } else if (lastRejectionReason === "parse_error") {
            retryInstructions = `

⚠️ ÖNEMLİ: Yanıtını MUTLAKA geçerli JSON formatında ver. Ekstra metin ekleme, sadece JSON objesi döndür.`;
          }
        }

        // Rebuild sources text with potentially filtered sources
        const retrySourcesText = activeSources
          .slice(0, 6)
          .map(
            (s, i) => `
--- SOURCE ${i + 1}: ${new URL(s.url).hostname} ---
Title: ${sanitizeForPrompt(s.title)}
URL: ${s.url}
Content:
${sanitizeForPrompt(s.content.substring(0, 1500))}
`,
          )
          .join("\n");

        const currentTrPrompt = `Sen usta bir araştırmacı gazeteci ve baş editörsün.

Görevin: Aşağıdaki ${activeSources.length} FARKLI KAYNAKTAN toplanan ham verileri derinlemesine analiz ederek, SENTEZLEYEREK, KAPSAMLI ve %100 ORİJİNAL bir Türkçe haber makalesi oluşturmak.

### ORİJİNAL HABER BAŞLIĞI:
${article.title}

### TOPLANAN KAYNAKLAR:
${retrySourcesText}

### YAZIM KURALLARI:
1. İNSANSI VE AKICI DİL: Robotik değil, doğal Türkçe
2. DERİN ANALİZ: "Ne oldu" + "Neden oldu" + "Ne anlama geliyor"
3. OBJEKTİF AMA ÇARPICI: Tarafsız kal ama sıkıcı olma
4. KAYNAK KULLANIMI: "Reuters'a göre...", "TechCrunch'ın raporuna göre..."
5. Benzersiz Anlatım: Her cümlen özgün olsun

### YAPI VE SEO KURALLARI (KRİTİK — HEPSİNE UY):
- **Başlık (title):** 50-70 karakter. Ana anahtar kelime İLK 5 kelimede olmalı. Mümkünse yıl veya rakam ekle (CTR artırır).
- **Meta Başlık (metaTitle):** 50-60 karakter. Google SERP için optimize. Ana anahtar kelimeyi başa koy. Başlıktan farklı olabilir, daha kısa ve öz.
- **Özet (excerpt):** 2-3 cümlelik giriş, ana anahtar kelimeyi içermeli.
- **Meta Açıklama (metaDescription):** 120-150 karakter. ASLA 155 karakteri GEÇME. CTA fiili ekle ("Keşfet", "Öğren", "İncele"). Ana anahtar kelimeyi doğal şekilde entegre et.
- **İçerik (content):** En az 600 kelime, HTML formatlı (<p>, <h2>, <ul>/<ol>).
  - Minimum 2 adet <h2> başlık kullan, H2'lerde anahtar kelime geçmeli.
  - Paragraflar kısa: max 3-4 cümle.
  - İlk paragrafta ana anahtar kelime GEÇMELİ.
  - Son paragrafta ana anahtar kelime GEÇMELİ.
- **Anahtar Kelimeler:** 6-10 adet. İçerikte yoğunluk %1-2.
${retryInstructions}
JSON formatında yanıt ver:
{
  "title": "Çarpıcı ve SEO Uyumlu Başlık (50-70 kar)",
  "metaTitle": "Google SERP İçin Kısa Başlık (50-60 kar)",
  "excerpt": "Okuyucuyu yakalayan özet",
  "content": "HTML formatlı, derin analiz içeren tam makale",
  "keywords": ["anahtar1", "anahtar2"],
  "metaDescription": "CTA içeren SEO meta açıklama (120-150 kar, MAX 155)",
  "score": 950
}`;

        const trResponse = await callDeepSeek(
          [{ role: "user", content: currentTrPrompt }],
          {
            model: "deepseek-chat",
            maxTokens: 6000,
            temperature: trAttempt === 0 ? 0.7 : 0.5,
          },
        );

        const trJsonMatch = trResponse.match(/\{[\s\S]*\}/);
        if (!trJsonMatch) {
          lastRejectionReason = "parse_error";
          continue;
        }
        const parsed = JSON.parse(trJsonMatch[0]);

        // 🛡️ POST-SYNTHESIS VALIDATION: Verify TR content is actually Turkish
        if (parsed.title) {
          const isEnglishTitle = /^[a-zA-Z0-9\s\-:,.'""!?&@#$%()—–]+$/.test(
            parsed.title.trim(),
          );
          const hasTurkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(parsed.title);

          if (isEnglishTitle && !hasTurkishChars) {
            this.logger.warn(
              `🔄 LLM returned English title (attempt ${trAttempt + 1}): "${parsed.title.substring(0, 60)}"`,
            );
            lastRejectionReason = "english_title";
            continue;
          }
        }

        // 🛡️ Check for dictionary/garbage content
        const contentLower = (parsed.content || "").toLowerCase();
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
        ];
        const dictMatchCount = dictionaryRedFlags.filter((p) =>
          contentLower.includes(p),
        ).length;
        if (dictMatchCount >= 2) {
          this.logger.warn(
            `🔄 LLM generated dictionary content (attempt ${trAttempt + 1}): ${dictMatchCount} flags`,
          );
          lastRejectionReason = "dictionary_content";
          continue;
        }

        // ✅ Passed all validation
        trContent = parsed as SynthesizedContentTR;
        trSynthesisSuccess = true;
        this.logger.success(
          `✅ LLM TR content generated successfully${trAttempt > 0 ? ` (retry ${trAttempt})` : ""}`,
        );
        break;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ LLM TR attempt ${trAttempt + 1} failed: ${msg}`);
        lastRejectionReason = "api_error";
        if (trAttempt < MAX_TR_RETRIES) {
          const waitMs = 2000 * (trAttempt + 1);
          this.logger.info(`⏳ Waiting ${waitMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    // If all retries failed, return emergency template (empty → rejected by validator)
    if (!trSynthesisSuccess || !trContent) {
      this.logger.error(
        `🚫 All ${MAX_TR_RETRIES + 1} TR synthesis attempts failed (reason: ${lastRejectionReason}) — article will NOT be published`,
      );
      return this.generateEmergencyTemplate(article);
    }

    // ── English content (P2-9: already running in parallel, just await result) ──
    let enContent: SynthesizedContentEN;
    try {
      const enResponse = await enPromise;
      if (!enResponse) {
        throw new Error("EN synthesis failed (parallel promise returned null)");
      }

      const enJsonMatch = enResponse.match(/\{[\s\S]*\}/);
      if (!enJsonMatch) {
        throw new Error("Failed to parse English content from LLM");
      }
      enContent = JSON.parse(enJsonMatch[0]) as SynthesizedContentEN;
      this.logger.success(
        `✅ LLM EN content generated successfully (parallel)`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ LLM EN failed: ${msg}, using emergency template`);
      return this.generateEmergencyTemplate(article);
    }

    // ── AI Disclaimer & sources footer ──
    const sourcesHtmlTr = sources
      .slice(0, 5)
      .map(
        (s) =>
          `<a href="${s.url}" target="_blank" rel="noopener nofollow" style="color: #60a5fa; text-decoration: none;">${new URL(s.url).hostname}</a>`,
      )
      .join(" • ");

    const sourcesHtmlEn = sources
      .slice(0, 5)
      .map(
        (s) =>
          `<a href="${s.url}" target="_blank" rel="noopener nofollow" style="color: #60a5fa; text-decoration: none;">${new URL(s.url).hostname}</a>`,
      )
      .join(" • ");

    const aiDisclaimerTr = `
<div class="ai-disclosure" style="margin-top: 2.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%); border-radius: 12px; border: 1px solid rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8a4 4 0 0 1 0 8"/><path d="M12 8a4 4 0 0 0 0 8"/></svg>
    <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">Yapay Zeka Destekli İçerik</span>
  </div>
  <div style="font-size: 0.65rem; color: #94a3b8;">
    <strong style="color: #64748b;">Kaynaklar:</strong> ${sourcesHtmlTr}
  </div>
</div>`;

    const aiDisclaimerEn = `
<div class="ai-disclosure" style="margin-top: 2.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%); border-radius: 12px; border: 1px solid rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8a4 4 0 0 1 0 8"/><path d="M12 8a4 4 0 0 0 0 8"/></svg>
    <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">AI-Powered Content</span>
  </div>
  <div style="font-size: 0.65rem; color: #94a3b8;">
    <strong style="color: #64748b;">Sources:</strong> ${sourcesHtmlEn}
  </div>
</div>`;

    // Append disclaimers
    trContent.content = (trContent.content || "") + aiDisclaimerTr;
    enContent.content = (enContent.content || "") + aiDisclaimerEn;

    return { tr: trContent, en: enContent };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE CONTENT VALIDATION (for dictionary retry filtering)
  // ─────────────────────────────────────────────────────────────────────────

  private isSourceContentClean(content: string): boolean {
    if (!content || content.length < 50) return false;

    const lowerContent = content.toLowerCase();
    const garbagePatterns = [
      "shadow dom",
      "published time:",
      "warning:",
      "this page contains",
      "<script",
      "javascript:",
      "window.__",
      "document.get",
      "classname=",
      "onclick=",
      "adsbygoogle",
      "googletag",
      "cookie policy",
      "accept cookies",
      "privacy policy",
      "subscribe to newsletter",
      "sign up for",
      "enable javascript",
      "captcha",
      "403 forbidden",
      "access denied",
      "robot verification",
      "cloudflare",
      "just a moment",
      "checking your browser",
      "pronunciation",
      "synonyms",
      "antonyms",
      "word origin",
      "etymology",
      "thesaurus",
      "definition of",
      "definitions of",
      "noun.",
      "verb.",
      "adjective.",
      "adverb.",
      "plural of",
      "past tense",
      "present tense",
      "merriam-webster",
      "dictionary.com",
      "see the full definition",
      "word of the day",
      "browse the dictionary",
      "example sentences",
      "first known use",
    ];

    const matchCount = garbagePatterns.filter((p) =>
      lowerContent.includes(p),
    ).length;
    if (matchCount >= 2) return false;

    const alphanumeric = (
      content.match(/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]/g) || []
    ).length;
    const ratio = alphanumeric / content.length;
    if (ratio < 0.5 && content.length > 200) return false;

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EMERGENCY TEMPLATE (synthesis failure → empty content → rejected)
  // ─────────────────────────────────────────────────────────────────────────

  private generateEmergencyTemplate(
    article: ArticleWithSources,
  ): SynthesizedContent {
    this.logger.error(
      `🚫 Emergency template REJECTED: LLM synthesis failed for "${article.title.substring(0, 60)}" — article will NOT be published`,
    );

    return {
      tr: {
        title: "",
        excerpt: "",
        content: "",
        keywords: [],
        metaDescription: "",
        score: 0,
      },
      en: {
        title: "",
        excerpt: "",
        content: "",
        keywords: [],
        metaDescription: "",
      },
    };
  }
}
