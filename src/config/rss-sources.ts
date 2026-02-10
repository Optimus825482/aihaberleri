/**
 * Multi-Language RSS Sources Configuration
 * International AI News Sources with Reliability Scoring
 *
 * Supported Languages: EN, DE, FR, ZH, JA, KO
 * Total Sources: 50+ across 6 languages
 */

export type SupportedLanguage = "en" | "de" | "fr" | "zh" | "ja" | "ko" | "tr";

export type SourceCategory =
  | "major_tech" // Major tech publications
  | "ai_focused" // AI-specific publications
  | "research" // Research blogs & academic
  | "business" // Business & finance
  | "general_tech" // General technology news
  | "regional"; // Regional tech news

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  language: SupportedLanguage;
  category: SourceCategory;
  reliabilityScore: number; // 0-100, higher = more reliable
  averageArticlesPerDay: number; // Expected volume
  requiresTranslation: boolean; // If content needs translation to TR
  priority: number; // 1-5, higher = more important
  isActive: boolean; // Enable/disable source
  tags: string[]; // Content tags for filtering
  lastSuccessfulFetch?: Date; // Track fetch history
  failureCount?: number; // Track failures for reliability
}

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  translationPriority: number; // Higher = translate first
  enabled: boolean;
}

// ============================================
// LANGUAGE CONFIGURATIONS
// ============================================

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    translationPriority: 1,
    enabled: true,
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    translationPriority: 2,
    enabled: true,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    translationPriority: 3,
    enabled: true,
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    translationPriority: 4,
    enabled: true,
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    translationPriority: 5,
    enabled: true,
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    translationPriority: 6,
    enabled: true,
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    translationPriority: 0,
    enabled: true,
  }, // Native, no translation
];

// ============================================
// ENGLISH SOURCES (Primary)
// ============================================

