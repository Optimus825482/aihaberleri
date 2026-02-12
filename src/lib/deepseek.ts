import axios from "axios";
import { z } from "zod";

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
// Primary: NVIDIA NIM (Qwen3), Fallback: DeepSeek
// ============================================

const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_MODEL =
  process.env.NVIDIA_MODEL || "qwen/qwen3-next-80b-a3b-instruct";

const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!NVIDIA_API_KEY) {
  console.warn("⚠️  NVIDIA_API_KEY is not set — will use DeepSeek as primary");
}
if (!DEEPSEEK_API_KEY) {
  console.warn("⚠️  DEEPSEEK_API_KEY is not set");
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
// CIRCUIT BREAKER PATTERN — Per-Provider
// Primary: NVIDIA NIM (Qwen3), Fallback: DeepSeek
// ============================================
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

const circuitBreakerConfig = {
  threshold: 3, // Open circuit after 3 consecutive failures
  timeout: 5 * 60 * 1000, // 5 minutes before trying again
  halfOpenMaxCalls: 1,
};

// Separate circuit breakers for each provider
const nvidiaCircuitBreaker: CircuitBreakerState = {
  state: "CLOSED",
  failureCount: 0,
  lastFailureTime: 0,
  nextAttemptTime: 0,
};

const deepSeekCircuitBreaker: CircuitBreakerState = {
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
  if (breaker.state === "HALF_OPEN") {
    breaker.state = "CLOSED";
  }
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
  return (
    canProceedWith(nvidiaCircuitBreaker) ||
    canProceedWith(deepSeekCircuitBreaker)
  );
}
function recordSuccess(): void {
  // Called from batchScoreArticles — no-op, handled internally
}
function recordFailure(): void {
  // Called from batchScoreArticles — no-op, handled internally
}

/**
 * Get current circuit breaker states (for monitoring)
 */
export function getCircuitBreakerState(): {
  nvidia: CircuitState;
  deepseek: CircuitState;
} {
  return {
    nvidia: nvidiaCircuitBreaker.state,
    deepseek: deepSeekCircuitBreaker.state,
  };
}

/**
 * Reset circuit breakers (for manual recovery)
 */
export function resetCircuitBreaker(): void {
  for (const breaker of [nvidiaCircuitBreaker, deepSeekCircuitBreaker]) {
    breaker.state = "CLOSED";
    breaker.failureCount = 0;
    breaker.lastFailureTime = 0;
    breaker.nextAttemptTime = 0;
  }
  console.log("🔄 All circuit breakers reset to CLOSED");
}

/**
 * Strip Qwen3 <think>...</think> reasoning tags from response
 */
function stripThinkingTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Call a single LLM provider (NVIDIA NIM or DeepSeek)
 */
async function callProvider(
  provider: "nvidia" | "deepseek",
  messages: DeepSeekMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  const isNvidia = provider === "nvidia";
  const apiUrl = isNvidia ? NVIDIA_API_URL : DEEPSEEK_API_URL;
  const apiKey = isNvidia ? NVIDIA_API_KEY : DEEPSEEK_API_KEY;
  const model = isNvidia ? NVIDIA_MODEL : options.model || "deepseek-chat";
  const breaker = isNvidia ? nvidiaCircuitBreaker : deepSeekCircuitBreaker;
  const providerLabel = isNvidia ? `NVIDIA/${NVIDIA_MODEL}` : "DeepSeek-chat";

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()} API key not configured`);
  }
  if (!canProceedWith(breaker)) {
    throw new Error(`${provider.toUpperCase()} circuit breaker is OPEN`);
  }

  console.log(`🤖 LLM call → ${providerLabel} (circuit: ${breaker.state})`);

  try {
    const response = await axios.post<DeepSeekResponse>(
      `${apiUrl}/chat/completions`,
      {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        // Qwen3 thinking mode — disable for structured JSON output
        ...(isNvidia ? { thinking: { type: "disabled" } } : {}),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 120000,
      },
    );

    recordProviderSuccess(breaker);

    let content = response.data.choices[0]?.message?.content || "";

    // Strip <think> tags if Qwen3 still includes them
    if (isNvidia && content.includes("<think>")) {
      content = stripThinkingTags(content);
    }

    return content;
  } catch (error) {
    recordProviderFailure(breaker, provider.toUpperCase());

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const msg = error.response?.data?.error?.message || error.message;
      console.error(`${provider.toUpperCase()} API Error:`, { status, msg });
      throw new Error(
        `${provider.toUpperCase()} API error (${status}): ${msg}`,
      );
    }
    throw error;
  }
}

/**
 * Call LLM API — NVIDIA NIM primary, DeepSeek fallback
 * If NVIDIA fails or circuit is open, automatically falls back to DeepSeek
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<string> {
  // Determine if NVIDIA is available as primary
  const nvidiaAvailable =
    !!NVIDIA_API_KEY && canProceedWith(nvidiaCircuitBreaker);
  const deepseekAvailable =
    !!DEEPSEEK_API_KEY && canProceedWith(deepSeekCircuitBreaker);

  if (!nvidiaAvailable && !deepseekAvailable) {
    throw new Error(
      "Both NVIDIA and DeepSeek circuit breakers are OPEN or unconfigured. Please try again later.",
    );
  }

  // Try NVIDIA first (primary)
  if (nvidiaAvailable) {
    try {
      const result = await callProvider("nvidia", messages, options);
      return result;
    } catch (nvidiaError) {
      const errMsg =
        nvidiaError instanceof Error
          ? nvidiaError.message
          : String(nvidiaError);
      console.warn(`⚠️ NVIDIA failed, falling back to DeepSeek: ${errMsg}`);

      // Fall through to DeepSeek
      if (!deepseekAvailable) {
        throw new Error(`NVIDIA failed and DeepSeek unavailable: ${errMsg}`);
      }
    }
  }

  // DeepSeek fallback (or primary if NVIDIA not configured)
  return callProvider("deepseek", messages, options);
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
   - **Başlık:** Merak uyandıran ama "Clickbait" olmayan, haberin özünü veren 50-70 karakterlik başlık.
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
  // Company-specific styles
  openai:
    "green holographic interface, ChatGPT style, emerald glow, dark background",
  nvidia:
    "green and black theme, GPU chips, gaming aesthetic, neon green accents",
  google:
    "colorful Google colors (blue red yellow green), clean material design",
  microsoft: "blue corporate theme, Windows style, azure cloud elements",
  meta: "blue infinity symbol, VR headset, metaverse portal, purple-blue gradient",
  apple: "minimalist white, sleek curves, premium aesthetic, silver metallic",
  tesla: "electric blue, futuristic car silhouette, Elon Musk style innovation",
  anthropic: "warm orange-brown tones, Claude AI style, safe AI symbolism",
  amazon: "orange and black, AWS cloud icons, e-commerce futuristic",
  // Technology-specific styles
  robot: "humanoid robot, mechanical joints, glowing eyes, industrial setting",
  autonomous: "self-driving car sensors, LIDAR visualization, road mapping",
  drone: "aerial drone swarm, sky background, delivery or surveillance theme",
  chip: "semiconductor close-up, silicon wafer, golden circuits, macro photography",
  quantum: "quantum computer, blue cryogenic chamber, superconducting qubits",
  // Category-specific styles
  healthcare: "medical AI, DNA helix, hospital technology, blue-white clean",
  finance:
    "trading algorithms, stock charts, digital currency, gold-blue theme",
  gaming: "gaming setup, RGB lighting, esports arena, neon purple-cyan",
  security:
    "cyber security, digital lock, matrix code, red-black warning theme",
};

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
      ? `\n\n### DETECTED KEY SUBJECTS (USE THESE!):\n${entityHints.join("\n")}`
      : "";

  // Use entity-based visual style if detected
  const detectedEntity = detectEntityForVisual(title);
  const entityStyle = detectedEntity
    ? ENTITY_VISUAL_STYLES[detectedEntity]
    : null;

  // Pick a random camera angle for variety
  const cameraAngles = [
    "macro photography",
    "wide angle shot",
    "aerial view",
    "close-up detail",
    "symmetrical composition",
    "low angle perspective",
    "bird's eye view",
    "cinematic wide shot",
    "product photography",
    "architectural photography",
  ];
  const randomAngle =
    cameraAngles[Math.floor(Math.random() * cameraAngles.length)];

  // Pick a random lighting style for variety
  const lightingStyles = [
    "golden hour lighting",
    "blue hour atmosphere",
    "studio lighting",
    "natural daylight",
    "dramatic side lighting",
    "soft diffused light",
    "neon accent lighting",
    "backlit silhouette",
    "overcast even lighting",
  ];
  const randomLighting =
    lightingStyles[Math.floor(Math.random() * lightingStyles.length)];

  const entityHint = entityStyle
    ? `\n\n### DETECTED ENTITY STYLE (USE THIS AS BASE!):\nEntity: ${detectedEntity?.toUpperCase()}\nSuggested style: ${entityStyle}\nAdapt this style to the specific news angle.`
    : "";

  const prompt = `Generate a photorealistic image prompt for this AI news article.

Title: ${title}
Category: ${category}
Content: ${content.substring(0, 400)}
${entityContext}${entityHint}

CAMERA: ${randomAngle}
LIGHTING: ${randomLighting}

RULES:
1. Be SPECIFIC to the news topic — not generic tech imagery
2. NO humans, faces, hands, body parts — EVER
3. NO text, logos, or writing in the image
4. NO "holographic brain", "neon glow", "futuristic" clichés
5. Focus on REAL objects: devices, buildings, chips, robots, screens, labs
6. Max 120 characters

EXAMPLES:
- "Nvidia H100 GPU array in server rack, green LED indicators, ${randomAngle}, ${randomLighting}"
- "Autonomous delivery drone hovering over suburban neighborhood, clear sky, ${randomAngle}"
- "Quantum computer golden wiring close-up, cryogenic chamber, ${randomAngle}, ${randomLighting}"

OUTPUT: Only the prompt text. No explanation.`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "You are an expert editorial photographer. Generate a single image prompt that is SPECIFIC to the news topic. No humans ever. No explanations. Just the prompt.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      maxTokens: 200,
      temperature: 1.0,
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

  // CRITICAL: Enforce max length
  if (cleanPrompt.length > 150) {
    console.warn(
      `⚠️ Prompt too long (${cleanPrompt.length} chars), truncating to 150`,
    );
    cleanPrompt = cleanPrompt.substring(0, 147) + "...";
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

  // CRITICAL: Remove any human-related words AI might have added
  const humanPatterns = [
    /\b(person|people|man|woman|human|face|portrait|silhouette|figure|employee|worker|user|staff)\b/gi,
    /\b(head|hand|arm|leg|body|finger|eye|mouth|profile)\b/gi,
    /\b(businessman|businesswoman|professional|executive|ceo)\b/gi,
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
   - Güçlü, merak uyandıran başlık (60-70 karakter)
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
  "title": "Düzeltilmiş/Güncellenmiş başlık (50-70 karakter)",
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
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  if (!canProceed()) {
    throw new Error(
      "DeepSeek API circuit breaker is OPEN - too many recent failures",
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

EŞIK: >= 60 puan alan makaleler yayınlanacak.

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

Katı ama adil ol. Düşük kaliteli, eski veya alakasız içeriği reddet.`;

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
