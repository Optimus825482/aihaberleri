/**
 * Google Gemini API Integration
 *
 * Gemini 2.0 Flash Lite - Ultra-cheap, fast AI model
 * Use for: Relevance scoring, image prompt generation, batch processing
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.warn("⚠️  GOOGLE_API_KEY is not set");
}

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  }

  return genAI;
}

export interface GeminiMessage {
  role: "user" | "model";
  parts: string;
}

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-lite";

/**
 * Call Gemini API with Flash Lite model
 */
export async function callGemini(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
  } = {},
): Promise<string> {
  const ai = getGenAI();

  try {
    const modelName = options.model || DEFAULT_GEMINI_MODEL;

    const model = ai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2000,
      },
      systemInstruction: options.systemInstruction,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini API Error:", {
      message: error.message,
      status: error.status,
      details: error.details,
      model: options.model || DEFAULT_GEMINI_MODEL,
    });
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

/**
 * Call Gemini with chat history (for multi-turn conversations)
 */
export async function callGeminiChat(
  messages: GeminiMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
  } = {},
): Promise<string> {
  const ai = getGenAI();

  try {
    const modelName = options.model || DEFAULT_GEMINI_MODEL;

    const model = ai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2000,
      },
      systemInstruction: options.systemInstruction,
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({
      history,
    });

    const result = await chat.sendMessage(lastMessage.parts);
    return result.response.text();
  } catch (error: any) {
    console.error("Gemini Chat API Error:", {
      message: error.message,
      status: error.status,
      details: error.details,
      model: options.model || DEFAULT_GEMINI_MODEL,
    });
    throw new Error(`Gemini Chat API error: ${error.message}`);
  }
}

/**
 * Batch scoring with Gemini (cost-efficient for relevance filtering)
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
  Array<{
    score: number;
    reasoning: string;
    category?: string;
    tags?: string[];
  }>
> {
  const articlesText = articles
    .map(
      (article, index) => `
--- MAKALE ${index + 1} ---
Başlık: ${article.title}
Açıklama: ${article.description}
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

JSON dizisi ile yanıt ver (makale başına bir nesne):
[
  {
    "score": 85,
    "reasoning": "Büyük AI şirketi duyurusu, çok alakalı",
    "category": "sektor-haberleri",
    "tags": ["openai", "gpt-5", "duyuru"]
  },
  ...
]

Katı ama adil ol. Düşük kaliteli, eski veya alakasız içeriği reddet.`;

  const response = await callGemini(prompt, {
    model: DEFAULT_GEMINI_MODEL,
    temperature: 0.3, // Lower for consistent scoring
    maxTokens: 4000,
    systemInstruction:
      "Sen Türk AI/teknoloji haber platformu için makale kalitesi ve alakasını değerlendiren uzman bir haber editörüsün. Sadece geçerli JSON dizisi ile yanıt ver.",
  });

  // Parse JSON response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate image prompt with Gemini (multimodal capabilities)
 */
