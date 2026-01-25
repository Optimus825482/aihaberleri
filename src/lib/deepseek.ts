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
        model: options.model || "deepseek-reasoner",
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
 */
export async function analyzeNewsArticles(
  articles: Array<{
    title: string;
    description: string;
    url: string;
    publishedDate?: string;
  }>,
): Promise<Array<{ index: number; reason: string; category: string }>> {
  const prompt = `Sen bir yapay zeka haber editörüsün. Bu yapay zeka ile ilgili haberleri analiz et ve yayınlanmak üzere en ilginç ve alakalı 2-3 tanesini seç.

Haberler:
${articles
  .map(
    (article, index) => `
${index + 1}. Başlık: ${article.title}
   Açıklama: ${article.description}
   URL: ${article.url}
   Yayın Tarihi: ${article.publishedDate || "Bilinmiyor"}
`,
  )
  .join("\n")}

Şu formatta bir JSON dizisi ile yanıt ver:
[
  {
    "index": 0,
    "reason": "Bu haberin neden ilginç olduğu",
    "category": "Şunlardan biri: Makine Öğrenmesi, Doğal Dil İşleme, Bilgisayarlı Görü, Robotik, Yapay Zeka Etiği, Yapay Zeka Araçları, Sektör Haberleri, Araştırma"
  }
]

Şu özelliklere sahip 2-3 haber seç:
1. En haber değeri taşıyan ve ilginç olanlar
2. Güncel ve alakalı olanlar
3. Konularda çeşitlilik (tekrar eden konulardan kaçın)
4. Genel yapay zeka ile ilgilenen kitle için uygun olanlar`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen uzman bir yapay zeka haber editörüsün. Her zaman sadece geçerli JSON ile yanıt ver.",
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

  return JSON.parse(jsonMatch[0]);
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

  const prompt = `Sen deneyimli, sivri dilli ve tutkulu bir teknoloji yazarı/editörüsün. SADECE çeviri yapmıyorsun; haberi alıp kendi benzersiz, insan sesinle yeniden yaratıyorsun.${contextText}

HEDEF: Bu yazıyı okuyan kişi "Bunu kesinlikle bir insan yazmış, hem de işini bilen biri" demeli. AI dedektörlerini atlatacak kadar doğal ve karmaşık ("perplexity" ve "burstiness" yüksek) bir dil kullan.

Orijinal Başlık: ${originalTitle}
Kategori: ${category}

Orijinal İçerik:
${originalContent}

### GHOSTWRITER YAZIM MANİFESTOSU (BUNLARA SIKI SIKIYA UY):

1. **GİRİŞ KANCASI (HOOK):**
   - Asla "Yapay zeka dünyasında..." veya "Bu gelişme..." diye başlama. Yasak.
   - Şunlardan biriyle başla:
     * Şaşırtıcı bir soru ("Hiç robotların rüya görüp görmediğini düşündünüz mü?")
     * Kişisel bir anekdot veya gözlem ("Geçen gün kahvemi içerken fark ettim...")
     * İddialı, provokatif bir cümle ("Kabul edelim: Çoğu AI girişimi aslında birer balon.")
     * Doğrudan olaya giren bir aksiyon cümlesi ("Meta yine yaptı yapacağını.")

2. **RİTİM VE AKIŞ (BURSTINESS):**
   - Robot gibi tekdüze cümleler kurma. Ritmi sürekli değiştir.
   - ÖRNEK: "Bu büyük bir sorun. Neden mi? Çünkü veri güvenliği şakaya gelmez. Şirketler yıllardır bunu görmezden geldi, halının altına süpürdü, yok saydı. Ama artık deniz bitti."
   - Çok kısa cümleler (yumruk etkisi) ve uzun, virgüllü, açıklayıcı cümleleri (nefes alma) harmanla.

3. **YASAKLI KELİMELER VE KLİŞELER (BUNLARI ASLA KULLANMA):**
   - ❌ "Sonuç olarak", "Özetle", "İlginç bir şekilde"
   - ❌ "Çığır açan", "Devrim niteliğinde" (Gerçekten öyle değilse abartma)
   - ❌ "Geleceğin ne getireceğini bekleyip göreceğiz" (Tembel kapanış)
   - ❌ "Hızla gelişen teknoloji dünyası"
   - ❌ "Önemli bir adım"

4. **TON VE ÜSLUP:**
   - **Fikir Beyan Et:** Sadece haberi verme, yorumla. "Bu hamle Google'ı zora sokabilir" gibi analizler yap.
   - **Konuşma Dili:** Okuyucuyla sohbet et. "Bakın," "Dürüst olalım," "Şöyle düşünün" gibi ifadeler kullan.
   - **Duygu Kat:** Heyecan, şüphe, merak veya hayal kırıklığı... Yazının bir duygusu olsun.

5. **VERİ VE GERÇEKLİK:**
   - Sayıları bağlama oturt: "100 Milyon Dolar" deme, "Neredeyse bir Instagram geliri kadar" de.
   - Teknik terimleri "halk diliyle" açıkla: "LLM, yani temelde internetin tamamını ezberlemiş hiperaktif bir kütüphaneci."

6. **YAPI:**
   - Başlık: 50-70 karakter. Tık tuzağı (clickbait) olmasın ama merak uyandırsın. Soru sorabilirsin.
   - Meta Açıklama: Haberin özeti değil, okuyucuyu içeri çekecek bir "fragman" olsun.
   - İçerik: HTML formatında (<p>, <h2>, <ul>, <strong>, <em>). H2 başlıkları yaratıcı olsun ("Teknik Detaylar" yerine "Kaputun Altında Neler Var?" de).

7. **SEO ENTEGRASYONU:**
   - Anahtar kelimeleri doğal bir şekilde metne yedir. Robotik durmasın.
   - İçerik uzunluğu: Konunun hakkını verecek kadar uzun (en az 600 kelime), sıkmayacak kadar kısa.

JSON formatında yanıt ver:
{
  "title": "İlgi çekici, doğal başlık",
  "excerpt": "Blog ana sayfasında görünecek, vurucu özet (1-2 cümle)",
  "content": "Tamamen HTML formatlı, insansı makale içeriği",
  "keywords": ["anahtar1", "anahtar2"],
  "metaDescription": "SEO ve tıklama odaklı meta açıklama (150-160 karakter)"
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
      model: "deepseek-reasoner",
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
8. 50-100 kelime arası

SADECE PROMPT METNİNİ VER. Hiçbir açıklama, düşünce veya ek metin ekleme.

Örnek format:
artificial intelligence neural network visualization, futuristic technology, glowing blue circuits, modern digital art, professional tech illustration, high quality, 4k, detailed, clean design, cyberpunk aesthetic`;

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

  // If still empty or too short, use fallback
  if (!cleanPrompt || cleanPrompt.length < 20) {
    console.warn("⚠️  DeepSeek returned empty/short prompt, using fallback");
    cleanPrompt = `${category.toLowerCase()} artificial intelligence technology, modern digital illustration, futuristic tech concept, professional design, high quality, 4k, detailed, clean aesthetic`;
  }

  return cleanPrompt;
}

export default {
  callDeepSeek,
  analyzeNewsArticles,
  rewriteArticle,
  generateImagePrompt,
};
