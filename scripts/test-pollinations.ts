/**
 * Test Pollinations.ai Integration
 *
 * Bu script Pollinations.ai entegrasyonunu test eder
 */

import { generateImagePrompt } from "../src/lib/deepseek";
import {
  fetchPollinationsImage,
  generateImageUrl,
} from "../src/lib/pollinations";

async function testPollinationsIntegration() {
  console.log("🧪 Pollinations.ai Entegrasyon Testi Başlıyor...\n");

  try {
    // Test 1: Direct URL Generation
    console.log("📝 Test 1: Direkt URL Oluşturma");
    const directUrl = generateImageUrl(
      "artificial intelligence neural network, futuristic technology, digital art",
      {
        width: 1200,
        height: 630,
        model: "flux",
        enhance: true,
        nologo: true,
      },
    );
    console.log("✅ URL:", directUrl);
    console.log("");

    // Test 2: DeepSeek Prompt Generation
    console.log("📝 Test 2: DeepSeek Prompt Oluşturma");
    const testTitle =
      "OpenAI GPT-5 Duyuruldu: Yapay Zeka Tarihinde Yeni Bir Dönem";
    const testContent = `
      OpenAI, yeni nesil dil modeli GPT-5'i tanıttı. 
      Model, önceki versiyonlara göre 10 kat daha güçlü ve 
      daha az hata yapıyor. Multimodal yetenekleri ile 
      görsel, ses ve metin işleme konusunda çığır açıyor.
    `;
    const testCategory = "Yapay Zeka Haberleri";

    console.log("Haber Başlığı:", testTitle);
    console.log("Kategori:", testCategory);
    console.log("\nDeepSeek prompt oluşturuyor...");

    const imagePrompt = await generateImagePrompt(
      testTitle,
      testContent,
      testCategory,
    );

    console.log("✅ Oluşturulan Prompt:", imagePrompt);
    console.log("");

    // Test 3: Image Fetching
    console.log("📝 Test 3: Pollinations.ai'dan Görsel Alma");
    console.log("Görsel oluşturuluyor (2-3 saniye sürebilir)...");

    const imageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux",
      enhance: true,
      nologo: true,
    });

    console.log("✅ Görsel URL:", imageUrl);
    console.log("");

    // Test 4: Multiple Prompts
    console.log("📝 Test 4: Farklı Kategoriler için Prompt'lar");

    const testCases = [
      {
        title: "Yeni Robot Teknolojisi Geliştirildi",
        content: "Araştırmacılar insansı robot geliştirdi...",
        category: "Robotik",
      },
      {
        title: "Makine Öğrenmesi ile Hastalık Teşhisi",
        content: "AI modeli kanser teşhisinde %95 başarı...",
        category: "Makine Öğrenmesi",
      },
      {
        title: "Doğal Dil İşleme'de Yeni Gelişme",
        content: "Yeni NLP modeli dil çevirisinde çığır açtı...",
        category: "Doğal Dil İşleme",
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n  Kategori: ${testCase.category}`);
      const prompt = await generateImagePrompt(
        testCase.title,
        testCase.content,
        testCase.category,
      );
      console.log(`  Prompt: ${prompt.substring(0, 80)}...`);

      const url = generateImageUrl(prompt, {
        width: 800,
        height: 400,
        model: "flux",
      });
      console.log(`  URL: ${url.substring(0, 100)}...`);
    }

    console.log("\n\n✅ Tüm Testler Başarılı!");
    console.log("\n📊 Özet:");
    console.log("  ✅ URL oluşturma çalışıyor");
    console.log("  ✅ DeepSeek prompt oluşturma çalışıyor");
    console.log("  ✅ Pollinations.ai görsel alma çalışıyor");
    console.log("  ✅ Farklı kategoriler için prompt oluşturma çalışıyor");
    console.log("\n🎉 Pollinations.ai entegrasyonu hazır!");
  } catch (error) {
    console.error("\n❌ Test Hatası:", error);
    if (error instanceof Error) {
      console.error("Hata Mesajı:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testPollinationsIntegration();
