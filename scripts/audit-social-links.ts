/**
 * Audit social share link integrity
 *
 * Finds potentially broken historical social shares by comparing:
 * - Legacy URL generation logic (pre-fix)
 * - Current normalized URL generation logic
 *
 * Usage:
 *   npx tsx scripts/audit-social-links.ts
 *   npx tsx scripts/audit-social-links.ts --days=60
 *   npx tsx scripts/audit-social-links.ts --since=2026-01-01
 *   npx tsx scripts/audit-social-links.ts --platform=BLUESKY
 *   npx tsx scripts/audit-social-links.ts --limit=1000
 */

import { PrismaClient, SocialPlatform } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { buildSocialArticleUrl } from "../src/lib/social/url";

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const eqArg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eqArg) return eqArg.split("=").slice(1).join("=");

  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx >= 0) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith("--")) {
      return next;
    }
  }

  return undefined;
}

function parseDateInput(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSinceDate(): Date {
  const sinceArg = getArg("since");
  const sinceDate = parseDateInput(sinceArg);
  if (sinceDate) return sinceDate;

  const daysArg = Number(getArg("days") || "30");
  const days = Number.isFinite(daysArg) && daysArg > 0 ? daysArg : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  return siteUrl.replace(/\/+$/, "");
}

function buildLegacySocialArticleUrl(
  slugOrPath: string,
  language: "tr" | "en",
): string {
  const siteUrl = getSiteUrl();
  const slug = slugOrPath || "";

  if (language === "en") {
    return slug.startsWith("en/")
      ? `${siteUrl}/${slug}`
      : `${siteUrl}/en/news/${slug}`;
  }

  return `${siteUrl}/news/${slug}`;
}

function normalizeLanguage(
  platform: SocialPlatform,
  language?: string | null,
): "tr" | "en" {
  if (platform.endsWith("_EN") || language === "en") return "en";
  return "tr";
}

function riskReasonFromSlug(
  slug: string,
  language: "tr" | "en",
): string | null {
  if (!slug) return "empty-slug";
  if (/^https?:\/\//i.test(slug)) return "slug-is-full-url";
  if (slug.startsWith("/")) return "leading-slash";
  if (
    language === "tr" &&
    (slug.startsWith("en/") || slug.startsWith("news/"))
  ) {
    return "tr-slug-has-path-prefix";
  }
  if (
    language === "en" &&
    (slug.startsWith("news/") || slug.startsWith("/en/"))
  ) {
    return "en-slug-has-unexpected-prefix";
  }
  return null;
}

async function main() {
  const since = getSinceDate();
  const limitArg = Number(getArg("limit") || "2000");
  const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : 2000;

  const platformArg = getArg("platform") as SocialPlatform | undefined;
  const platformFilter = platformArg
    ? ({ equals: platformArg } as const)
    : undefined;

  console.log("🔎 Social link audit started");
  console.log(`   Since: ${since.toISOString()}`);
  console.log(`   Limit: ${limit}`);
  if (platformArg) console.log(`   Platform: ${platformArg}`);

  const shares = await prisma.socialShare.findMany({
    where: {
      status: "SHARED",
      sharedAt: { gte: since },
      ...(platformFilter ? { platform: platformFilter } : {}),
    },
    include: {
      article: {
        select: {
          id: true,
          slug: true,
          title: true,
          translations: {
            where: { locale: "en" },
            select: { slug: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { sharedAt: "desc" },
    take: limit,
  });

  const results = shares.map((share) => {
    const language = normalizeLanguage(share.platform, share.language);
    const enSlug = share.article.translations[0]?.slug;
    const slug =
      language === "en" ? enSlug || share.article.slug : share.article.slug;

    const legacyUrl = buildLegacySocialArticleUrl(slug, language);
    const fixedUrl = buildSocialArticleUrl(slug, language);
    const differs = legacyUrl !== fixedUrl;
    const riskReason = riskReasonFromSlug(slug, language);

    return {
      socialShareId: share.id,
      articleId: share.articleId,
      platform: share.platform,
      language,
      sharedAt: share.sharedAt?.toISOString() || null,
      articleTitle: share.article.title,
      slug,
      legacyUrl,
      fixedUrl,
      differs,
      riskReason,
      postId: share.postId,
      postUrl: share.postUrl,
    };
  });

  const flagged = results.filter((r) => r.differs || r.riskReason);

  const byPlatform: Record<string, { total: number; flagged: number }> = {};
  for (const row of results) {
    if (!byPlatform[row.platform]) {
      byPlatform[row.platform] = { total: 0, flagged: 0 };
    }
    byPlatform[row.platform].total += 1;
  }
  for (const row of flagged) {
    byPlatform[row.platform].flagged += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    siteUrl: getSiteUrl(),
    filters: {
      since: since.toISOString(),
      limit,
      platform: platformArg || null,
    },
    summary: {
      scanned: results.length,
      flagged: flagged.length,
      byPlatform,
    },
    flagged,
  };

  const reportsDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportsDir, `social-link-audit-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log("\n✅ Audit completed");
  console.log(`   Scanned: ${results.length}`);
  console.log(`   Flagged: ${flagged.length}`);
  console.log(`   Report: ${reportPath}`);

  if (flagged.length > 0) {
    console.log("\n⚠️ Top flagged records:");
    for (const item of flagged.slice(0, 10)) {
      console.log(
        `   - ${item.platform} [${item.language}] ${item.slug} | reason=${item.riskReason || "legacy-fixed-diff"}`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error("❌ Audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
