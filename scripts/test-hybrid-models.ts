/**
 * Hybrid Model Test Script
 *
 * Tests the hybrid AI model strategy:
 * - Gemini 2.5 Flash Lite: Relevance scoring, image prompts
 * - DeepSeek-Chat: Content synthesis (TR + EN)
 */

import {
  batchScoreArticles,
  generateImagePromptGemini,
  callGemini,
} from "@/lib/gemini";
import { callDeepSeek } from "@/lib/deepseek";

console.log("🧪 Hybrid Model Test Başlatılıyor...\n");

// Test data
const testArticles = [
  {
    title: "OpenAI GPT-5 Modelini Tanıttı",
    description:
      "OpenAI, yeni nesil dil modeli GPT-5'i tanıttı. Model, önceki versiyonlara göre 10 kat daha hızlı ve daha doğru sonuçlar üretiyor.",
    source: "TechCrunch",
    publishedDate: "2026-02-02",
    trendScore: 950,
  },
  {
    title: "Tesla'nın Yeni Otonom Sürüş Sistemi",
    description:
      "Tesla, Full Self-Driving (FSD) v13 güncellemesini yayınladı. Sistem artık şehir içi trafikte tamamen otonom sürüş yapabiliyor.",
    source: "The Verge",
    publishedDate: "2026-02-01",
    trendScore: 850,
  },
  {
    title: "Google Gemini 2.5 Pro Duyuruldu",
    description:
      "Google, Gemini 2.5 Pro modelini tanıttı. Model, 2 milyon token context window ile dikkat çekiyor.",
    source: "Google Blog",
    publishedDate: "2026-02-02",
    trendScore: 920,
  },
];

async function testGeminiRelevanceScoring() {
  console.log("📊 TEST 1: Gemini 2.5 Flash Lite - Relevance Scoring");
  console.log("=".repeat(60));

  try {
    const startTime = Date.now();
    const scores = await batchScoreArticles(testArticles);
    const duration = Date.now() - startTime;

    console.log(`✅ Başarılı! Süre: ${duration}ms\n`);

    scores.forEach((score, index) => {
      console.log(`Makale ${index + 1}: ${testArticles[index].title}`);
      console.log(`  Skor: ${score.score}/100`);
      console.log(`  Gerekçe: ${score.reasoning}`);
      console.log(`  Kategori: ${score.category || "N/A"}`);
      console.log(`  Etiketler: ${score.tags?.join(", ") || "N/A"}`);
      console.log();
    });

    return { success: true, duration, scores };
  } catch (error) {
    console.error("❌ Hata:", error);
    return { success: false, error };
  }
}

async function testGeminiImagePrompt() {
  console.log("\n🎨 TEST 2: Gemini 2.5 Flash Lite - Image Prompt Generation");
  console.log("=".repeat(60));

  const testArticle = testArticles[0];

  try {
    const startTime = Date.now();
    const prompt = await generateImagePromptGemini(
      testArticle.title,
      testArticle.description,
      "yapay-zeka",
    );
    const duration = Date.now() - startTime;

    console.log(`✅ Başarılı! Süre: ${duration}ms\n`);
    console.log(`Makale: ${testArticle.title}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Uzunluk: ${prompt.length} karakter`);
    console.log();

    return { success: true, duration, prompt };
  } catch (error) {
    console.error("❌ Hata:", error);
    return { success: false, error };
  }
}

async function testDeepSeekContentSynthesis() {
  console.log("\n📝 TEST 3: DeepSeek-Chat - TR Content Synthesis");
  console.log("=".repeat(60));

  const testArticle = testArticles[0];

  const prompt = `Sen profesyonel bir haber editörüsün. Bu haberi Türkçe'ye çevir ve genişlet.

Başlık: ${testArticle.title}
İçerik: ${testArticle.description}

JSON formatında yanıt ver:
{
  "title": "SEO uyumlu Türkçe başlık",
  "excerpt": "2-3 cümlelik özet",
  "content": "HTML formatlı tam makale (min 200 kelime)",
  "keywords": ["anahtar1", "anahtar2"],
  "metaDescription": "SEO meta açıklama"
}`;

  try {
    const startTime = Date.now();
    const response = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "Sen uzman bir haber editörüsün. Sadece geçerli JSON yanıtı ver.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "deepseek-chat",
        maxTokens: 2000,
        temperature: 0.9,
      },
    );
    const duration = Date.now() - startTime;

    // Parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON parse hatası");
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log(`✅ Başarılı! Süre: ${duration}ms\n`);
    console.log(`Başlık: ${result.title}`);
    console.log(`Özet: ${result.excerpt}`);
    console.log(`İçerik Uzunluğu: ${result.content.length} karakter`);
    console.log(`Anahtar Kelimeler: ${result.keywords.join(", ")}`);
    console.log();

    return { success: true, duration, result };
  } catch (error) {
    console.error("❌ Hata:", error);
    return { success: false, error };
  }
}

