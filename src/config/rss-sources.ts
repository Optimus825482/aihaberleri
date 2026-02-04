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
  // Major Tech Publications
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    language: "en",
    category: "major_tech",
    reliabilityScore: 95,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["startups", "funding", "product-launches", "ai-companies"],
  },
  {
    id: "verge-ai",
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    language: "en",
    category: "major_tech",
    reliabilityScore: 92,
    averageArticlesPerDay: 10,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["consumer-tech", "product-news", "industry"],
  },
  {
    id: "wired-ai",
    name: "Wired AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    language: "en",
    category: "major_tech",
    reliabilityScore: 93,
    averageArticlesPerDay: 6,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["analysis", "culture", "ethics", "future"],
  },
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
    id: "ars-technica-ai",
    name: "Ars Technica AI",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    language: "en",
    category: "major_tech",
    reliabilityScore: 91,
    averageArticlesPerDay: 6,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["deep-dive", "technical", "analysis"],
  },
  {
    id: "zdnet-ai",
    name: "ZDNet AI",
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    language: "en",
    category: "major_tech",
    reliabilityScore: 88,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["enterprise", "how-to", "reviews"],
  },

  // AI Focused Publications
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
    id: "marktechpost",
    name: "MarkTechPost",
    url: "https://www.marktechpost.com/feed/",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 82,
    averageArticlesPerDay: 6,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["research-papers", "technical", "ml"],
  },
  {
    id: "synced-review",
    name: "Synced Review",
    url: "https://syncedreview.com/feed",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 84,
    averageArticlesPerDay: 3,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["research", "china-ai", "papers"],
  },

  // Research & Company Blogs
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
    priority: 4,
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
  {
    id: "aws-ml-blog",
    name: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    language: "en",
    category: "research",
    reliabilityScore: 92,
    averageArticlesPerDay: 1,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["cloud", "sagemaker", "enterprise", "tutorials"],
  },

  // Business & Analysis
  {
    id: "bloomberg-tech",
    name: "Bloomberg Technology",
    url: "https://feeds.bloomberg.com/technology/news.rss",
    language: "en",
    category: "business",
    reliabilityScore: 96,
    averageArticlesPerDay: 15,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["finance", "markets", "business"],
  },
  {
    id: "reuters-tech",
    name: "Reuters Technology",
    url: "https://www.reuters.com/technology/rss",
    language: "en",
    category: "business",
    reliabilityScore: 97,
    averageArticlesPerDay: 10,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["breaking-news", "global", "business"],
  },

  // Substacks & Newsletters
  {
    id: "ai-snake-oil",
    name: "AI Snake Oil",
    url: "https://aisnakeoil.substack.com/feed",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 90,
    averageArticlesPerDay: 0.5,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["critical", "ethics", "hype-analysis"],
  },
  {
    id: "the-algorithmic-bridge",
    name: "The Algorithmic Bridge",
    url: "https://thealgorithmicbridge.substack.com/feed",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 88,
    averageArticlesPerDay: 0.5,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["analysis", "philosophy", "future"],
  },
  {
    id: "ahead-of-ai",
    name: "Ahead of AI",
    url: "https://magazine.sebastianraschka.com/feed",
    language: "en",
    category: "ai_focused",
    reliabilityScore: 92,
    averageArticlesPerDay: 0.3,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["technical", "ml-research", "tutorials"],
  },
];

// ============================================
// GERMAN SOURCES
// ============================================

