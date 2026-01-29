import axios from "axios";

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

/**
 * Call DeepSeek API with Reasoner model
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

    return response.data.choices[0]?.message?.content || "";
  } catch (error) {
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
 */
export async function analyzeNewsArticles(
  articles: Array<{
    title: string;
    description: string;
    url: string;
    publishedDate?: string;
  }>,
): Promise<Array<{ index: number; reason: string; category: string }>> {
  const prompt = `Sen bir yapay zeka haber editörüsün. Bu haberleri analiz et ve SADECE YAPAY ZEKA İLE DOĞRUDAN İLGİLİ olanları seç.

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
4. Konularda çeşitlilik (tekrar eden konulardan kaçın)
5. Genel yapay zeka ile ilgilenen kitle için uygun olanlar

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

  const results = JSON.parse(jsonMatch[0]);

  // Filter by AI relevance score (must be >= 70)
  const filtered = results.filter((item: any) => {
    const relevance = item.aiRelevance || 0;
    if (relevance < 70) {
      console.log(
        `🗑️ AI relevance too low (${relevance}%): ${articles[item.index]?.title}`,
      );
      return false;
    }
    return true;
  });

  console.log(
    `✅ ${filtered.length}/${results.length} haber AI relevance kontrolünden geçti`,
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
      ? `\n\n### İÇ LİNKLEME BAĞLAMI (SEO):\nŞu makaleler halihazırda sitemizde yayında. Yazı içinde doğal bir yerini bulursan bu haberlere link (<a href="/news/slug">başlık</a>) verebilirsin:\n${contextArticles.map((a) => `- ${a.title} (Link: /news/${a.slug})`).join("\n")}`
      : "";

  const prompt = `Sen profesyonel, saygın ve güvenilir bir TV Haber Sunucusu ve Editörüsün. Görevin, sana verilen ham haberi alıp, geniş kitleler için anlaşılır, akıcı ve tamamen tarafsız bir haber metnine dönüştürmek.${contextText}

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

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate AI image prompt from article content
 */
export async function generateImagePrompt(
  title: string,
  content: string,
  category: string,
): Promise<string> {
  const prompt = `Sen bir AI görsel prompt uzmanısın. Bu yapay zeka haberi için Pollinations.ai'da kullanılacak mükemmel bir görsel prompt oluştur.

Haber Başlığı: ${title}
Kategori: ${category}
İçerik Özeti: ${content.substring(0, 500)}

Gereksinimler:
1. İngilizce prompt oluştur (Pollinations.ai için)
2. Haberin ana temasını yansıtsın
3. Profesyonel, modern, teknolojik görsel
4. Gerçekçi (realistic) veya dijital sanat (digital art) stili
5. Yüksek kalite (4k, high quality, detailed)
6. Temiz, minimalist tasarım
7. Yapay zeka/teknoloji estetiği
8. MAKSIMUM 150 KARAKTER (ÇOK ÖNEMLİ!)
9. Kısa, öz ve etkili kelimeler kullan

SADECE PROMPT METNİNİ VER. Hiçbir açıklama, düşünce veya ek metin ekleme.

Örnek format (kısa ve öz):
AI neural network, futuristic tech, glowing circuits, digital art, 4k, clean design`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen uzman bir AI görsel prompt yazarısın. SADECE prompt metnini ver, başka hiçbir şey yazma.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "deepseek-chat", // Use chat model instead of reasoner for simple tasks
      maxTokens: 200,
      temperature: 0.8,
    },
  );

  // Clean up the response
  let cleanPrompt = response.trim();

  // Remove quotes if present
  cleanPrompt = cleanPrompt.replace(/^["']|["']$/g, "");

  // If response contains reasoning tags or multiple lines, extract the actual prompt
  if (cleanPrompt.includes("<think>") || cleanPrompt.includes("\n\n")) {
    // Try to find the last substantial line (the actual prompt)
    const lines = cleanPrompt.split("\n").filter((line) => line.trim());
    cleanPrompt = lines[lines.length - 1] || cleanPrompt;
  }

  // Remove any remaining tags
  cleanPrompt = cleanPrompt.replace(/<[^>]+>/g, "").trim();

  // CRITICAL: Enforce max length to prevent 400 errors
  if (cleanPrompt.length > 150) {
    console.warn(
      `⚠️ Prompt too long (${cleanPrompt.length} chars), truncating to 150`,
    );
    cleanPrompt = cleanPrompt.substring(0, 147) + "...";
  }

  // If still empty or too short, use fallback
  if (!cleanPrompt || cleanPrompt.length < 20) {
    console.warn("⚠️  DeepSeek returned empty/short prompt, using fallback");
    cleanPrompt = `${category.toLowerCase()} AI tech, modern digital art, 4k, professional`;
  }

  console.log(`📝 Final prompt (${cleanPrompt.length} chars): ${cleanPrompt}`);

  return cleanPrompt;
}

export default {
  callDeepSeek,
  analyzeNewsArticles,
  rewriteArticle,
  generateImagePrompt,
};
