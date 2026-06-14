import axios from "axios";
import { z } from "zod";
import { getLlmEndpoint, invalidateLlmConfigCache } from "@/lib/llm-config";

// Zod schemas for validating AI responses
const AnalysisResultSchema = z.object({
  index: z.number().int().min(0),
  reason: z.string(),
  category: z.string(),
  aiRelevance: z.number().int().min(0).max(100).optional(),
});

const RewriteResultSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  keywords: z.array(z.string()),
  metaDescription: z.string().min(1),
  score: z.number().int().min(0).max(1000).optional(),
});

const AggregationResultSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  keywords: z.array(z.string()),
  metaDescription: z.string().min(1),
});

// ============================================
// PROVIDER CONFIGURATION
// Reads from database (admin panel) or falls back to env vars
// ============================================

export type LlmEndpoint = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

/**
 * Resolve LLM endpoint on every call — reads from DB (cached 60s) or env fallback.
 * This ensures admin panel changes take effect within 1 minute without restart.
 */
async function resolveEndpoint(): Promise<LlmEndpoint | null> {
  try {
    const endpoint = await getLlmEndpoint();
    if (endpoint) return endpoint;
  } catch (err) {
    console.warn("⚠️ Failed to resolve LLM endpoint:", err);
  }

  // Ultimate fallback — nothing configured
  console.error(
    "❌ No LLM provider configured. Set one in Admin > LLM Provider or .env",
  );
  return null;
}

/**
 * Sanitize text for safe JSON serialization
 * Removes broken hex/unicode escapes and control characters that break API calls
 */
function sanitizeForJson(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\x[0-9a-fA-F]{0,2}/g, "") // Remove hex escapes like \x1b
    .replace(/\\u[0-9a-fA-F]{0,4}/g, "") // Remove broken unicode escapes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars
    .replace(/\\/g, "\\\\") // Escape remaining backslashes
    .trim();
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================
// CIRCUIT BREAKER PATTERN — Single Active Provider
// ============================================
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

const circuitBreakerConfig = {
  threshold: 5,
  timeout: 2 * 60 * 1000,
  halfOpenMaxCalls: 1,
};

const circuitBreaker: CircuitBreakerState = {
  state: "CLOSED",
  failureCount: 0,
  lastFailureTime: 0,
  nextAttemptTime: 0,
};

function canProceedWith(breaker: CircuitBreakerState): boolean {
  const now = Date.now();
  if (breaker.state === "OPEN") {
    if (now >= breaker.nextAttemptTime) {
      breaker.state = "HALF_OPEN";
      return true;
    }
    return false;
  }
  return true;
}

function recordProviderSuccess(breaker: CircuitBreakerState): void {
  if (breaker.state === "HALF_OPEN") breaker.state = "CLOSED";
  breaker.failureCount = 0;
}

function recordProviderFailure(
  breaker: CircuitBreakerState,
  label: string,
): void {
  breaker.failureCount++;
  breaker.lastFailureTime = Date.now();
  if (breaker.failureCount >= circuitBreakerConfig.threshold) {
    breaker.state = "OPEN";
    breaker.nextAttemptTime = Date.now() + circuitBreakerConfig.timeout;
    console.error(
      `❌ ${label} circuit breaker OPEN after ${breaker.failureCount} failures. Retry in ${circuitBreakerConfig.timeout / 1000}s`,
    );
  } else {
    console.warn(
      `⚠️ ${label} circuit: ${breaker.failureCount}/${circuitBreakerConfig.threshold} failures`,
    );
  }
}

// Legacy aliases for backward compat (batchScoreArticles uses these)
function canProceed(): boolean {
  return canProceedWith(circuitBreaker);
}
function recordSuccess(): void {
  recordProviderSuccess(circuitBreaker);
}
function recordFailure(): void {
  recordProviderFailure(circuitBreaker, "LLM");
}

/**
 * Get current circuit breaker state (for monitoring)
 */
export function getCircuitBreakerState(): { state: CircuitState } {
  return { state: circuitBreaker.state };
}

/**
 * Reset circuit breaker (for manual recovery)
 */
export function resetCircuitBreaker(): void {
  circuitBreaker.state = "CLOSED";
  circuitBreaker.failureCount = 0;
  circuitBreaker.lastFailureTime = 0;
  circuitBreaker.nextAttemptTime = 0;
  invalidateLlmConfigCache();
  console.log("🔄 Circuit breaker reset to CLOSED");
}

/**
 * Strip <think>...</think> reasoning tags from response
 */
function stripThinkingTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Call the active LLM provider (configured via Admin panel or .env fallback)
 */
