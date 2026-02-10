/**
 * Backfill Trend Scores — v3.0 scoring ile TÜM makaleleri yeniden puanla
 *
 * Kullanım:
 *   npx tsx scripts/backfill-trend-scores.ts           (sadece eksikleri doldur)
 *   npx tsx scripts/backfill-trend-scores.ts --all     (TÜM makaleleri yeniden puanla)
 *   npx tsx scripts/backfill-trend-scores.ts --dry-run (sadece kontrol)
 */

// Suppress Redis noise (not needed for this script)
const _oe = console.error,
  _ow = console.warn;
console.error = (...a: any[]) => {
  if (
    typeof a[0] === "string" &&
    (a[0].includes("Redis") || a[0].includes("ECONNREFUSED"))
  )
    return;
  _oe.apply(console, a);
};
console.warn = (...a: any[]) => {
  if (
    typeof a[0] === "string" &&
    (a[0].includes("Redis") || a[0].includes("Eviction"))
  )
    return;
  _ow.apply(console, a);
};

import { PrismaClient } from "@prisma/client";
import { calculateTrendScore } from "../src/lib/trend-scoring";

const db = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");
const rescoreAll = process.argv.includes("--all");
const BATCH = 20; // Küçük batch — transaction güvenliği

const C = {
  r: "\x1b[0m",
  g: "\x1b[32m",
  y: "\x1b[33m",
  c: "\x1b[36m",
  d: "\x1b[2m",
  b: "\x1b[1m",
  red: "\x1b[31m",
};

async function main() {
  console.log(`\n${C.c}━━━ Trend Score Backfill v3.0 ━━━${C.r}`);
  console.log(
    `${C.d}Mode: ${isDryRun ? "DRY RUN" : rescoreAll ? "RESCORE ALL" : "MISSING ONLY"}${C.r}\n`,
  );

  const where = rescoreAll
    ? { status: "PUBLISHED" as const }
    : {
        status: "PUBLISHED" as const,
        OR: [{ trendScore: null }, { trendScore: 0 }],
      };

  const total = await db.article.count({ where: { status: "PUBLISHED" } });
  const missing = await db.article.count({
    where: {
      status: "PUBLISHED",
      OR: [{ trendScore: null }, { trendScore: 0 }],
    },
  });
  const target = rescoreAll ? total : missing;

  console.log(
    `📊 Toplam: ${C.b}${total}${C.r} | Eksik: ${C.y}${missing}${C.r} | Hedef: ${C.b}${target}${C.r}\n`,
  );

  if (target === 0) {
    console.log(`${C.g}✅ İşlem gerekmiyor.${C.r}\n`);
    await db.$disconnect();
    process.exit(0);
  }

  // Cursor-based pagination ile TÜM makaleleri işle
  let updated = 0,
    errors = 0,
    cursor: string | undefined;
  const dist: Record<string, number> = {
    "0-20": 0,
    "21-40": 0,
    "41-60": 0,
    "61-80": 0,
    "81-100": 0,
  };
  const topList: { title: string; score: number; b: any }[] = [];

  while (true) {
    const articles = await db.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        sourceDescription: true,
        excerpt: true,
        publishedAt: true,
        sourceUrl: true,
      },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (articles.length === 0) break;
    cursor = articles[articles.length - 1].id;

    // Her makaleyi tek tek güncelle (transaction timeout'u önlemek için)
    for (const art of articles) {
      const desc = art.sourceDescription || art.excerpt || "";
      const breakdown = calculateTrendScore({
        title: art.title,
        description: desc,
        publishedAt: art.publishedAt,
        url: art.sourceUrl || undefined,
      });

      const s = breakdown.total;

      if (!isDryRun) {
        try {
          await db.article.update({
            where: { id: art.id },
            data: { trendScore: s, isTrending: s >= 50 },
          });
          updated++;
        } catch {
          errors++;
        }
      } else {
        updated++;
      }

      // Stats
      if (s <= 20) dist["0-20"]++;
      else if (s <= 40) dist["21-40"]++;
      else if (s <= 60) dist["41-60"]++;
      else if (s <= 80) dist["61-80"]++;
      else dist["81-100"]++;

      // Top 10 tracking
      topList.push({ title: art.title, score: s, b: breakdown });
      if (topList.length > 10) {
        topList.sort((a, b) => b.score - a.score);
        topList.length = 10;
      }
    }

    process.stdout.write(
      `\r   ${C.d}[${Math.round((updated / target) * 100)}%] ${updated}/${target}${C.r}  `,
    );
  }

  // Sonuç
  console.log(`\n\n${C.c}━━━ Sonuç ━━━${C.r}`);
  console.log(
    `   Güncellenen: ${C.g}${updated}${C.r}${errors > 0 ? ` | Hata: ${C.red}${errors}${C.r}` : ""}`,
  );

  console.log(`\n${C.c}━━━ Puan Dağılımı ━━━${C.r}`);
  const mx = Math.max(...Object.values(dist), 1);
  for (const [range, count] of Object.entries(dist)) {
    const bar = "█".repeat(Math.round((count / mx) * 30)).padEnd(30, "░");
    console.log(`   ${range.padStart(6)}: ${bar} ${count}`);
  }

  topList.sort((a, b) => b.score - a.score);
  console.log(`\n${C.c}━━━ Top 10 ━━━${C.r}`);
  topList.forEach((a, i) => {
    const { b } = a;
    console.log(
      `   ${C.b}${i + 1}.${C.r} [${C.g}${a.score}${C.r}] AI:${b.aiRelevance} F:${b.freshness} S:${b.sourceAuthority} T:${b.titleQuality} D:${b.contentDepth} N:${b.topicNovelty} E:${b.engagementPotential}`,
    );
    console.log(`      ${C.d}${a.title.substring(0, 80)}${C.r}`);
  });

  console.log(
    `\n${isDryRun ? `${C.y}⚠️  DRY RUN${C.r}` : `${C.g}✅ Tamamlandı${C.r}`}\n`,
  );
  await db.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