export const ENGLISH_SOURCES: RSSSource[] = [
  // ============================================
  // AI-ONLY SOURCES (2026-02-10 Refactored)
  // YouTube kanalları artık birincil kaynak.
  // RSS sadece resmi AI şirket blogları + AI-odaklı yayınlar.
  // REMOVED: TechCrunch, The Verge, Wired, Ars Technica, ZDNet,
  //          Bloomberg, Reuters (genel teknoloji haberleri karışıyordu)
  // ============================================

  // ── OFFICIAL AI COMPANY BLOGS (En güvenilir, birincil kaynaklar) ──
  {
    id: "openai-blog",
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    language: "en",
    category: "research",
    reliabilityScore: 99,
    averageArticlesPerDay: 0.5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["official", "gpt", "chatgpt", "announcements"],
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    url: "https://blog.research.google/feeds/posts/default",
    language: "en",
    category: "research",
    reliabilityScore: 99,
    averageArticlesPerDay: 0.5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["official", "gemini", "research", "google"],
  },
  {
    id: "deepmind-blog",
    name: "DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    language: "en",
    category: "research",
    reliabilityScore: 99,
    averageArticlesPerDay: 0.3,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["official", "research", "alphafold", "agi"],
  },
  {
    id: "anthropic-blog",
    name: "Anthropic Blog",
    url: "https://www.anthropic.com/feed.xml",
    language: "en",
    category: "research",
    reliabilityScore: 99,
    averageArticlesPerDay: 0.3,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["official", "claude", "safety", "research"],
  },
  {
    id: "huggingface-blog",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    language: "en",
    category: "research",
    reliabilityScore: 95,
    averageArticlesPerDay: 1,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["open-source", "models", "transformers", "community"],
  },
  {
    id: "nvidia-ai-blog",
    name: "NVIDIA AI Blog",
    url: "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
    language: "en",
    category: "research",
    reliabilityScore: 94,
    averageArticlesPerDay: 1,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["gpu", "hardware", "cuda", "enterprise"],
  },

  // ── AI-FOCUSED PUBLICATIONS (Sadece AI haberleri yayınlayanlar) ──
  {
    id: "venturebeat-ai",
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 90,
    averageArticlesPerDay: 12,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["enterprise", "business", "product-launches"],
  },
  {
    id: "the-decoder",
    name: "THE DECODER",
    url: "https://the-decoder.com/feed/",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 87,
    averageArticlesPerDay: 4,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["llm", "generative-ai", "models"],
  },
  {
    id: "ai-news",
    name: "Artificial Intelligence News",
    url: "https://www.artificialintelligence-news.com/feed/",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 85,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["ai-specific", "industry-news"],
  },
  {
    id: "unite-ai",
    name: "Unite.AI",
    url: "https://www.unite.ai/feed/",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 84,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["applications", "tools", "tutorials"],
  },
  {
    id: "bensbites",
    name: "Ben's Bites",
    url: "https://bensbites.beehiiv.com/feed",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 88,
    averageArticlesPerDay: 1,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["daily-digest", "tools", "startups", "curated"],
  },
  {
    id: "import-ai",
    name: "Import AI Newsletter",
    url: "https://importai.substack.com/feed",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 93,
    averageArticlesPerDay: 0.5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["research", "policy", "industry-analysis", "weekly"],
  },

  // ── AI RESEARCH (Akademik + araştırma) ──
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    language: "en",
    category: "research",
    reliabilityScore: 98,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["research", "breakthrough", "analysis", "academic"],
  },
  {
    id: "deeplearning-ai",
    name: "DeepLearning.AI The Batch",
    url: "https://www.deeplearning.ai/the-batch/feed/",
    language: "en",
    category: "research",
    reliabilityScore: 95,
    averageArticlesPerDay: 0.3,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["andrew-ng", "education", "weekly", "research"],
  },
  {
    id: "paperswithcode",
    name: "Papers With Code",
    url: "https://paperswithcode.com/rss.xml",
    language: "en",
    category: "research",
    reliabilityScore: 96,
    averageArticlesPerDay: 10,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["papers", "sota", "benchmarks", "code"],
  },

  // ── HIGH-FREQUENCY AI SOURCES (2026-02-10) ──
  // Added to guarantee minimum 1 article per 15 minutes
  {
    id: "ars-technica-ai",
    name: "Ars Technica - AI",
    url: "https://feeds.arstechnica.com/arstechnica/features",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 92,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["tech-news", "analysis", "ai"],
  },
  {
    id: "the-register-ai",
    name: "The Register - AI",
    url: "https://www.theregister.com/software/ai_ml/headlines.atom",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 88,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["enterprise", "analysis", "ai-ml"],
  },
  {
    id: "infoworld-ai",
    name: "InfoWorld - AI",
    url: "https://www.infoworld.com/category/artificial-intelligence/index.rss",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 86,
    averageArticlesPerDay: 4,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["enterprise", "development", "ai"],
  },
  {
    id: "simon-willison",
    name: "Simon Willison's Weblog",
    url: "https://simonwillison.net/atom/everything/",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 93,
    averageArticlesPerDay: 2,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["llm", "tools", "analysis", "expert-blog"],
  },
  {
    id: "one-useful-thing",
    name: "One Useful Thing",
    url: "https://www.oneusefulthing.org/feed",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 91,
    averageArticlesPerDay: 0.5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["ai-impact", "education", "practical-ai"],
  },
  {
    id: "cohere-blog",
    name: "Cohere Blog",
    url: "https://cohere.com/blog/rss.xml",
    language: "en",
    category: "research",
    reliabilityScore: 90,
    averageArticlesPerDay: 1,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["official", "enterprise-ai", "rag", "embeddings"],
  },
  {
    id: "mistral-blog",
    name: "Mistral AI Blog",
    url: "https://mistral.ai/feed.xml",
    language: "en",
    category: "research",
    reliabilityScore: 92,
    averageArticlesPerDay: 0.5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["official", "open-source", "llm", "european-ai"],
  },
  {
    id: "replicate-blog",
    name: "Replicate Blog",
    url: "https://replicate.com/blog/rss.xml",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 85,
    averageArticlesPerDay: 1,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["open-source", "models", "deployment", "tools"],
  },
];

// ============================================
// GERMAN SOURCES
// ============================================

