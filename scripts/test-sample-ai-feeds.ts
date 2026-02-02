/**
 * Test sample AI RSS feeds (first 30) to verify they work
 */

import { fetchRSSFeed } from "../src/lib/rss";

// İlk 30 AI RSS feed (hızlı test için)
const SAMPLE_FEEDS = [
  { name: "404 Media", url: "https://www.404media.co/rss" },
  { name: "Ahead of AI", url: "https://magazine.sebastianraschka.com/feed" },
  {
    name: "AI Accelerator Institute",
    url: "https://aiacceleratorinstitute.com/rss/",
  },
  {
    name: "AI - AI-TechPark",
    url: "https://ai-techpark.com/category/ai/feed/",
  },
  {
    name: "AI Archives | KnowTechie",
    url: "https://knowtechie.com/category/ai/feed/",
  },
  { name: "AI Business", url: "https://aibusiness.com/rss.xml" },
  { name: "AIModels.fyi", url: "https://aimodels.substack.com/feed" },
  {
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/feed/rss/",
  },
  {
    name: "AI News | VentureBeat",
    url: "https://venturebeat.com/category/ai/feed/",
  },
  {
    name: "AI Now Institute",
    url: "https://ainowinstitute.org/category/news/feed",
  },
  {
    name: "AI – SiliconANGLE",
    url: "https://siliconangle.com/category/ai/feed",
  },
  { name: "AI Snake Oil", url: "https://aisnakeoil.substack.com/feed" },
  {
    name: "AI – Uber Engineering Blog",
    url: "https://eng.uber.com/category/articles/ai/feed",
  },
  { name: "Anaconda Blog", url: "https://www.anaconda.com/blog/feed" },
  {
    name: "Analytics India Magazine",
    url: "https://analyticsindiamag.com/feed/",
  },
  {
    name: "Announcements - Stability AI",
    url: "https://stability.ai/blog?format=rss",
  },
  {
    name: "Ars Technica - All content",
    url: "https://feeds.arstechnica.com/arstechnica/index",
  },
  {
    name: "Artificial Intelligence – Futurism",
    url: "https://futurism.com/categories/ai-artificial-intelligence/feed",
  },
  {
    name: "Artificial Intelligence Latest - Wired",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
  },
  {
    name: "Artificial Intelligence News -- ScienceDaily",
    url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
  },
  {
    name: "Blog - Machine Learning Mastery",
    url: "https://machinelearningmastery.com/blog/feed",
  },
  {
    name: "Chain of Thought",
    url: "https://every.to/chain-of-thought/feed.xml",
  },
  { name: "Chip Huyen", url: "https://huyenchip.com/feed" },
  { name: "Context by Cohere", url: "https://txt.cohere.ai/rss/" },
  { name: "Crunchbase News", url: "https://news.crunchbase.com/feed" },
  { name: "Hugging Face - Blog", url: "https://huggingface.co/blog/feed.xml" },
  { name: "KDnuggets", url: "https://www.kdnuggets.com/feed" },
  { name: "LangChain", url: "https://blog.langchain.dev/rss/" },
  { name: "Last Week in AI", url: "https://lastweekin.ai/feed" },
  { name: "MarkTechPost", url: "https://www.marktechpost.com/feed" },
];

async function testSampleFeeds() {
  console.log("🧪 ÖRNEK AI RSS FEEDLER TEST EDİLİYOR...\n");
  console.log("=".repeat(80));
  console.log(`📊 Test edilecek feed sayısı: ${SAMPLE_FEEDS.length}\n`);

  const results = {
    success: [] as string[],
    failed: [] as string[],
    empty: [] as string[],
  };

  for (const feed of SAMPLE_FEEDS) {
    try {
      console.log(`\n📡 Test ediliyor: ${feed.name}`);

      const items = await fetchRSSFeed(feed.url, feed.name, 1);

      if (items.length === 0) {
        console.log(`   ⚠️  UYARI: Feed boş`);
        results.empty.push(feed.name);
      } else {
        console.log(`   ✅ BAŞARILI: ${items.length} haber bulundu`);
        results.success.push(feed.name);
      }
    } catch (error: any) {
      console.log(`   ❌ HATA: ${error.message}`);
      results.failed.push(feed.name);
    }

    // Rate limiting için kısa bekleme
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Özet rapor
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 TEST SONUÇLARI:\n");
  console.log(`✅ Başarılı: ${results.success.length}/${SAMPLE_FEEDS.length}`);
  console.log(`❌ Başarısız: ${results.failed.length}/${SAMPLE_FEEDS.length}`);
  console.log(`⚠️  Boş: ${results.empty.length}/${SAMPLE_FEEDS.length}`);

  const successRate = (results.success.length / SAMPLE_FEEDS.length) * 100;
  console.log(`\n🎯 BAŞARI ORANI: ${successRate.toFixed(1)}%`);

  if (results.success.length > 0) {
    console.log("\n✅ BAŞARILI FEEDLER:");
    results.success.forEach((name) => console.log(`   - ${name}`));
  }

  if (results.failed.length > 0) {
    console.log("\n❌ BAŞARISIZ FEEDLER:");
    results.failed.forEach((name) => console.log(`   - ${name}`));
  }

  console.log("\n" + "=".repeat(80));

  if (successRate >= 70) {
    console.log(
      "✅ Test başarılı! Feedlerin çoğu çalışıyor, sisteme eklenebilir.",
    );
  } else {
    console.log("⚠️  Çok fazla feed başarısız, dikkatli olunmalı.");
  }
}

// Script'i çalıştır
testSampleFeeds()
  .then(() => {
    console.log("\n✅ Test tamamlandı");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test hatası:", error);
    process.exit(1);
  });