export const GERMAN_SOURCES: RSSSource[] = [
  {
    id: "heise-ki",
    name: "Heise Online - KI",
    url: "https://www.heise.de/rss/heise-atom.xml",
    language: "de",
    category: "major_tech",
    reliabilityScore: 94,
    averageArticlesPerDay: 20,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["german-tech", "comprehensive", "analysis"],
  },
  {
    id: "golem-de",
    name: "Golem.de",
    url: "https://rss.golem.de/rss.php?feed=RSS2.0",
    language: "de",
    category: "major_tech",
    reliabilityScore: 91,
    averageArticlesPerDay: 15,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["german-tech", "it-news", "games"],
  },
  {
    id: "t3n-ki",
    name: "t3n - KI & Machine Learning",
    url: "https://t3n.de/rss.xml",
    language: "de",
    category: "major_tech",
    reliabilityScore: 88,
    averageArticlesPerDay: 10,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["startup", "digital-business", "trends"],
  },
  {
    id: "heise-developer",
    name: "Heise Developer",
    url: "https://www.heise.de/developer/rss/news-atom.xml",
    language: "de",
    category: "general_tech",
    reliabilityScore: 90,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["programming", "software-dev", "technical"],
  },
  {
    id: "computerbase",
    name: "ComputerBase",
    url: "https://www.computerbase.de/rss/news.xml",
    language: "de",
    category: "general_tech",
    reliabilityScore: 89,
    averageArticlesPerDay: 12,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["hardware", "reviews", "pc-tech"],
  },
  {
    id: "der-standard-tech",
    name: "Der Standard - Web",
    url: "https://www.derstandard.at/rss/web",
    language: "de",
    category: "regional",
    reliabilityScore: 87,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["austria", "german-speaking", "tech"],
  },
];

// ============================================
// FRENCH SOURCES
// ============================================

export const FRENCH_SOURCES: RSSSource[] = [
  {
    id: "lemonde-tech",
    name: "Le Monde - Technologies",
    url: "https://www.lemonde.fr/technologies/rss_full.xml",
    language: "fr",
    category: "major_tech",
    reliabilityScore: 95,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["french-mainstream", "analysis", "policy"],
  },
  {
    id: "numerama",
    name: "Numerama",
    url: "https://www.numerama.com/feed/",
    language: "fr",
    category: "major_tech",
    reliabilityScore: 88,
    averageArticlesPerDay: 15,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["french-tech", "consumer", "digital-culture"],
  },
  {
    id: "frandroid",
    name: "Frandroid",
    url: "https://www.frandroid.com/feed",
    language: "fr",
    category: "general_tech",
    reliabilityScore: 85,
    averageArticlesPerDay: 20,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["android", "mobile", "gadgets"],
  },
  {
    id: "usine-digitale",
    name: "L'Usine Digitale",
    url: "https://www.usine-digitale.fr/rss",
    language: "fr",
    category: "business",
    reliabilityScore: 90,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["industry", "enterprise", "digital-transformation"],
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
  {
    id: "lebigdata",
    name: "LeBigData.fr",
    url: "https://www.lebigdata.fr/feed",
    language: "fr",
    category: "ai_focused",
    reliabilityScore: 83,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["big-data", "ml", "data-science"],
  },
];

// ============================================
// CHINESE SOURCES
// ============================================

export const CHINESE_SOURCES: RSSSource[] = [
  {
    id: "36kr-ai",
    name: "36氪 (36Kr)",
    url: "https://36kr.com/feed",
    language: "zh",
    category: "major_tech",
    reliabilityScore: 90,
    averageArticlesPerDay: 30,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["china-startups", "investment", "tech-news"],
  },
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
    id: "leiphone",
    name: "雷锋网 (Leiphone)",
    url: "https://www.leiphone.com/feed",
    language: "zh",
    category: "ai_focused",
    reliabilityScore: 88,
    averageArticlesPerDay: 15,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["ai", "robotics", "autonomous-driving"],
  },
  {
    id: "ithome",
    name: "IT之家 (IT Home)",
    url: "https://www.ithome.com/rss/",
    language: "zh",
    category: "general_tech",
    reliabilityScore: 85,
    averageArticlesPerDay: 50,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["consumer-tech", "gadgets", "china"],
  },
  {
    id: "pingwest",
    name: "PingWest品玩",
    url: "https://www.pingwest.com/feed",
    language: "zh",
    category: "major_tech",
    reliabilityScore: 86,
    averageArticlesPerDay: 8,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["silicon-valley", "china-tech", "bilingual"],
  },
  {
    id: "ifanr",
    name: "爱范儿 (ifanr)",
    url: "https://www.ifanr.com/feed",
    language: "zh",
    category: "general_tech",
    reliabilityScore: 84,
    averageArticlesPerDay: 12,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["consumer", "lifestyle-tech", "reviews"],
  },
];