async function callProvider(
  messages: DeepSeekMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  const endpoint = await resolveEndpoint();
  if (!endpoint) {
    throw new Error(
      "LLM provider not configured. Go to Admin > LLM Provider to set one.",
    );
  }

  const providerLabel = `${endpoint.baseUrl}/${endpoint.model}`;
  if (!canProceedWith(circuitBreaker)) {
    throw new Error(`LLM circuit breaker is OPEN (${providerLabel})`);
  }

  console.log(
    `🤖 LLM call → ${providerLabel} (circuit: ${circuitBreaker.state})`,
  );

  try {
    const response = await axios.post<DeepSeekResponse>(
      `${endpoint.baseUrl}/chat/completions`,
      {
        model: options.model || endpoint.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${endpoint.apiKey}`,
        },
        timeout: 120000,
      },
    );

    recordProviderSuccess(circuitBreaker);
    return response.data.choices[0]?.message?.content || "";
  } catch (error) {
    recordProviderFailure(circuitBreaker, providerLabel);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const msg = error.response?.data?.error?.message || error.message;
      console.error(`LLM API Error:`, { status, msg });

      if (
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503
      ) {
        const retryAfter = error.response?.headers?.["retry-after"];
        const err = new Error(`LLM API error (${status}): ${msg}`);
        (err as any).retryable = true;
        (err as any).retryAfter = retryAfter
          ? parseInt(retryAfter) * 1000
          : 3000;
        throw err;
      }

      throw new Error(`LLM API error (${status}): ${msg}`);
    }
    throw error;
  }
}

/**
 * Call LLM API — reads active provider from database.
 * This is the single entry point for all AI operations.
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<string> {
  if (!canProceedWith(circuitBreaker)) {
    throw new Error(
      "LLM circuit breaker is OPEN. Please try again later or check Admin > LLM Provider.",
    );
  }

  return callProvider(messages, options);
}

/**
 * Analyze news articles and select the best ones
 * ENHANCED: AI relevance check to filter out non-AI news
 * PHASE 3: Now accepts recent published articles for topic diversity enforcement
 */
export async function analyzeNewsArticles(
  articles: Array<{
    title: string;
    description: string;
    url: string;
    publishedDate?: string;
  }>,
  recentPublishedArticles: Array<{ title: string; publishedAt: Date }> = [],
): Promise<Array<{ index: number; reason: string; category: string }>> {
  // Build context section for diversity
  let diversityContext = "";
  if (recentPublishedArticles.length > 0) {
    diversityContext = `\n\n### SON 48 SAATTE YAYINLANAN HABERLER (TEKRAR ETME!):
‼️ **ÖNEMLİ: Bu konularla ilgili haberleri SEÇME, çeşitlilik için FARKLI konular tercih et!**\n\n${recentPublishedArticles.map((a, i) => `${i + 1}. "${a.title}" (${new Date(a.publishedAt).toLocaleDateString("tr-TR")})`).join("\n")}\n\n**SEÇİM KURALİ:** Yukarıdaki listede benzeri bir konu varsa, o haberi seçme. Örneğin:\n- Listede "Tesla" haberi varsa, yeni Tesla haberini seçme\n- Listede "ChatGPT" haberi varsa, yeni GPT haberini seçme\n- Listede "Google Gemini" varsa, yeni Gemini haberini seçme\n\n**YENİ ve FARKLI konuları öncele!**\n`;
  }

  const prompt = `Sen bir yapay zeka haber editörüsün. Bu haberleri analiz et ve SADECE YAPAY ZEKA İLE DOĞRUDAN İLGİLİ olanları seç.\n\n**ÖNEMLİ: YAPAY ZEKA İLE İLGİLİ OLMAYAN HABERLERTİ ASLA SEÇME!**${diversityContext}

**ÖNEMLİ: YAPAY ZEKA İLE İLGİLİ OLMAYAN HABERLERİ ASLA SEÇME!**

Haberler (0-tabanlı index kullan):
${articles
  .map(
    (article, index) => `
Index: ${index}
Başlık: ${article.title}
Açıklama: ${article.description}
URL: ${article.url}
`,
  )
  .join("\n")}

### YAPAY ZEKA İLE İLGİLİ HABER KRİTERLERİ:

✅ **KABUL EDİLEN KONULAR:**
- AI modelleri (GPT, Claude, Gemini, LLaMA, vb.)
- Machine Learning / Deep Learning
- Natural Language Processing (NLP)
- Computer Vision
- Robotik ve otonom sistemler
- AI araçları ve uygulamaları
- AI şirketleri (OpenAI, Anthropic, Google AI, vb.)
- AI etiği ve düzenlemeleri
- AI araştırmaları ve breakthrough'lar
- AI ile ilgili teknolojik gelişmeler

❌ **REDDEDİLEN KONULAR:**
- Genel ekonomi haberleri (sanayiciler, piyasalar, enflasyon)
- Genel teknoloji haberleri (AI ile ilgisi yoksa)
- Politika haberleri (AI ile ilgisi yoksa)
- Spor haberleri
- Magazin haberleri
- Genel iş dünyası haberleri
- Sadece "dijital" veya "teknoloji" kelimesi geçen ama AI ile ilgisi olmayan haberler

### ÖRNEKLER:

✅ İYİ: "OpenAI GPT-5 Modelini Tanıttı"
✅ İYİ: "Google'ın Yeni AI Asistanı Gemini 2.0"
✅ İYİ: "Yapay Zeka Etiği Konusunda Yeni Düzenlemeler"
✅ İYİ: "Tesla'nın Otonom Sürüş Sistemi Güncellendi"

❌ KÖTÜ: "Sanayiciler 2026'ya Karamsar Bakıyor"
❌ KÖTÜ: "Borsa İstanbul'da Yükseliş Devam Ediyor"
❌ KÖTÜ: "Yeni iPhone Modeli Tanıtıldı" (AI özelliği yoksa)
❌ KÖTÜ: "Elektrik Fiyatlarına Zam Geldi"

Şu formatta bir JSON dizisi ile yanıt ver (index alanı 0-tabanlı olmalı):
[
  {
    "index": 0,
    "reason": "Bu haberin neden ilginç olduğu VE yapay zeka ile nasıl ilgili olduğu",
    "category": "Şunlardan biri: Makine Öğrenmesi, Doğal Dil İşleme, Bilgisayarlı Görü, Robotik, Yapay Zeka Etiği, Yapay Zeka Araçları, Sektör Haberleri, Araştırma",
    "aiRelevance": 95
  }
]

Şu özelliklere sahip 2-3 haber seç:
1. **MUTLAKA yapay zeka ile DOĞRUDAN ilgili olmalı** (aiRelevance >= 70)
2. En haber değeri taşıyan ve ilginç olanlar
3. Güncel ve alakalı olanlar
4. **ÖNEMLİ: Konularda ÇEŞİTLİLİK - son 48 saatte yayınlanan haberlerle aynı konudan SEÇME!**
5. **YENİ ve FARKLI içerikler öncelikli olmalı**
6. Genel yapay zeka ile ilgilenen kitle için uygun olanlar

**EĞER HİÇBİR HABER YAPAY ZEKA İLE İLGİLİ DEĞİLSE, BOŞ DİZİ DÖNDÜR: []**`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen uzman bir yapay zeka haber editörüsün. SADECE yapay zeka ile DOĞRUDAN ilgili haberleri seç. Genel ekonomi, politika veya teknoloji haberlerini ASLA seçme. Her zaman sadece geçerli JSON ile yanıt ver.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {},
  );

  // Extract JSON from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse DeepSeek response");
  }

  // Validate AI response with Zod schema to prevent invalid data
  const parsedResults = JSON.parse(jsonMatch[0]);
  const results = z.array(AnalysisResultSchema).safeParse(parsedResults);

  if (!results.success) {
    console.error("❌ AI response validation failed:", results.error);
    throw new Error(
      `Invalid AI response structure: ${results.error.issues[0]?.message}`,
    );
  }

  // Filter by AI relevance score (must be >= 80 for strict AI filtering)
  const filtered = results.data.filter((item: any) => {
    const relevance = item.aiRelevance || 0;
    const title = articles[item.index]?.title?.toLowerCase() || "";

    // Hard reject: Keywords that indicate non-AI news
    const nonAIKeywords = [
      "nuclear",
      "nükleer",
      "ukraine",
      "ukrayna",
      "war",
      "savaş",
      "election",
      "seçim",
      "politics",
      "politika",
      "military",
      "askeri",
      "climate",
      "iklim",
      "earthquake",
      "deprem",
      "flood",
      "sel",
      "sports",
      "spor",
      "football",
      "futbol",
      "basketball",
      "celebrity",
      "ünlü",
      "entertainment",
      "eğlence",
    ];

    const hasNonAIKeyword = nonAIKeywords.some((keyword) =>
      title.includes(keyword),
    );
    if (hasNonAIKeyword) {
      console.log(
        `🚫 Hard reject (non-AI keyword): ${articles[item.index]?.title}`,
      );
      return false;
    }

    if (relevance < 80) {
      console.log(
        `🗑️ AI relevance too low (${relevance}%): ${articles[item.index]?.title}`,
      );
      return false;
    }
    return true;
  });

  console.log(
    `✅ ${filtered.length}/${results.data.length} haber AI relevance kontrolünden geçti`,
  );

  return filtered;
}

/**
 * Rewrite article content to be unique and SEO-optimized
 */
export async function rewriteArticle(
  originalTitle: string,
  originalContent: string,
  category: string,
  contextArticles: Array<{ title: string; slug: string }> = [],
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
}> {
  const contextText =
    contextArticles.length > 0
      ? `\n\n### İÇ LİNKLEME (İSTEĞE BAĞLI - ABARTMA!):
Aşağıdaki haberler sitemizde mevcut. **SADECE GERÇEKTEN İLGİLİYSE** ve **DOĞAL BİR YERİNE OTURURSA** EN FAZLA 1-2 tanesi link olarak eklenebilir.

⚠️ KURALLAR:
- Zorla link ekleme, doğal olmalı
- Her habere link eklemeye çalışma
- Link eklemeden de makale tamamlanabilir
- Sadece DOĞRUDAN İLGİLİ olanları kullan\n\nMevcut haberler:\n${contextArticles
          .slice(0, 3)
          .map((a) => `- ${a.title} → /news/${a.slug}`)
          .join("\n")}`
      : "";

  // Get current date for accurate reporting
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleDateString("tr-TR", {
    month: "long",
  });
  const formattedDate = currentDate.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `Sen profesyonel, saygın ve güvenilir bir TV Haber Sunucusu ve Editörüsün. Görevin, sana verilen ham haberi alıp, geniş kitleler için anlaşılır, akıcı ve tamamen tarafsız bir haber metnine dönüştürmek.${contextText}

⚠️ KRİTİK TARİH BİLGİSİ:
- BUGÜNÜN TARİHİ: ${formattedDate}
- MEVCUT YIL: ${currentYear}
- İçerikte geçen "2024", "2023", "geçen yıl" gibi eski tarih referansları MUTLAKA güncellenmeli!
- Eğer orijinal haberde eski bir tarih varsa, haberi ${currentYear} yılı perspektifinden yaz.
- Başlıkta YIL KULLANIYORSAN mutlaka ${currentYear} yaz (2024, 2023 gibi eski yıllar YASAK).
- "Bu yıl" derken ${currentYear}'ı kastet, "geçen yıl" derken ${currentYear - 1}'u kastet.

HEDEF: Bu yazıyı okuyan kişi, ciddi bir haber bültenini izliyormuş gibi hissetmeli. "Ben", "Biz", "Kanaatimce" gibi ifadeler ASLA kullanılmamalı. Tamamen 3. tekil şahıs objektif anlatım kullanılmalı.

Orijinal Başlık: ${originalTitle}
Kategori: ${category}

Orijinal İçerik:
${originalContent}

### HABER SUNUCUSU YAZIM KURALLARI (MANİFESTO):

1. **TON VE ÜSLUP (News Anchor Persona):**
   - **Objektif ve Mesafeli:** "Harika bir gelişme" yerine "Önemli bir gelişme" de. Asla kendi duygularını katma.
   - **YASAKLI KELİMELER:** "Ben", "Biz", "Siz", "Düşünüyorum", "İnanıyorum", "Geçenlerde", "Gördüğüm kadarıyla".
   - **Doğrudan Başlangıç:** Hikaye anlatmaya çalışma. Haberin özü neyse direkt onunla başla.
     * KÖTÜ: "Geçenlerde bir makale okudum..."
     * İYİ: "OpenAI, yeni yapay zeka modelini tanıttı." veya "Teknoloji dünyasında gözler Google'ın son hamlesine çevrildi."

2. **DİL VE ANLATIM (Sade Türkçe):**
   - **Sadeleştir:** Karmaşık teknik terimleri halkın anlayacağı dille açıkla. (Örn: "LLM" yerine "Geniş Dil Modeli" veya "Yapay Zeka sistemi").
   - **Kısa ve Net Cümleler:** Zincirleme tamlamalarla dolu uzun cümlelerden kaçın.
   - **Türkçe Karşılıklar:** Mümkünse İngilizce terimlerin Türkçe karşılıklarını kullan veya parantez içinde açıkla.

3. **YAPI VE AKIŞ:**
   - **Piramit Tekniği:** En önemli bilgiyi en başta ver. Detayları aşağıya sakla.
   - **Başlık:** Merak uyandıran ama "Clickbait" olmayan, haberin özünü veren 50-60 karakterlik başlık.
   - **Alt Başlıklar:** Okumayı kolaylaştıran H2 başlıkları kullan.

4. **KALİTE PUANLAMASI (CRITICAL):**
   - Haberin kaynağını, önemini ve netliğini analiz et.
   - 0 ile 1000 arasında bir "Haber Değeri Puanı" (score) ver.
   - 750 ve üzeri: Yayınlanmaya hazır, net, önemli ve hatasız.
   - 750 altı: Muğlak, spekülatif veya düzenleme gerektiriyor.

5. **SEO & METADATA (CRITICAL):**
   - **Başlık (Title):** 50-60 karakter arası, anahtar kelimeyi içeren, tıklanma oranı yüksek ama dürüst başlık.
   - **Meta Açıklama (Description):** 150-160 karakter arası, özgün, merak uyandıran ve özetleyen açıklama.
   - **Anahtar Kelimeler (Keywords):** Haberin özüyle ilgili, aranma hacmi yüksek 5-8 adet long-tail anahtar kelime.
   - **Soru-Cevap (FAQ):** ASLA "Sıkça Sorulan Sorular" veya "Soru-Cevap" bölümü ekleme. Metin akıcı bir makale olmalı.

JSON formatında yanıt ver:
{
  "title": "SEO Uyumlu Başlık",
  "excerpt": "Ana sayfada görünecek, haberin özeti (1-2 cümle, tarafsız)",
  "content": "Tamamen HTML formatlı (<p>, <h2>, <ul>), 3. şahıs anlatımlı haber metni (FAQ YOK)",
  "keywords": ["anahtar1", "anahtar2"],
  "metaDescription": "SEO uyumlu meta açıklama",
  "score": 850
}`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen dünyanın en iyi teknoloji editörüsün. Yazıların o kadar doğal ki, Turing testini geçmekle kalmıyor, insanlardan daha 'insan' tınlıyor. Asla AI gibi yazma. Sadece geçerli JSON yanıtı ver.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      maxTokens: 4000,
      temperature: 1.0,
    },
  );

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse DeepSeek response");
  }

  // Validate AI response with Zod schema
  const parsedResult = JSON.parse(jsonMatch[0]);
  const result = RewriteResultSchema.safeParse(parsedResult);

  if (!result.success) {
    console.error("❌ Rewrite response validation failed:", result.error);
    throw new Error(
      `Invalid rewrite response: ${result.error.issues[0]?.message}`,
    );
  }

  return result.data;
}

/**
 * Entity-based visual style mappings for consistent brand imagery
 */
const ENTITY_VISUAL_STYLES: Record<string, string> = {
  // Company hints (subtle, not dominating)
  openai: "emerald accent tones, minimal tech aesthetic",
  nvidia: "GPU hardware close-up, green circuit traces",
  google: "multicolor accents on clean white surface",
  microsoft: "azure blue gradient, cloud infrastructure",
  meta: "purple-blue VR environment, spatial computing",
  apple: "premium metallic finish, minimalist product shot",
  tesla: "electric vehicle technology, blue energy lines",
  anthropic: "warm amber interface glow, safety-focused design",
  amazon: "cloud server architecture, orange accent lighting",
  // Technology hints
  robot: "articulated robotic arm in motion, industrial lab",
  autonomous: "LiDAR point cloud visualization, road environment",
  drone: "quadcopter in flight, landscape below",
  chip: "silicon die macro, golden wire bonds, clean room",
  quantum: "dilution refrigerator interior, superconducting circuits",
  // Domain hints
  healthcare: "medical imaging display, clinical technology",
  finance: "algorithmic trading terminal, data visualization",
  gaming: "GPU rendering pipeline, real-time graphics",
  security: "encrypted data flow visualization, firewall architecture",
};

const NEWS_SAFE_SCENE_BY_KEYWORD: Array<{ keywords: string[]; scene: string }> =
  [
    {
      keywords: [
        "leak",
        "source code",
        "github",
        "repository",
        "repo",
        "sız",
        "sizdi",
        "kaldır",
        "takedown",
      ],
      scene:
        "close-up of a secure code repository dashboard on dark monitors, redacted commit panels, incident response war room, editorial photo",
    },
    {
      keywords: [
        "funding",
        "investment",
        "series",
        "valuation",
        "yatırım",
        "finansman",
      ],
      scene:
        "modern venture capital meeting room with deal documents, analytics wall display, glass architecture, editorial business photo",
    },
    {
      keywords: [
        "chip",
        "gpu",
        "semiconductor",
        "nvidia",
        "amd",
        "intel",
        "çip",
        "yarı iletken",
      ],
      scene:
        "macro shot of advanced ai chip on circuit board, clean lab environment, precision hardware editorial photo",
    },
    {
      keywords: [
        "robot",
        "robotics",
        "drone",
        "otonomous",
        "autonomous",
        "robotik",
      ],
      scene:
        "industrial robotics lab with articulated machine hardware, testing area, clean engineering editorial photo",
    },
    {
      keywords: [
        "model",
        "llm",
        "claude",
        "chatgpt",
        "gemini",
        "deepseek",
        "assistant",
        "agent",
      ],
      scene:
        "high-end ai development control room with code dashboards, compliance screens, empty operator space, editorial technology photo",
    },
    {
      keywords: [
        "security",
        "breach",
        "hack",
        "vulnerability",
        "exploit",
        "güvenlik",
        "ihlal",
      ],
      scene:
        "cybersecurity operations center with threat map displays, server racks, incident alert panels, editorial photo",
    },
  ];

/**
 * Extract entity from title for visual style matching
 */
function detectEntityForVisual(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  const entities = Object.keys(ENTITY_VISUAL_STYLES);

  for (const entity of entities) {
    if (lowerTitle.includes(entity)) {
      return entity;
    }
  }

  // Check for common keywords
  if (lowerTitle.includes("gpt") || lowerTitle.includes("chatgpt"))
    return "openai";
  if (lowerTitle.includes("gemini") || lowerTitle.includes("bard"))
    return "google";
  if (lowerTitle.includes("claude")) return "anthropic";
  if (lowerTitle.includes("copilot")) return "microsoft";
  if (lowerTitle.includes("llama")) return "meta";
  if (lowerTitle.includes("siri")) return "apple";
  if (lowerTitle.includes("alexa")) return "amazon";

  return null;
}

function buildSafeNewsScene(
  title: string,
  content: string,
  category: string,
): string {
  const lower =
    `${title} ${content.substring(0, 500)} ${category}`.toLowerCase();

  for (const rule of NEWS_SAFE_SCENE_BY_KEYWORD) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.scene;
    }
  }

  return "clean newsroom-style technology illustration of the article subject, devices and interfaces only, editorial photo";
}

/**
 * Generate AI image prompt from article content
 * ENHANCED: Realistic, journalistic, topic-specific prompts
 * V2: Better keyword extraction and subject detection
 */
export async function generateImagePrompt(
  title: string,
  content: string,
  category: string,
): Promise<string> {
  // Pre-analyze content for key subjects
  const combinedText = `${title} ${content.substring(0, 800)}`.toLowerCase();

  // Extract key entities for better prompt targeting
  const entityHints: string[] = [];

  // Company detection
  const companies = [
    "openai",
    "google",
    "microsoft",
    "apple",
    "nvidia",
    "tesla",
    "meta",
    "amazon",
    "anthropic",
    "deepseek",
    "mistral",
    "hugging face",
    "stability ai",
    "midjourney",
    "adobe",
    "samsung",
    "intel",
    "amd",
    "qualcomm",
    "ibm",
    "oracle",
    "salesforce",
  ];
  for (const company of companies) {
    if (combinedText.includes(company)) {
      entityHints.push(`COMPANY: ${company.toUpperCase()}`);
    }
  }

  // Product/Tech detection
  const products = [
    "chatgpt",
    "gpt-4",
    "gpt-5",
    "gemini",
    "claude",
    "copilot",
    "sora",
    "dall-e",
    "midjourney",
    "stable diffusion",
    "llama",
    "mistral",
    "iphone",
    "pixel",
    "vision pro",
    "quest",
    "robot",
    "drone",
    "ev",
    "chip",
    "gpu",
    "cpu",
    "server",
    "quantum",
  ];
  for (const product of products) {
    if (combinedText.includes(product)) {
      entityHints.push(`PRODUCT/TECH: ${product.toUpperCase()}`);
    }
  }

  // Event/Topic detection
  const events = [
    "launch",
    "release",
    "announce",
    "funding",
    "acquisition",
    "partnership",
    "lawsuit",
    "ban",
    "regulation",
    "breach",
    "hack",
    "layoff",
    "ipo",
    "conference",
  ];
  for (const event of events) {
    if (combinedText.includes(event)) {
      entityHints.push(`EVENT: ${event.toUpperCase()}`);
    }
  }

  const entityContext =
    entityHints.length > 0
      ? `\n\nDETECTED KEY SUBJECTS:\n${entityHints.join("\n")}`
      : "";

  // Use entity-based visual style if detected
  const detectedEntity = detectEntityForVisual(title);
  const entityStyle = detectedEntity
    ? ENTITY_VISUAL_STYLES[detectedEntity]
    : null;

  const entityHint = entityStyle ? `\nENTITY STYLE HINT: ${entityStyle}` : "";
  const safeScene = buildSafeNewsScene(title, content, category);

  // Extract a unique content excerpt — skip first 100 chars to avoid boilerplate
  const contentExcerpt = content
    .substring(100, 600)
    .replace(/\n+/g, " ")
    .trim();

  const prompt = `You are creating a safe editorial image prompt for a technology news story.

ARTICLE TITLE: ${title}
CATEGORY: ${category}
CONTENT EXCERPT: ${contentExcerpt.substring(0, 300)}
SAFE SCENE BASE: ${safeScene}${entityContext}${entityHint}

YOUR TASK:
Create a single concise image description that captures the SPECIFIC subject of THIS article.

Think about: what OBJECT, DEVICE, INTERFACE, LAB, SERVER ROOM, REPOSITORY VIEW, or CORPORATE ENVIRONMENT best represents this story? Be literal and concrete.

ABSOLUTE RULES:
1. NO humans, faces, hands, body parts — EVER
2. NO text, logos, brand names, or writing visible in the image
3. NO NSFW, no sensual, no lingerie, no skin focus, no bedroom, no censorship themes
4. NO generic clichés: "holographic brain", "digital network", "glowing circuits", "abstract data", "mysterious woman", "cinematic character"
5. Focus on TANGIBLE subjects: specific devices, dashboards, hardware, server rooms, offices, labs
6. Prefer square-safe compositions with one clear subject, clean background, editorial realism
7. Output ONLY the prompt text in English, max 170 chars. No explanation, no quotes.`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "You are a news photo editor. Return one short, brand-safe, editorial image prompt in English. No humans, no NSFW, no text, no logos, no characters, no body parts. Focus on tangible tech/news scenes only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      maxTokens: 200,
      temperature: 0.65,
    },
  );

  // Clean up the response
  let cleanPrompt = response.trim();

  // Remove quotes if present
  cleanPrompt = cleanPrompt.replace(/^["']|["']$/g, "");

  // If response contains reasoning tags or multiple lines, extract the actual prompt
  if (cleanPrompt.includes("<think>") || cleanPrompt.includes("\n\n")) {
    const lines = cleanPrompt.split("\n").filter((line) => line.trim());
    cleanPrompt = lines[lines.length - 1] || cleanPrompt;
  }

  // Remove any remaining tags
  cleanPrompt = cleanPrompt.replace(/<[^>]+>/g, "").trim();
  cleanPrompt = cleanPrompt
    .replace(
      /\b(nsfw|nude|naked|lingerie|sensual|censored|erotic|seductive|woman|man|girl|boy)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  // CRITICAL: Enforce max length (matches pollinations.ts 200 char URL limit)
  if (cleanPrompt.length > 200) {
    console.warn(
      `⚠️ Prompt too long (${cleanPrompt.length} chars), truncating to 200`,
    );
    cleanPrompt = cleanPrompt.substring(0, 197) + "...";
  }

  // Fallback if empty or too short
  if (!cleanPrompt || cleanPrompt.length < 20) {
    console.warn("⚠️  DeepSeek returned empty/short prompt, using fallback");
    // Topic-based fallback (NO HUMANS!)
    const topicKeywords = title.toLowerCase();
    if (topicKeywords.includes("security") || topicKeywords.includes("hack")) {
      cleanPrompt =
        "Cybersecurity operations center, threat monitoring screens, empty workstations, professional setting, no people";
    } else if (
      topicKeywords.includes("claude") ||
      topicKeywords.includes("source code") ||
      topicKeywords.includes("github") ||
      topicKeywords.includes("repo") ||
      topicKeywords.includes("sız")
    ) {
      cleanPrompt =
        "Secure code repository dashboard on dual monitors, incident response room, redacted panels, editorial technology photo";
    } else if (
      topicKeywords.includes("launch") ||
      topicKeywords.includes("release")
    ) {
      cleanPrompt =
        "Product reveal stage, tech conference setup, spotlight on device, professional photography, no people";
    } else if (
      topicKeywords.includes("invest") ||
      topicKeywords.includes("funding")
    ) {
      cleanPrompt =
        "Modern tech company headquarters exterior, glass building, corporate architecture, professional photography, no people";
    } else {
      cleanPrompt =
        "Modern technology workspace interior, clean professional setting, natural lighting, editorial style, no humans";
    }
  }

  // CRITICAL: Remove any human-related words AI might have added.
  // FIX (2026-02-28): Use negative lookbehind (?<![Nn][Oo]\s) so that words
  // inside "no people", "no humans" etc. are preserved — previously the regex
  // stripped "people" from "no people" producing the broken "no , no humans" URL.
  const humanPatterns = [
    /(?<![Nn][Oo]\s)\b(person|people|man|woman|human|face|portrait|silhouette|figure|employee|worker|user|staff)\b/gi,
    /(?<![Nn][Oo]\s)\b(head|hand|arm|leg|body|finger|eye|mouth|profile)\b/gi,
    /(?<![Nn][Oo]\s)\b(businessman|businesswoman|professional|executive|ceo)\b/gi,
  ];

  for (const pattern of humanPatterns) {
    cleanPrompt = cleanPrompt.replace(pattern, "").replace(/\s+/g, " ").trim();
  }

  // CRITICAL: Add strong negative prompt suffix for image generation
  const noHumansSuffix =
    ", no people, no humans, no faces, no hands, no body parts, empty scene";

  const noHumansKeywords = ["no people", "no humans", "no faces"];
  const hasNoHumansKeyword = noHumansKeywords.some((keyword) =>
    cleanPrompt.toLowerCase().includes(keyword),
  );

  if (!hasNoHumansKeyword) {
    // Truncate to make room for suffix
    const maxBaseLength = 150 - noHumansSuffix.length;
    if (cleanPrompt.length > maxBaseLength) {
      cleanPrompt = cleanPrompt.substring(0, maxBaseLength - 3) + "...";
    }
    cleanPrompt += noHumansSuffix;
    console.log("✅ Added strong negative prompt suffix");
  }

  console.log(`📝 Final prompt (${cleanPrompt.length} chars): ${cleanPrompt}`);

  return cleanPrompt;
}

/**
 * Aggregate multiple source articles about the same topic into one comprehensive article
 * This synthesizes information from 3+ sources covering the same story
 */
export async function aggregateMultiSourceArticles(
  articles: Array<{
    title: string;
    content: string;
    source: string;
    url: string;
  }>,
  topic: string,
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
  sources: Array<{ name: string; url: string }>;
}> {
  if (articles.length < 2) {
    throw new Error("Aggregation requires at least 2 articles");
  }

  const MIN_AGGREGATION_ARTICLES = 2; // Minimum sources for aggregation

  // Get current date for accurate year references
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const formattedDate = currentDate.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sourcesText = articles
    .map(
      (a, i) =>
        `--- KAYNAK ${i + 1}: ${a.source} ---\nBaşlık: ${a.title}\nURL: ${a.url}\n\nİçerik:\n${a.content.substring(0, 2000)}`,
    )
    .join("\n\n");

  const prompt = `Sen deneyimli bir haber editörüsün. Aşağıda AYNI KONU hakkında ${articles.length} FARKLI KAYNAKTAN haberler var.

⚠️ KRİTİK TARİH BİLGİSİ:
- BUGÜNÜN TARİHİ: ${formattedDate}
- MEVCUT YIL: ${currentYear}
- Başlık veya içerikte yıl kullanıyorsan MUTLAKA ${currentYear} yaz!
- Kaynaklardaki eski tarih referansları (2024, 2023 gibi) varsa ${currentYear}'a GÜNCELLE!

Görevin: Bu haberleri BİRLEŞTİREREK tek bir kapsamlı, özgün ve derin analiz içeren haber makalesi oluştur.

KONU: ${topic}

${sourcesText}

### AGGREGATION KURALLARI:

1. **SENTEZ YAP, KOPYALAMA:**
   - Her kaynaktaki benzersiz bilgileri birleştir
   - Çelişen bilgileri "X kaynağına göre... ancak Y kaynağı..." şeklinde sun
   - Ortak noktaları pekiştir, farklı bakış açılarını zenginleştir

2. **KAYNAK ATFİ:**
   - Önemli bilgilerde kaynağı belirt: "Reuters'a göre...", "TechCrunch'ın haberine göre..."
   - Tüm kaynakların katkısını içeriğe yansıt

3. **DERINLIK EKLE:**
   - Sadece haberleri birleştirme, ANALIZ ekle
   - "Bu gelişmenin sektöre etkisi...", "Uzmanlar bu adımın..." gibi yorumlar
   - Bağlam sağla: Geçmiş gelişmeler, gelecek beklentiler

4. **YAPI:**
   - Güçlü, merak uyandıran başlık (50-60 karakter)
   - Piramit tekniği: En önemli bilgi en üstte
   - H2 alt başlıklarla organize et
   - "Kaynaklardan Derleme" veya "Çoklu Kaynak" gibi ifadeler KULLANMA

5. **SEO:**
   - Ana anahtar kelimeyi başlık ve ilk paragrafta kullan
   - Long-tail keywords üret
   - Meta açıklama 150-160 karakter

6. **UZUNLUK:**
   - Minimum 500 kelime (daha fazla kaynak = daha uzun makale)
   - Tek kaynak haberinden EN AZ 1.5x daha kapsamlı olmalı

JSON formatında yanıt ver:
{
  "title": "Birleştirilmiş haber başlığı",
  "excerpt": "Ana sayfada görünecek 2-3 cümlelik özet",
  "content": "HTML formatlı (<p>, <h2>, <ul>) tam makale metni",
  "keywords": ["anahtar1", "anahtar2", "anahtar3", "anahtar4", "anahtar5"],
  "metaDescription": "SEO uyumlu meta açıklama (150-160 karakter)"
}`;

  console.log(`🔗 Aggregating ${articles.length} sources about: ${topic}`);

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen dünyanın en iyi investigative journalism editörüsün. Birden fazla kaynağı harmanlayarak derin, kapsamlı ve özgün haberler üretirsin. Sadece geçerli JSON yanıtı ver.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      maxTokens: 6000,
      temperature: 0.9,
    },
  );

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse DeepSeek aggregation response");
  }

  // Validate AI response with Zod schema
  const parsedResult = JSON.parse(jsonMatch[0]);
  const result = AggregationResultSchema.safeParse(parsedResult);

  if (!result.success) {
    console.error("❌ Aggregation response validation failed:", result.error);
    throw new Error(
      `Invalid aggregation response: ${result.error.issues[0]?.message}`,
    );
  }

  // Add source references and create final result
  const aggregatedResult = {
    ...result.data,
    sources: articles.map((a) => ({
      name: a.source,
      url: a.url,
    })),
  };

  console.log(`✅ Aggregated article: ${aggregatedResult.title}`);
  console.log(
    `   Sources: ${aggregatedResult.sources.map((s: { name: string }) => s.name).join(", ")}`,
  );

  return aggregatedResult;
}

/**
 * Rewrite article with admin note/instruction
 * Used for re-evaluating existing articles with specific corrections
 */
export async function rewriteArticleWithNote(
  originalTitle: string,
  originalContent: string,
  category: string,
  adminNote: string,
  contextArticles: Array<{
    title: string;
    excerpt: string;
    keywords: string[];
  }> = [],
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
  score: number;
}> {
  // Get current date for accurate reporting
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const formattedDate = currentDate.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const contextText =
    contextArticles.length > 0
      ? `\n\n### SON HABERLER (Tekrar Etme):\n${contextArticles
          .slice(0, 5)
          .map((a) => `- ${a.title}`)
          .join("\n")}`
      : "";

  const prompt = `Sen profesyonel bir haber editörüsün. Sana verilen haberi, ADMİN NOTU'ndaki talimatları dikkate alarak yeniden düzenleyeceksin.

### ⚠️ KRİTİK TARİH BİLGİSİ:
- BUGÜNÜN TARİHİ: ${formattedDate}
- MEVCUT YIL: ${currentYear}
- Eski tarih referansları (2024, 2023 gibi) varsa ${currentYear}'a GÜNCELLE!
- Başlıkta yıl varsa MUTLAKA ${currentYear} olmalı!

### ADMİN NOTU (ÖNCELİKLİ TALİMAT):
${adminNote}

### ⚠️ KRİTİK: Admin notundaki düzeltmeleri/talepleri MUTLAKA uygula!

---

Orijinal Başlık: ${originalTitle}
Kategori: ${category}
${contextText}

Orijinal İçerik:
${originalContent}

---

### GÖREV:
1. Admin notundaki talimatları ÖNCELİKLİ olarak uygula
2. Haberin doğruluğunu, güncelliğini ve kalitesini artır
3. TARİHLERİ KONTROL ET - Eski yılları (2024, 2023) ${currentYear}'a güncelle
4. Türkçe dil bilgisi ve akıcılığı kontrol et
5. SEO uyumluluğunu sağla
6. Haber Değeri Puanı (0-1000) ver

### ÇIKTI FORMATI (JSON):
{
  "title": "Düzeltilmiş/Güncellenmiş başlık (50-60 karakter)",
  "excerpt": "Özet (1-2 cümle)",
  "content": "HTML formatlı (<p>, <h2>, <ul>) tam içerik",
  "keywords": ["anahtar1", "anahtar2", "..."],
  "metaTitle": "SEO başlık (50-60 karakter)",
  "metaDescription": "Meta açıklama (150-160 karakter)",
  "score": 850
}`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen uzman bir haber editörüsün. Admin talimatlarını harfiyen uygulayarak haberi güncelle. Sadece geçerli JSON yanıtı ver.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      maxTokens: 4000,
      temperature: 0.7,
    },
  );

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse DeepSeek response for re-evaluation");
  }

  const parsedResult = JSON.parse(jsonMatch[0]);

  // Ensure all fields exist with defaults
  return {
    title: parsedResult.title || originalTitle,
    excerpt: parsedResult.excerpt || "",
    content: parsedResult.content || originalContent,
    keywords: parsedResult.keywords || [],
    metaTitle: parsedResult.metaTitle || parsedResult.title || originalTitle,
    metaDescription: parsedResult.metaDescription || parsedResult.excerpt || "",
    score: parsedResult.score || 700,
  };
}

/**
 * Batch score articles for relevance filter (Gemini API compatibility wrapper)
 * Returns same format as Gemini's batchScoreArticles for drop-in replacement
 */
export async function batchScoreArticles(
  articles: Array<{
    title: string;
    description: string;
    source?: string;
    publishedDate?: string;
    trendScore?: number;
  }>,
): Promise<
  Array<{ score: number; reasoning: string; category: string; tags: string[] }>
> {
  if (!DEEPSEEK_API_KEY && !KILO_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY or KILO_API_KEY is required");
  }

  if (!canProceed()) {
    throw new Error(
      "DeepSeek and Kilo Gateway circuit breakers are OPEN - too many recent failures",
    );
  }

  const articlesText = articles
    .map(
      (article, index) => `
--- MAKALE ${index + 1} ---
Başlık: ${sanitizeForJson(article.title)}
Açıklama: ${sanitizeForJson(article.description)}
Kaynak: ${article.source || "Bilinmiyor"}
Yayın Tarihi: ${article.publishedDate || "Bilinmiyor"}
Trend Skoru: ${article.trendScore || 0}
`,
    )
    .join("\n");

  const prompt = `Bu ${articles.length} haber makalesini Türk AI/teknoloji haber platformu için değerlendir.

${articlesText}

PUANLAMA KRİTERLERİ (0-100):
1. Haber Değeri (0-30): AI/teknoloji profesyonelleri için önemli/ilginç mi?
2. Güncellik (0-20): Ne kadar yeni ve zamanında?
3. Kaynak Otoritesi (0-20): Kaynak güvenilir ve otoriter mi?
4. İçerik Derinliği (0-15): Yeterli bilgi sağlıyor mu?
5. Hedef Kitle Uyumu (0-15): Türk AI/teknoloji kitlesi için uygun mu?

EŞIK: >= 35 puan alan makaleler yayınlanacak.

ÖNEMLİ - YOUTUBE İÇERİK KURALI:
YouTube video başlıkları clickbait olabilir ama içerik değerli olabilir.
Başlığın clickbait olması skoru düşürmemeli — konunun AI/teknoloji ile ilgili olup olmadığına bak.
AI şirket haberleri, model duyuruları, regülasyon, AI politikaları gibi konular en az 45 puan almalı.
Genel AI eğitim/tutorial içerikleri en az 35 puan almalı.

KATEGORİ SEÇENEKLERİ (sadece bu slug'lardan birini kullan):
- ai-modelleri (AI modelleri, LLM'ler, yeni model duyuruları)
- sektor-is-dunyasi (şirket haberleri, yatırımlar, satın almalar)
- ai-araclari-urunler (AI araçları, ürün lansmanları, yazılımlar)
- robotik-otonom (robotik, otonom sistemler, drone'lar)
- etik-guvenlik-regulasyon (AI etiği, güvenlik, yasal düzenlemeler)
- bilim-arastirma (akademik araştırmalar, bilimsel keşifler)
- ai-toplum (AI'ın topluma etkisi, iş gücü, eğitim)

JSON dizisi ile yanıt ver (makale başına bir nesne):
[
  {
    "score": 85,
    "reasoning": "Büyük AI şirketi duyurusu, çok alakalı",
    "category": "sektor-is-dunyasi",
    "tags": ["openai", "gpt-5", "duyuru"]
  },
  ...
]

AI/teknoloji haberleri için cömert ol — gerçekten alakasız olan içerikleri reddet ama AI ile ilgili haberlere en az 45 puan ver.
Clickbait başlıklar skoru düşürmemeli — konunun özüne bak.
Her makalenin en az 1 güçlü yönünü değerlendir.`;

  try {
    const response = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "Sen Türk AI/teknoloji haber platformu için makale kalitesi ve alakasını değerlendiren uzman bir haber editörüsün. Sadece geçerli JSON dizisi ile yanıt ver.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        temperature: 0.3,
        maxTokens: 4000,
      },
    );

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse DeepSeek response");
    }

    recordSuccess();
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    recordFailure();
    throw error;
  }
}

export default {
  callDeepSeek,
  analyzeNewsArticles,
  rewriteArticle,
  rewriteArticleWithNote,
  generateImagePrompt,
  aggregateMultiSourceArticles,
  batchScoreArticles,
};
