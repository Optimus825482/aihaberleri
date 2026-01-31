/**
 * Migrate Pollinations.ai images to Cloudflare R2
 *
 * This script finds all articles with Pollinations.ai image URLs
 * and migrates them to R2 storage.
 *
 * Run: npx tsx scripts/migrate-images-to-r2.ts
 */

import { PrismaClient } from "@prisma/client";
import { optimizeAndGenerateSizes } from "../src/lib/image-optimizer";

const prisma = new PrismaClient();

async function migrateImagesToR2() {
  console.log("🔄 Starting image migration to R2...\n");

  // Find all articles with Pollinations.ai URLs
  const articles = await prisma.article.findMany({
    where: {
      imageUrl: {
        contains: "pollinations.ai",
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(
    `📋 Found ${articles.length} articles with Pollinations.ai images\n`,
  );

  if (articles.length === 0) {
    console.log("✅ No migration needed - all images are already on R2!");
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const article of articles) {
    console.log(`\n📝 Processing: ${article.title.substring(0, 50)}...`);
    console.log(`   Slug: ${article.slug}`);
    console.log(`   Current URL: ${article.imageUrl?.substring(0, 80)}...`);

    if (!article.imageUrl) {
      console.log("   ⚠️ No image URL, skipping...");
      continue;
    }

    try {
      // Generate optimized images and upload to R2
      const imageSizes = await optimizeAndGenerateSizes(
        article.imageUrl,
        article.slug,
      );

      // Update the article with new R2 URLs
      await prisma.article.update({
        where: { id: article.id },
        data: {
          imageUrl: imageSizes.large,
          imageUrlMedium: imageSizes.medium,
          imageUrlSmall: imageSizes.small,
          imageUrlThumb: imageSizes.thumb,
        },
      });

      console.log(`   ✅ Migrated successfully!`);
      console.log(`   New URL: ${imageSizes.large}`);
      successCount++;
    } catch (error) {
      console.error(
        `   ❌ Failed to migrate:`,
        error instanceof Error ? error.message : error,
      );
      failCount++;
    }

    // Rate limiting - wait 2 seconds between each article
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📋 Total: ${articles.length}`);
  console.log("=".repeat(60));
}

migrateImagesToR2()
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