// ============================================
// JAPANESE SOURCES
// ============================================

export const JAPANESE_SOURCES: RSSSource[] = [
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
    id: "nikkei-tech",
    name: "日経クロステック",
    url: "https://xtech.nikkei.com/rss/index.rdf",
    language: "ja",
    category: "major_tech",
    reliabilityScore: 94,
    averageArticlesPerDay: 20,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["japan-business", "enterprise", "analysis"],
  },
  {
    id: "cnet-japan",
    name: "CNET Japan",
    url: "https://japan.cnet.com/rss/index.rdf",
    language: "ja",
    category: "major_tech",
    reliabilityScore: 88,
    averageArticlesPerDay: 15,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["japan-tech", "consumer", "reviews"],
  },
  {
    id: "gihyo-ai",
    name: "技術評論社 AI",
    url: "https://gihyo.jp/feed/rss2",
    language: "ja",
    category: "research",
    reliabilityScore: 90,
    averageArticlesPerDay: 3,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["technical", "programming", "tutorials"],
  },
  {
    id: "ascii-ai",
    name: "ASCII AI",
    url: "https://ascii.jp/cate/ai/rss.xml",
    language: "ja",
    category: "ai_focused",
    reliabilityScore: 86,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["japan-ai", "how-to", "reviews"],
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
  {
    id: "zdnet-korea",
    name: "ZDNet Korea",
    url: "https://zdnet.co.kr/rss/all_news.xml",
    language: "ko",
    category: "major_tech",
    reliabilityScore: 89,
    averageArticlesPerDay: 25,
    requiresTranslation: true,
    priority: 5,
    isActive: true,
    tags: ["korea-tech", "enterprise", "it-news"],
  },
  {
    id: "bloter",
    name: "블로터 (Bloter)",
    url: "https://www.bloter.net/feed/",
    language: "ko",
    category: "major_tech",
    reliabilityScore: 87,
    averageArticlesPerDay: 12,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["korea-it", "startups", "trends"],
  },
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
  {
    id: "etnews",
    name: "전자신문 (ETNews)",
    url: "https://www.etnews.com/rss.xml",
    language: "ko",
    category: "major_tech",
    reliabilityScore: 90,
    averageArticlesPerDay: 30,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["korea-electronics", "industry", "semiconductors"],
  },
  {
    id: "itworld-kr",
    name: "ITWorld Korea",
    url: "https://www.itworld.co.kr/rss/feed.xml",
    language: "ko",
    category: "major_tech",
    reliabilityScore: 86,
    averageArticlesPerDay: 10,
    requiresTranslation: true,
    priority: 3,
    isActive: true,
    tags: ["korea-enterprise", "it-management", "cloud"],
  },
  {
    id: "platum",
    name: "플래텀 (Platum)",
    url: "https://platum.kr/feed",
    language: "ko",
    category: "business",
    reliabilityScore: 88,
    averageArticlesPerDay: 5,
    requiresTranslation: true,
    priority: 4,
    isActive: true,
    tags: ["korea-startups", "funding", "asia-tech"],
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
  ALL_INTERNATIONAL_SOURCES,
  getSourcesByLanguage,
  getSourcesByCategory,
  getSourcesByPriority,
  getReliableSources,
  getTranslatableSources,
  getSourcesByTag,
  getSourceStatistics,
};
