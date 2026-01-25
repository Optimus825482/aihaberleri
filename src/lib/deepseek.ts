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
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
}> {
  const prompt = `Sen deneyimli bir teknoloji gazetecisisin. Görevin bu haberi tamamen özgün, doğal ve insan tarafından yazılmış gibi Türkçe'ye çevirmek ve yeniden yazmak.

ÖNEMLİ: Yazın ASLA yapay zeka tarafından yazıldığı belli olmamalı. Tamamen doğal, akıcı ve insan gibi yazmalısın.

Orijinal Başlık: ${originalTitle}
Kategori: ${category}

Orijinal İçerik:
${originalContent}

YAZIM KURALLARI (ÇOK ÖNEMLİ):

1. DOĞAL DİL KULLAN:
   - Günlük konuşma diline yakın yaz
   - Bazen kısa, bazen uzun cümleler kullan (varyasyon önemli)
   - "Aslında", "Öte yandan", "Ancak", "Bununla birlikte" gibi bağlaçlar kullan
   - Ara sıra soru cümleleri ekle: "Peki bu ne anlama geliyor?"
   - Kişisel gözlemler ekle: "Dikkat çekici olan şu ki..."

2. İNSAN GİBİ YAZI AKIŞI:
   - Her paragraf farklı uzunlukta olsun (3-6 cümle arası)
   - Bazen tek cümlelik paragraflar kullan (vurgu için)
   - Liste kullanırken madde işaretleri yerine akıcı anlatım tercih et
   - Teknik terimleri açıklarken günlük örnekler ver

3. YAYIN TARZINI ÇEŞITLENDIR:
   - Bazen heyecanlı, bazen analitik ton kullan
   - Okuyucuya hitap et: "Düşünün ki...", "Hayal edin..."
   - Ara sıra retorik sorular sor
   - Mizahi veya ironik ifadeler ekleyebilirsin (uygunsa)

4. YAPAY ZEKA İZLERİNDEN KAÇIN:
   - "Yapay zeka dünyasında", "Teknoloji dünyasında" gibi klişe başlangıçlar YAPMA
   - "Sonuç olarak", "Özetle" gibi robotik geçişler kullanma
   - Her paragrafı farklı şekilde başlat
   - Mükemmel dilbilgisi yerine doğal akış tercih et (ama hata yapma)
   - Çok düzenli yapı yerine organik akış

5. İÇERİK ZENGİNLİĞİ:
   - Gerçek dünya örnekleri ekle
   - Karşılaştırmalar yap: "Tıpkı... gibi"
   - Bağlam ver: "Geçtiğimiz ay...", "Son dönemde..."
   - Rakamları yorumla, sadece aktarma
   - Potansiyel etkileri tartış

6. BAŞLIK KURALLARI:
   - Merak uyandıran ama clickbait olmayan
   - Soru formatı kullanabilirsin
   - Rakam içerebilir ama zorunlu değil
   - 50-70 karakter arası
   - Doğal ve akıcı

7. PARAGRAF YAPISI:
   - İlk paragraf: Hemen konuya gir, arka plan verme
   - Orta paragraflar: Detayları farklı açılardan ele al
   - Son paragraf: Gelecek beklentileri veya etkileri
   - Her paragraf kendi içinde anlamlı olsun

8. DİL ÖZELLİKLERİ:
   - Aktif cümle yapısı tercih et
   - Pasif yapıdan kaçın (ama bazen kullan)
   - Kısa ve uzun cümleleri karıştır
   - Teknik terimleri Türkçeleştir ama İngilizce'sini de ver
   - Güncel dil kullan, arkaik ifadelerden kaçın

9. YAZIYI CANLANDIRAN DETAYLAR:
   - Somut örnekler ver
   - Sayıları bağlama oturt: "X milyon kullanıcı - ki bu Y şehrinin nüfusuna denk"
   - Zaman referansları ekle
   - Neden-sonuç ilişkileri kur
   - Farklı bakış açıları sun

10. KAÇINILMASI GEREKENLER:
    - "Bu gelişme önemli bir adım" gibi jenerik ifadeler
    - "Gelecek parlak görünüyor" gibi klişeler
    - Her cümleyi aynı yapıda kurma
    - Çok resmi veya çok gündelik olma
    - Abartılı sıfatlar: "inanılmaz", "muhteşem", "devrim niteliğinde"

JSON formatında yanıt ver:
{
  "title": "Doğal, merak uyandıran başlık (50-70 karakter)",
  "excerpt": "İlk paragraftan alınan, bağımsız anlamlı 150 karakterlik özet",
  "content": "HTML formatında (<p>, <h2>, <h3> etiketleri ile) tamamen doğal, insan gibi yazılmış 600-900 kelimelik makale. Her paragraf farklı uzunlukta, akıcı geçişler, varyasyonlu cümle yapıları, doğal dil kullanımı.",
  "keywords": ["doğal-anahtar1", "doğal-anahtar2", "doğal-anahtar3", "doğal-anahtar4", "doğal-anahtar5"],
  "metaDescription": "Doğal dille yazılmış, merak uyandıran 150-160 karakterlik meta açıklama"
}

ÖNEMLİ: Yazını bitirdiğinde tekrar oku ve şunu sor: "Bu yazıyı bir insan mı yazdı yoksa AI mı?" Eğer AI izleri varsa, daha doğal hale getir.`;

  const response = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen deneyimli bir teknoloji gazetecisisin. Yazılarını tamamen doğal, insan gibi ve AI tespit edilemez şekilde yazıyorsun. Robotik ifadelerden, klişelerden ve yapay zeka yazım kalıplarından kaçınıyorsun. Her yazın benzersiz, akıcı ve organik. Sadece geçerli JSON ile yanıt ver.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "deepseek-reasoner", // Use reasoner for high-quality content writing
      maxTokens: 4000,
      temperature: 0.9, // Higher temperature for more creative, human-like writing
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
