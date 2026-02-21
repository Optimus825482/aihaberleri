import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CliOptions = {
  limit: number;
  minContentLength: number;
};

const parseOptions = (): CliOptions => {
  const args = process.argv.slice(2);

  const getNumericArg = (name: string, fallback: number) => {
    const item = args.find((arg) => arg.startsWith(`--${name}=`));
    if (!item) return fallback;
    const value = Number(item.split("=")[1]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    limit: getNumericArg("limit", 50),
    minContentLength: getNumericArg("min-content", 1800),
  };
};

const normalizeLength = (html: string | null) => {
  if (!html) return 0;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
};

async function main() {
  const { limit, minContentLength } = parseOptions();

  const [imageless, lowContent, totals] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { imageUrl: null },
          { imageUrl: "" },
          { imageUrl: "/logos/og-image.png" },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        imageUrl: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: limit * 20,
    }),
    prisma.article.count({ where: { status: "PUBLISHED" } }),
  ]);

  const lowContentFiltered = lowContent
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      contentLength: normalizeLength(item.content),
      publishedAt: item.publishedAt,
    }))
    .filter((item) => item.contentLength < minContentLength)
    .slice(0, limit);

  console.log("\n=== CONTENT QUALITY REPORT ===\n");
  console.log(`Toplam yayın: ${totals}`);
  console.log(`Görselsiz (ilk ${limit}): ${imageless.length}`);
  console.log(
    `Düşük içerik < ${minContentLength} (ilk ${limit}): ${lowContentFiltered.length}`,
  );

  if (imageless.length > 0) {
    console.log("\n--- GÖRSELSİZ / PLACEHOLDER HABERLER ---");
    console.table(
      imageless.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title?.slice(0, 80),
        imageUrl: item.imageUrl || "NULL",
        publishedAt: item.publishedAt?.toISOString(),
      })),
    );
  }

  if (lowContentFiltered.length > 0) {
    console.log("\n--- DÜŞÜK İÇERİK HABERLER ---");
    console.table(
      lowContentFiltered.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title?.slice(0, 80),
        contentLength: item.contentLength,
        publishedAt: item.publishedAt?.toISOString(),
      })),
    );
  }

  console.log("\n=== DÜZELTME AKSİYONU ===");
  console.log("1) Görselsizler için otomatik backfill çalıştır:");
  console.log("   npm run backfill:images -- --limit=200");
  console.log(
    "2) Düşük içerik listesi için editoryal/LLM genişletme kuyruğu aç:",
  );
  console.log(
    "   - Bu rapordaki id/slug listesini kullanarak içerikleri >= 1800 karaktere çıkar",
  );
  console.log("3) Düzeltme sonrası tekrar rapor al:");
  console.log(
    `   npx tsx scripts/report-content-quality.ts --limit=${limit} --min-content=${minContentLength}`,
  );
}

main()
  .catch((error) => {
    console.error("[REPORT_CONTENT_QUALITY]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
