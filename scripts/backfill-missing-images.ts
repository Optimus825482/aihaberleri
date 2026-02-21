/**
 * Backfill missing/placeholder images for published articles.
 *
 * Usage:
 *   npx tsx scripts/backfill-missing-images.ts
 *   npx tsx scripts/backfill-missing-images.ts --limit=100
 *   npx tsx scripts/backfill-missing-images.ts --all
 *   npx tsx scripts/backfill-missing-images.ts --dry-run
 */

import { db } from "@/lib/db";
import { createHash } from "crypto";

type Args = {
  limit: number;
  all: boolean;
  dryRun: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const all = args.includes("--all");
  const dryRun = args.includes("--dry-run");

  let limit = 50;
  if (limitArg) {
    const parsed = Number(limitArg.split("=")[1]);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = parsed;
    }
  }

  return { limit, all, dryRun };
}

function buildImagePrompt(
  title: string,
  excerpt: string | null,
  category: string,
) {
  const base = `${title} ${excerpt ?? ""} ${category}`.trim();
  return `${base}, professional technology news illustration, no people, no faces, clean composition`;
}

function isBackupProvider(url: string): boolean {
  return url.includes("source.unsplash.com") || url.includes("picsum.photos");
}

function buildQueryFromPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 6);

  if (words.length === 0) {
    return "artificial,intelligence,technology";
  }

  return words.join(",");
}

async function canFetchImage(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchBackupImage(prompt: string): Promise<string> {
  const width = 1200;
  const height = 630;
  const query = buildQueryFromPrompt(prompt);

  const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}`;
  if (await canFetchImage(unsplashUrl)) {
    return unsplashUrl;
  }

  const seed = createHash("md5").update(prompt).digest("hex").slice(0, 12);
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function main() {
  const { limit, all, dryRun } = parseArgs();

  const where = {
    status: "PUBLISHED" as const,
    OR: [
      { imageUrl: null },
      { imageUrl: "" },
      { imageUrl: "/logos/og-image.png" },
    ],
  };

  const total = await db.article.count({ where });
  const take = all ? total : Math.min(limit, total);

  console.log("\n🖼️ Missing Image Backfill");
  console.log(`   Total candidate: ${total}`);
  console.log(`   Processing: ${take}`);
  console.log(`   Dry run: ${dryRun ? "YES" : "NO"}`);

  if (take === 0) {
    console.log("✅ No missing-image article found.");
    return;
  }

  const articles = await db.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      category: { select: { name: true } },
    },
  });

  let updated = 0;
  let failed = 0;
  let backupCount = 0;

  for (const article of articles) {
    try {
      const prompt = buildImagePrompt(
        article.title,
        article.excerpt,
        article.category.name,
      );

      const imageUrl = await fetchBackupImage(prompt);

      if (isBackupProvider(imageUrl)) {
        backupCount += 1;
      }

      if (!dryRun) {
        await db.article.update({
          where: { id: article.id },
          data: {
            imageUrl,
            imageUrlMedium: imageUrl,
            imageUrlSmall: imageUrl,
            imageUrlThumb: imageUrl,
          },
        });
      }

      updated += 1;
      console.log(`✅ ${article.slug} ${dryRun ? "(dry-run)" : ""}`);

      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (error) {
      failed += 1;
      console.error(`❌ ${article.slug}:`, error);
    }
  }

  console.log("\n📊 Backfill Summary");
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Backup provider used: ${backupCount}`);
}

main()
  .catch((error) => {
    console.error("❌ Fatal backfill error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
