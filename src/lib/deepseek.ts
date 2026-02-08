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

const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
  console.warn("⚠️  DEEPSEEK_API_KEY is not set");
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
// CIRCUIT BREAKER PATTERN (FAZ 3)
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
  halfOpenMaxCalls: 1, // Only 1 call allowed in half-open state
};

const deepSeekCircuitBreaker: CircuitBreakerState = {
  state: "CLOSED",
  failureCount: 0,
  lastFailureTime: 0,
  nextAttemptTime: 0,
};

/**
 * Check if circuit breaker allows the request
 */
function canProceed(): boolean {
  const now = Date.now();

  if (deepSeekCircuitBreaker.state === "OPEN") {
    if (now >= deepSeekCircuitBreaker.nextAttemptTime) {
      // Transition to HALF_OPEN
      console.log("🔄 Circuit breaker: OPEN → HALF_OPEN");
      deepSeekCircuitBreaker.state = "HALF_OPEN";
      return true;
    }
    console.warn("⚠️ Circuit breaker is OPEN - blocking request");
    return false;
  }

  return true;
}

/**
 * Record a successful API call
 */
function recordSuccess(): void {
  if (deepSeekCircuitBreaker.state === "HALF_OPEN") {
    console.log("✅ Circuit breaker: HALF_OPEN → CLOSED (call succeeded)");
    deepSeekCircuitBreaker.state = "CLOSED";
  }
  deepSeekCircuitBreaker.failureCount = 0;
}

/**
 * Record a failed API call and potentially open circuit
 */
function recordFailure(): void {
  deepSeekCircuitBreaker.failureCount++;
  deepSeekCircuitBreaker.lastFailureTime = Date.now();

  if (
    deepSeekCircuitBreaker.failureCount >= circuitBreakerConfig.threshold
  ) {
    deepSeekCircuitBreaker.state = "OPEN";
    deepSeekCircuitBreaker.nextAttemptTime =
      Date.now() + circuitBreakerConfig.timeout;
    console.error(
      `❌ Circuit breaker: opened after ${deepSeekCircuitBreaker.failureCount} failures. Next attempt in ${circuitBreakerConfig.timeout / 1000}s`,
    );
  } else {
    console.warn(
      `⚠️ Circuit breaker: ${deepSeekCircuitBreaker.failureCount}/${circuitBreakerConfig.threshold} failures`,
    );
  }
}

/**
 * Get current circuit breaker state (for monitoring)
 */
export function getCircuitBreakerState(): CircuitBreakerState {
  return deepSeekCircuitBreaker.state;
}

/**
 * Reset circuit breaker (for manual recovery)
 */
export function resetCircuitBreaker(): void {
  deepSeekCircuitBreaker.state = "CLOSED";
  deepSeekCircuitBreaker.failureCount = 0;
  deepSeekCircuitBreaker.lastFailureTime = 0;
  deepSeekCircuitBreaker.nextAttemptTime = 0;
  console.log("🔄 Circuit breaker manually reset to CLOSED");
}