export const GERMAN_SOURCES: RSSSource[] = [
  // AI-focused German sources only (general tech removed 2026-02-10)
  // REMOVED: Golem.de, t3n, Heise Developer, ComputerBase, Der Standard (general tech)
  {
    id: "heise-ki",
    name: "Heise Online - KI",
    url: "https://www.heise.de/thema/Kuenstliche-Intelligenz?view=atom",
    language: "de",
    category: "ai_focused",
    reliabilityScore: 94,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["german-ai", "analysis", "research"],
  },
  {
    id: "the-decoder-de",
    name: "THE DECODER (DE)",
    url: "https://the-decoder.de/feed/",
    language: "de",
    category: "ai_focused",
    reliabilityScore: 90,
    averageArticlesPerDay: 4,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["german-ai", "llm", "generative-ai"],
  },
];

// ============================================
// FRENCH SOURCES
// ============================================

export const FRENCH_SOURCES: RSSSource[] = [
  // AI-focused French sources only (2026-02-10 Refactored)
  // REMOVED: Le Monde Technologies, L'Usine Digitale (genel teknoloji)
  {
    id: "actuia",
    name: "ActuIA",
    url: "https://www.actuia.com/feed/",
    language: "fr",
    category: "ai_focused",
    reliabilityScore: 85,
    averageArticlesPerDay: 3,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["french-ai", "industry", "research"],
  },
  {
    id: "journaldunet-ia",
    name: "Journal du Net - IA",
    url: "https://www.journaldunet.com/feed/10001/",
    language: "fr",
    category: "ai_focused",
    reliabilityScore: 86,
    averageArticlesPerDay: 3,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["enterprise-ai", "business", "french"],
  },
];

// ============================================
// CHINESE SOURCES
// ============================================

export const CHINESE_SOURCES: RSSSource[] = [
  // AI-focused Chinese sources only (2026-02-10 Refactored)
  // REMOVED: 36Kr, PingWest (genel teknoloji/startup haberleri)
  {
    id: "jiqizhixin",
    name: "机器之心 (Synced China)",
    url: "https://www.jiqizhixin.com/rss",
    language: "zh",
    category: "ai_focused",
    reliabilityScore: 92,
    averageArticlesPerDay: 10,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["ai-research", "ml", "china-ai"],
  },
  {
    id: "qbitai",
    name: "量子位 (QbitAI)",
    url: "https://www.qbitai.com/feed",
    language: "zh",
    category: "ai_focused",
    reliabilityScore: 90,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["ai-research", "llm", "china-ai"],
  },
];

// ============================================
// JAPANESE SOURCES
// ============================================

export const JAPANESE_SOURCES: RSSSource[] = [
  // AI-focused Japanese sources only (2026-02-10 Refactored)
  // REMOVED: 日経クロステック, 技術評論社 (genel teknoloji)
  {
    id: "itmedia-ai",
    name: "ITmedia AI+",
    url: "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml",
    language: "ja",
    category: "ai_focused",
    reliabilityScore: 91,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["japan-ai", "enterprise", "research"],
  },
  {
    id: "ledge-ai",
    name: "Ledge.ai",
    url: "https://ledge.ai/feed/",
    language: "ja",
    category: "ai_focused",
    reliabilityScore: 85,
    averageArticlesPerDay: 4,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["japan-ai", "business", "use-cases"],
  },
];

// ============================================
// KOREAN SOURCES
// ============================================

export const KOREAN_SOURCES: RSSSource[] = [
  // AI-focused Korean sources only (2026-02-10 Refactored)
  // REMOVED: ZDNet Korea, Bloter, ETNews, ITWorld Korea, Platum (genel teknoloji)
  {
    id: "aitimes-kr",
    name: "AI타임스",
    url: "https://www.aitimes.com/rss/allArticle.xml",
    language: "ko",
    category: "ai_focused",
    reliabilityScore: 85,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["korea-ai", "industry", "research"],
  },
];

// ============================================
// TURKISH SOURCES (Native Language - No Translation)
// ============================================