export async function generateImagePromptGemini(
  title: string,
  content: string,
  category: string,
): Promise<string> {
  const prompt = `Sen dünya çapında ödüllü bir haber fotoğrafçısısın. Bu yapay zeka haberi için REALISTIC, DIVERSE ve CONTENT-FOCUSED bir görsel prompt oluştur.

Haber Başlığı: ${title}
Kategori: ${category}
İçerik Özeti: ${content.substring(0, 500)}

### KRİTİK KURALLAR:

1. **İÇERİK ANALİZİ (EN ÖNEMLİ!):**
   - Başlık ve içeriği DİKKATLİCE oku
   - Haberin ANA KONUSUNU belirle (şirket adı, ürün adı, olay)
   - O konuya ÖZEL görsel seç
   - Generic ofis/toplantı odası YASAK!

2. **ÇEŞİTLİLİK - TEKRARDAN KAÇIN:**
   ❌ YASAK (aşırı kullanılmış): "boş ofis", "toplantı odası", "konferans salonu", "iş istasyonu"
   ✅ TERCİH EDİLEN: Haberle ilgili spesifik nesneler, cihazlar, mimari, ortamlar

3. **UZUNLUK:** MAKS 120 karakter (son eki hariç)

4. **MUTLAK YASAKLAR - HİÇBİR İNSAN ÖĞESİ:**
   ❌ **İNSAN YOK - HİÇBİR ŞEKİLDE**
   ❌ **YÜZ YOK, KAFA YOK, BAŞ YOK**
   ❌ **EL YOK, KOL YOK, BACAK YOK, VÜCUT YOK**
   ❌ **SİLÜET YOK, GÖLGE İNSAN YOK**
   ❌ **İNSANI ÇAĞRIŞTIRAN HİÇBİR ŞEY YOK**
   ❌ "boş ofis" (aşırı kullanılmış!)
   ❌ "toplantı odası" (aşırı kullanılmış!)
   ❌ "holografik beyin" (generic!)
   ❌ "neon ışıklar" (çok fütüristik!)
   ❌ Metin veya yazı

5. **ODAKLAN:** Sadece nesneler, cihazlar, mimari, manzara, soyut konseptler

SADECE PROMPT İLE YANIT VER. AÇIKLAMA YOK.`;

  const response = await callGemini(prompt, {
    model: "gemini-2.5-flash-lite", // FIXED: Use available model
    temperature: 1.0, // Maximum variety
    maxTokens: 200,
    systemInstruction:
      "Sen uzman bir haber fotoğrafçısısın. Haberin içeriğini analiz et ve SPESIFIK, ÇEŞITLI görsel prompt oluştur. Generic ofis görselleri YASAK. Her haber için FARKLI bir görsel seç. MUTLAKA insan içermeyen görseller üret - sadece nesneler, cihazlar, mimari veya soyut konseptler.",
  });

  // Clean up the response
  let cleanPrompt = response.trim();

  // Remove quotes if present
  cleanPrompt = cleanPrompt.replace(/^["']|["']$/g, "");

  // If response contains multiple lines, extract the actual prompt
  if (cleanPrompt.includes("\n\n")) {
    const lines = cleanPrompt.split("\n").filter((line) => line.trim());
    cleanPrompt = lines[lines.length - 1] || cleanPrompt;
  }

  // CRITICAL: Enforce max length
  if (cleanPrompt.length > 120) {
    console.warn(
      `⚠️ Prompt çok uzun (${cleanPrompt.length} karakter), 120'ye kısaltılıyor`,
    );
    cleanPrompt = cleanPrompt.substring(0, 117) + "...";
  }

  // Fallback if empty or too short
  if (!cleanPrompt || cleanPrompt.length < 20) {
    console.warn("⚠️  Gemini boş/kısa prompt döndürdü, fallback kullanılıyor");
    cleanPrompt =
      "Modern teknoloji çalışma alanı, bilgisayar ekranları, temiz profesyonel ortam, doğal aydınlatma";
  }

  // CRITICAL: Remove any human-related words AI might have added
  const humanWords = [
    // FIX (2026-02-28): Negative lookbehind preserves "no people", "no humans" etc.
    /(?<![Nn][Oo]\s)\b(insan|kişi|adam|kadın|erkek|çocuk|person|people|man|woman|human|face|portrait|silhouette|figure|employee|worker|user)\b/gi,
    /(?<![Nn][Oo]\s)\b(yüz|kafa|baş|el|kol|bacak|vücut|head|hand|arm|leg|body|finger|eye|mouth)\b/gi,
  ];

  for (const pattern of humanWords) {
    cleanPrompt = cleanPrompt.replace(pattern, "").replace(/\s+/g, " ").trim();
  }

  // CRITICAL: Add strong negative prompt suffix (English for better AI understanding)
  const noHumansSuffix =
    ", no people, no humans, no faces, no hands, no body parts, empty scene";

  // Check if already has negative prompt
  const hasNoHumansKeyword =
    cleanPrompt.toLowerCase().includes("no people") ||
    cleanPrompt.toLowerCase().includes("no humans") ||
    cleanPrompt.toLowerCase().includes("insan yok");

  if (!hasNoHumansKeyword) {
    // Truncate to make room for suffix
    const maxBaseLength = 150 - noHumansSuffix.length;
    if (cleanPrompt.length > maxBaseLength) {
      cleanPrompt = cleanPrompt.substring(0, maxBaseLength - 3) + "...";
    }
    cleanPrompt += noHumansSuffix;
    console.log("✅ Negatif prompt eklendi (no people, no humans, etc.)");
  }

  console.log(
    `📝 Final prompt (${cleanPrompt.length} karakter): ${cleanPrompt}`,
  );

  return cleanPrompt;
}

export default {
  callGemini,
  callGeminiChat,
  batchScoreArticles,
  generateImagePromptGemini,
};
