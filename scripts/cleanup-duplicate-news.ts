/**
 * Cleanup Duplicate News Articles
 *
 * Bu script duplicate haberleri tespit edip temizler
 * Strateji: Her duplicate grup için en çok görüntülenen VE en güncel olanı tutar
 */

import { db } from "../src/lib/db";
import { distance } from "fastest-levenshtein";

interface DuplicateGroup {
  keepArticle: {
    id: string;
    title: string;
    views: number;
    publishedAt: Date | null;
  };
  deleteArticles: Array<{
    id: string;
    title: string;
    views: number;
    publishedAt: Date | null;
  }>;
}

function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const dist = distance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - dist / maxLength;
}

async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  console.log("🔍 Searching for duplicate articles...\n");

  // Get all published articles from last 7 days
  const articles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      title: true,
      views: true,
      publishedAt: true,
      slug: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  console.log(`📊 Total articles to check: ${articles.length}\n`);

  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < articles.length; i++) {
    if (processedIds.has(articles[i].id)) continue;

    const currentArticle = articles[i];
    const similarArticles = [];

    // Find similar articles
    for (let j = i + 1; j < articles.length; j++) {
      if (processedIds.has(articles[j].id)) continue;

      const similarity = calculateSimilarity(
        currentArticle.title,
        articles[j].title,
      );

      // 80% similarity threshold
      if (similarity > 0.8) {
        similarArticles.push({
          article: articles[j],
          similarity,
        });
      }
    }

    // If we found duplicates
    if (similarArticles.length > 0) {
      const allArticles = [
        { article: currentArticle, similarity: 1.0 },
        ...similarArticles,
      ];

      // Sort by: 1. Views (descending), 2. PublishedAt (descending)
      allArticles.sort((a, b) => {
        // First priority: views
        if (b.article.views !== a.article.views) {
          return b.article.views - a.article.views;
        }
        // Second priority: most recent
        return (
          (b.article.publishedAt?.getTime() ?? 0) -
          (a.article.publishedAt?.getTime() ?? 0)
        );
      });

      const keepArticle = allArticles[0].article;
      const deleteArticles = allArticles.slice(1).map((a) => a.article);

      duplicateGroups.push({
        keepArticle: {
          id: keepArticle.id,
          title: keepArticle.title,
          views: keepArticle.views,
          publishedAt: keepArticle.publishedAt,
        },
        deleteArticles: deleteArticles.map((a) => ({
          id: a.id,
          title: a.title,
          views: a.views,
          publishedAt: a.publishedAt,
        })),
      });

      // Mark all as processed
      processedIds.add(keepArticle.id);
      deleteArticles.forEach((a) => processedIds.add(a.id));

      console.log(`\n📦 Duplicate Group Found:`);
      console.log(`   ✅ KEEP: "${keepArticle.title}"`);
      console.log(
        `      Views: ${keepArticle.views}, Published: ${keepArticle.publishedAt?.toLocaleString("tr-TR") ?? "N/A"}`,
      );
      console.log(`   ❌ DELETE (${deleteArticles.length}):`);
      deleteArticles.forEach((a) => {
        console.log(`      - "${a.title}"`);
        console.log(
          `        Views: ${a.views}, Published: ${a.publishedAt?.toLocaleString("tr-TR") ?? "N/A"}`,
        );
      });
    }
  }

  return duplicateGroups;
}

async function cleanupDuplicates(dryRun: boolean = true) {
  console.log("🧹 Starting duplicate news cleanup...\n");
  console.log(
    `Mode: ${dryRun ? "🔍 DRY RUN (no changes)" : "⚠️  LIVE MODE (will delete)"}\n`,
  );

  const duplicateGroups = await findDuplicateGroups();

  if (duplicateGroups.length === 0) {
    console.log("\n✅ No duplicates found!");
    return;
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`   Duplicate groups: ${duplicateGroups.length}`);

  const totalToDelete = duplicateGroups.reduce(
    (sum, group) => sum + group.deleteArticles.length,
    0,
  );
  console.log(`   Articles to keep: ${duplicateGroups.length}`);
  console.log(`   Articles to delete: ${totalToDelete}`);

  if (dryRun) {
    console.log("\n🔍 DRY RUN - No changes made");
    console.log("   Run with --live flag to actually delete duplicates");
    return;
  }

  // Confirm deletion
  console.log("\n⚠️  WARNING: About to delete duplicate articles!");
  console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("\n🗑️  Deleting duplicates...\n");

  let deletedCount = 0;
  let errorCount = 0;

  for (const group of duplicateGroups) {
    for (const article of group.deleteArticles) {
      try {
        await db.article.delete({
          where: { id: article.id },
        });
        deletedCount++;
        console.log(
          `   ✅ Deleted: ${article.id} - "${article.title.substring(0, 60)}..."`,
        );
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error deleting ${article.id}:`, error);
      }
    }
  }

  console.log("\n\n📊 Cleanup Complete:");
  console.log(`   ✅ Successfully deleted: ${deletedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Total processed: ${deletedCount + errorCount}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isLiveMode = args.includes("--live");

// Run cleanup
cleanupDuplicates(!isLiveMode)
  .then(() => {
    console.log("\n✅ Script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
