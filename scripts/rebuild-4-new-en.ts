/**
 * Sadece Bluesky'dan gelen 4 yeni EN slug için ArticleTranslation oluştur
 * Usage: npx tsx scripts/rebuild-4-new-en.ts
 */

import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { searxngSearch } from "../src/lib/searxng";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-2750fa1691164dd2940c2ec3cb37d2e6";
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
const prisma = new PrismaClient();

const NEW_SLUGS = [
  {
    slug: "barclays-reports-12-profit-surge-bets-on-ai-and-us-expansion",
    title: "Barclays Reports 12% Profit Surge, Bets on AI and US Expansion",
  },
  {
    slug: "google-gemini-reaches-750-million-monthly-users",
    title: "Google Gemini Reaches 750 Million Monthly Users",
  },
  {
    slug: "chinese-companys-record-speed-humanoid-robot-bolt-runs-10-meters-per-second",
    title:
      "Chinese Company's Record-Speed Humanoid Robot: Bolt Runs 10 Meters Per Second",
  },
  {
    slug: "bill-gates-backed-company-files-license-application-for-first-commercial-fusion-plant-in-the-us",
    title:
      "Bill Gates-Backed Company Files License Application for First Commercial Fusion Plant in the US",
  },
];

async function generateEnContent(title: string): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
} | null> {
  let webContext = "No web results found.";
  try {
    const results = await searxngSearch(title, {
      count: 5,
      language: "en",
      safesearch: 1,
      categories: "general,news",
    });

    if (results.length > 0) {
      webContext = results
        .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}`)
        .join("\n\n");
    }
  } catch {}

  try {
    const resp = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a professional English news editor. Return only valid JSON.",
          },
          {
            role: "user",
            content: `Write a professional English news article:\n\nTITLE: ${title}\n\nWEB SOURCES:\n${webContext}\n\nReturn JSON:\n{"title":"SEO title","excerpt":"2-3 sentence summary","content":"400+ word HTML article (<p>,<h2>,<h3>,<ul>,<li>,<strong>)","keywords":["5-8 keywords"],"metaDescription":"155 char meta"}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000,
      },
    );
    const raw = resp.data.choices[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    console.error(`  ❌ DeepSeek hatası: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log("🆕 4 Yeni EN Slug İşleniyor");
  console.log("=".repeat(60));

  const defaultCat = await prisma.category.findFirst({
    where: { slug: "yapay-zeka-haberleri" },
  });
  const user = await prisma.user.findFirst({
    where: { email: "admin@aihaberleri.org" },
  });
  if (!defaultCat || !user) {
    console.error("❌ Kategori veya user bulunamadı");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const item of NEW_SLUGS) {
    console.log(`\n🔄 ${item.title}`);

    // Zaten var mı?
    const existing = await prisma.articleTranslation.findFirst({
      where: { slug: item.slug, locale: "en" },
    });
    if (existing) {
      console.log(`  ⏭️  Zaten var, atlanıyor`);
      continue;
    }

    // İçerik üret
    console.log(`  🤖 İçerik üretiliyor...`);
    const content = await generateEnContent(item.title);
    if (!content) {
      console.error(`  ❌ İçerik üretilemedi`);
      failed++;
      continue;
    }

    // TR slug oluştur
    const trSlug = `tr-${item.slug}`.substring(0, 190);

    // Mevcut TR article var mı?
    const existingTr = await prisma.article.findUnique({
      where: { slug: trSlug },
    });

    if (existingTr) {
      // Mevcut TR'ye bağla
      await prisma.article.update({
        where: { id: existingTr.id },
        data: {
          titleEn: content.title,
          excerptEn: content.excerpt,
          contentEn: content.content,
          metaDescriptionEn: content.metaDescription,
          keywordsEn: content.keywords,
        },
      });
      await prisma.articleTranslation.create({
        data: {
          articleId: existingTr.id,
          locale: "en",
          title: content.title,
          slug: item.slug,
          excerpt: content.excerpt,
          content: content.content,
          metaTitle: content.title,
          metaDescription: content.metaDescription,
        },
      });
      console.log(`  ✅ Mevcut TR'ye bağlandı: ${trSlug}`);
    } else {
      // Yeni article + translation oluştur
      const publishDate = new Date();
      const newArticle = await prisma.article.create({
        data: {
          title: content.title,
          slug: trSlug,
          excerpt: content.excerpt,
          content: content.content,
          imageUrl: null,
          status: "PUBLISHED",
          publishedAt: publishDate,
          createdAt: publishDate,
          categoryId: defaultCat.id,
          authorId: user.id,
          metaTitle: content.title,
          metaDescription: content.metaDescription,
          keywords: content.keywords,
          titleEn: content.title,
          excerptEn: content.excerpt,
          contentEn: content.content,
          metaDescriptionEn: content.metaDescription,
          keywordsEn: content.keywords,
          score: 600,
          language: "tr",
          readingTime: Math.ceil(content.content.split(/\s+/).length / 200),
        },
      });
      await prisma.articleTranslation.create({
        data: {
          articleId: newArticle.id,
          locale: "en",
          title: content.title,
          slug: item.slug,
          excerpt: content.excerpt,
          content: content.content,
          metaTitle: content.title,
          metaDescription: content.metaDescription,
        },
      });
      console.log(
        `  ✅ Yeni article oluşturuldu: ${trSlug} | EN: ${item.slug}`,
      );
    }
    success++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Sonuç: ✅ ${success} başarılı, ❌ ${failed} başarısız`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