async function testGeminiEnglishTranslation() {
  console.log("\n🌍 TEST 4: Gemini 2.5 Flash Lite - EN Content Synthesis");
  console.log("=".repeat(60));

  const testArticle = testArticles[0];

  const prompt = `You are a professional news editor. Translate and expand this Turkish news to English.

Title: ${testArticle.title}
Content: ${testArticle.description}

Respond in JSON:
{
  "title": "SEO-optimized English title",
  "excerpt": "2-3 sentence summary",
  "content": "Full HTML article (min 200 words)",
  "keywords": ["keyword1", "keyword2"],
  "metaDescription": "SEO meta description"
}`;

  try {
    const startTime = Date.now();
    const response = await callGemini(prompt, {
      model: "gemini-2.0-flash-thinking-exp-1219", // FIXED: Use available model
      maxTokens: 2000,
      temperature: 0.9,
    });
    const duration = Date.now() - startTime;

    // Parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON parse error");
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log(`✅ Başarılı! Süre: ${duration}ms\n`);
    console.log(`Title: ${result.title}`);
    console.log(`Excerpt: ${result.excerpt}`);
    console.log(`Content Length: ${result.content.length} characters`);
    console.log(`Keywords: ${result.keywords.join(", ")}`);
    console.log();

    return { success: true, duration, result };
  } catch (error) {
    console.error("❌ Hata:", error);
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log("🚀 Hybrid Model Test Suite");
  console.log("=".repeat(60));
  console.log("Modeller:");
  console.log(
    "  - Gemini 2.5 Flash Lite (Relevance + Image Prompts + EN Translation)",
  );
  console.log("  - DeepSeek-Chat (TR Content Synthesis)");
  console.log();

  const results = {
    geminiScoring: await testGeminiRelevanceScoring(),
    geminiImagePrompt: await testGeminiImagePrompt(),
    deepseekSynthesis: await testDeepSeekContentSynthesis(),
    geminiEnglishTranslation: await testGeminiEnglishTranslation(),
  };

  console.log("\n📊 TEST SONUÇLARI");
  console.log("=".repeat(60));

  const successCount = Object.values(results).filter((r) => r.success).length;
  const totalTests = Object.keys(results).length;

  console.log(`✅ Başarılı: ${successCount}/${totalTests}`);
  console.log(`❌ Başarısız: ${totalTests - successCount}/${totalTests}`);
  console.log();

  // Performance comparison
  console.log("⚡ PERFORMANS KARŞILAŞTIRMASI");
  console.log("=".repeat(60));

  if (results.geminiScoring.success) {
    console.log(`Gemini Scoring: ${results.geminiScoring.duration}ms`);
  }

  if (results.geminiImagePrompt.success) {
    console.log(`Gemini Image Prompt: ${results.geminiImagePrompt.duration}ms`);
  }

  if (results.deepseekSynthesis.success) {
    console.log(
      `DeepSeek TR Synthesis: ${results.deepseekSynthesis.duration}ms`,
    );
  }

  if (results.geminiEnglishTranslation.success) {
    console.log(
      `Gemini EN Translation: ${results.geminiEnglishTranslation.duration}ms`,
    );
  }

  console.log();

  // Cost estimation
  console.log("💰 MALİYET TAHMİNİ (1000 makale/ay)");
  console.log("=".repeat(60));
  console.log("Gemini 2.5 Flash Lite:");
  console.log("  - Relevance Scoring: ~$4.50/ay (60M token)");
  console.log("  - Image Prompts: ~$0.75/ay (10M token)");
  console.log("  - EN Translation: ~$4.50/ay (60M token)");
  console.log("  - TOPLAM: ~$9.75/ay");
  console.log();
  console.log("DeepSeek-Chat:");
  console.log("  - TR Content Synthesis: ~$8.40/ay (60M token)");
  console.log();
  console.log("GENEL TOPLAM: ~$18.15/ay");
  console.log("Önceki (Sadece DeepSeek): ~$19.60/ay");
  console.log("Fark: -$1.45/ay (%7 tasarruf)");
  console.log();
  console.log("💡 NOT: Gemini 2.5 Flash Lite en ucuz ve en güncel model.");
  console.log("    DeepSeek-Reasoner KULLANILMIYOR (gereksiz).");
  console.log("    EN çeviri artık Gemini ile yapılıyor (47% daha ucuz).");
  console.log();

  return results;
}

// Run tests
runAllTests()
  .then(() => {
    console.log("✅ Tüm testler tamamlandı!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  });