/**
 * Call DeepSeek API with circuit breaker protection
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  // Check circuit breaker before proceeding
  if (!canProceed()) {
    throw new Error(
      "DeepSeek API circuit breaker is OPEN - too many recent failures. Please try again later.",
    );
  }

  try {
    const response = await axios.post<DeepSeekResponse>(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: options.model || "deepseek-chat",
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 120000, // 120 seconds (2 minutes)
      },
    );

    // Record success and reset failure count
    recordSuccess();

    return response.data.choices[0]?.message?.content || "";
  } catch (error) {
    // Record failure and potentially open circuit
    recordFailure();

    if (axios.isAxiosError(error)) {
      console.error("DeepSeek API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(
        `DeepSeek API error: ${error.response?.data?.error?.message || error.message}`,
      );
    }
    throw error;
  }
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
    {
      model: "deepseek-chat", // Use chat model for analysis
    },
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
      model: "deepseek-chat",
      maxTokens: 4000,
      temperature: 1.0, // Maximum creativity/randomness for burstiness
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

  const prompt = `Sen dünya çapında ödüllü bir haber fotoğrafçısısın. Bu yapay zeka haberi için REALISTIC, UNIQUE ve KONU-ODAKLI görsel prompt oluştur.

Haber Başlığı: ${title}
Kategori: ${category}
İçerik Özeti: ${content.substring(0, 600)}
${entityContext}

### PROMPT OLUŞTURMA ADIMLARI:

**ADIM 1 - ANA KONU BELİRLE:**
Haberin EN ÖNEMLİ öğesini seç (öncelik sırası):
1. Şirket adı varsa → O şirketin ürünü/binası/logosu ile ilgili görsel
2. Ürün adı varsa → O ürünün kendisi veya kullanım ortamı
3. Robot/cihaz varsa → O robotun/cihazın görseli
4. Olay tipi varsa → O olayı temsil eden sembolik görsel

**ADIM 2 - GÖRSEL TİPİ SEÇ:**
- Macro shot (chip, devre, cihaz detayı)
- Exterior shot (bina, fabrika, kampüs)
- Product shot (cihaz, robot, ürün)
- Environment shot (data center, lab, factory)
- Aerial view (fabrika, kampüs, şehir)
- Conceptual (soyut teknoloji görseli)

**ADIM 3 - STİL EKLE:**
Lighting: golden hour | blue hour | studio | natural
Quality: photorealistic | 8k | sharp focus | editorial

### YASAKLAR (KESINLIKLE KULLANMA!):
❌ İnsan, yüz, el, parmak, vücut parçası
❌ "empty office", "conference room", "meeting room" 
❌ "holographic brain", "neon glow", "futuristic"
❌ Yazı, metin, logo yazısı
❌ Generic stock photo tarzı görseller

### KONU-GÖRSEL EŞLEŞTİRME ÖRNEKLERİ:

ROBOT HABERİ → "bipedal robot standing in clean lab, white chassis, professional lighting"
NVIDIA HABERİ → "Nvidia H100 GPU close-up, green PCB, macro photography"
OPENAI HABERİ → "Modern glass office building exterior, San Francisco skyline"
GOOGLE HABERİ → "Googleplex campus courtyard, Android statue, sunny day"
TESLA HABERİ → "Tesla Model S charging at Supercharger station, sunset"
EV/ARAÇ HABERİ → "Electric vehicle charging port close-up, LED indicator"
CHIP HABERİ → "Silicon wafer with microchips, clean room photography"
DATA CENTER → "Server room corridor, blue LED rack lights, symmetrical"
DRONE HABERİ → "Autonomous delivery drone in flight, clear sky background"
QUANTUM → "Quantum computer cooling chamber, golden wiring, cryogenic"
SIBER GÜVENLİK → "Digital padlock visualization, circuit pattern background"
STARTUP/YATIRIM → "Modern tech startup office lobby, glass and steel"

### SON KONTROL:
✅ Haberin ana konusuyla DOĞRUDAN ilgili mi?
✅ Generic değil, SPESIFIK mi?
✅ İnsan içermiyor mu?
✅ 120 karakter altında mı?

### FORMAT:
[Ana Konu] + [Detay/Ortam] + [Açı/Stil] + ", no people, no humans"

SADECE PROMPT YAZ. AÇIKLAMA YAPMA.`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen uzman bir haber fotoğrafçısısın. Haberin içeriğini analiz et ve SPESIFIK, ÇEŞITLI görsel prompt oluştur. Generic ofis görselleri YASAK. Her haber için FARKLI bir görsel seç.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "deepseek-chat",
      maxTokens: 200,
      temperature: 1.0, // Increased to 1.0 for maximum variety
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
      model: "deepseek-chat",
      maxTokens: 6000, // Larger for comprehensive articles
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
      model: "deepseek-chat",
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

export default {
  callDeepSeek,
  analyzeNewsArticles,
  rewriteArticle,
  rewriteArticleWithNote,
  generateImagePrompt,
  aggregateMultiSourceArticles,
};