export const TURKISH_SOURCES: RSSSource[] = [
  // Turkish AI-Focused ONLY (General tech sources removed 2026-02-10)
  // REMOVED: ShiftDelete.Net, Webtekno, DonanımHaber, Teknolojigundem, LOG, Chip Online, Tamindir, Webrazzi
  // REASON: These publish mixed content (cameras, headphones, PS5 deals, etc.) causing non-AI news on aihaberleri.org
  {
    id: "yapay-zeka-turkiye",
    name: "Yapay Zeka Türkiye",
    url: "https://yapayzekaturkiye.com/feed/",
    language: "tr",
    category: "ai_focused",
    reliabilityScore: 82,
    averageArticlesPerDay: 3,
    requiresTranslation: false,
    priority: 5,
    isActive: true,
    tags: ["yapay-zeka", "makine-ogrenmesi", "veri-bilimi"],
  },
];

// ============================================
// ALL SOURCES COMBINED
// ============================================

export const ALL_INTERNATIONAL_SOURCES: RSSSource[] = [
  ...ENGLISH_SOURCES,
  ...GERMAN_SOURCES,
  ...FRENCH_SOURCES,
  ...CHINESE_SOURCES,
  ...JAPANESE_SOURCES,
  ...KOREAN_SOURCES,
  ...TURKISH_SOURCES,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get sources by language
 */
export function getSourcesByLanguage(lang: SupportedLanguage): RSSSource[] {
  return ALL_INTERNATIONAL_SOURCES.filter(
    (source) => source.language === lang && source.isActive,
  );
}

/**
 * Get sources by category
 */
export function getSourcesByCategory(category: SourceCategory): RSSSource[] {
  return ALL_INTERNATIONAL_SOURCES.filter(
    (source) => source.category === category && source.isActive,
  );
}

/**
 * Get sources by priority (minimum priority level)
 */
export function getSourcesByPriority(minPriority: number): RSSSource[] {
  return ALL_INTERNATIONAL_SOURCES.filter(
    (source) => source.priority >= minPriority && source.isActive,
  );
}

/**
 * Get high-reliability sources (score >= threshold)
 */
export function getReliableSources(minScore: number = 90): RSSSource[] {
  return ALL_INTERNATIONAL_SOURCES.filter(
    (source) => source.reliabilityScore >= minScore && source.isActive,
  );
}

/**
 * Get sources requiring translation
 */
export function getTranslatableSources(): RSSSource[] {
  return ALL_INTERNATIONAL_SOURCES.filter(
    (source) => source.requiresTranslation && source.isActive,
  );
}

/**
 * Get sources by tag
 */
export function getSourcesByTag(tag: string): RSSSource[] {
  return ALL_INTERNATIONAL_SOURCES.filter(
    (source) => source.tags.includes(tag) && source.isActive,
  );
}

/**
 * Get source statistics
 */
export function getSourceStatistics() {
  const active = ALL_INTERNATIONAL_SOURCES.filter((s) => s.isActive);

  return {
    total: ALL_INTERNATIONAL_SOURCES.length,
    active: active.length,
    byLanguage: {
      en: getSourcesByLanguage("en").length,
      de: getSourcesByLanguage("de").length,
      fr: getSourcesByLanguage("fr").length,
      zh: getSourcesByLanguage("zh").length,
      ja: getSourcesByLanguage("ja").length,
      ko: getSourcesByLanguage("ko").length,
      tr: getSourcesByLanguage("tr").length,
    },
    byCategory: {
      major_tech: getSourcesByCategory("major_tech").length,
      ai_focused: getSourcesByCategory("ai_focused").length,
      research: getSourcesByCategory("research").length,
      business: getSourcesByCategory("business").length,
      general_tech: getSourcesByCategory("general_tech").length,
      regional: getSourcesByCategory("regional").length,
    },
    averageReliability: Math.round(
      active.reduce((sum, s) => sum + s.reliabilityScore, 0) / active.length,
    ),
    highPriority: getSourcesByPriority(4).length,
  };
}

export default {
  LANGUAGE_CONFIGS,
  ENGLISH_SOURCES,
  GERMAN_SOURCES,
  FRENCH_SOURCES,
  CHINESE_SOURCES,
  JAPANESE_SOURCES,
  KOREAN_SOURCES,
  TURKISH_SOURCES,
  ALL_INTERNATIONAL_SOURCES,
  getSourcesByLanguage,
  getSourcesByCategory,
  getSourcesByPriority,
  getReliableSources,
  getTranslatableSources,
  getSourcesByTag,
  getSourceStatistics,
};
