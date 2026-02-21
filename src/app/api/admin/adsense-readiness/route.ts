import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/admin-auth";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

type CheckItem = {
  key: string;
  label: string;
  required: boolean;
  ok: boolean;
  detail: string;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return 0;
};

export async function GET() {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [published30d, publishedTotal, missingImage, thinRaw] =
      await Promise.all([
        db.article.count({
          where: {
            status: "PUBLISHED",
            publishedAt: { gte: thirtyDaysAgo },
          },
        }),
        db.article.count({ where: { status: "PUBLISHED" } }),
        db.article.count({
          where: {
            status: "PUBLISHED",
            OR: [{ imageUrl: null }, { imageUrl: "" }],
          },
        }),
        db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "Article"
        WHERE "status" = 'PUBLISHED'
          AND COALESCE(length("content"), 0) < 1800
      `,
      ]);

    const thinCount = toNumber(thinRaw?.[0]?.count);

    const adsTxtPath = path.join(process.cwd(), "public", "ads.txt");
    let adsTxtExists = false;
    let adsTxtConfigured = false;
    let adsTxtContent = "";

    try {
      await access(adsTxtPath);
      adsTxtExists = true;
      adsTxtContent = await readFile(adsTxtPath, "utf-8");
    } catch {
      adsTxtExists = false;
      adsTxtContent = "";
    }

    const normalizedAdsLines = adsTxtContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => Boolean(line) && !line.startsWith("#"));

    adsTxtConfigured = normalizedAdsLines.some((line) =>
      /google\.com\s*,\s*pub-\d{10,}\s*,\s*DIRECT\s*,\s*f08c47fec0942fa0/i.test(
        line,
      ),
    );

    const privacyPath = path.join(
      process.cwd(),
      "src",
      "app",
      "privacy",
      "page.tsx",
    );
    const cookiesPath = path.join(
      process.cwd(),
      "src",
      "app",
      "cookies",
      "page.tsx",
    );
    const consentPath = path.join(
      process.cwd(),
      "src",
      "components",
      "CookieConsent.tsx",
    );

    let legalPagesReady = false;
    let consentCategoryReady = false;

    try {
      await Promise.all([access(privacyPath), access(cookiesPath)]);
      legalPagesReady = true;
    } catch {
      legalPagesReady = false;
    }

    const legalRouteChecks: Array<Promise<boolean>> = [];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      const baseUrl = siteUrl.replace(/\/$/, "");
      const checkRoute = async (routePath: string) => {
        try {
          const response = await fetch(`${baseUrl}${routePath}`, {
            cache: "no-store",
          });
          return response.ok;
        } catch {
          return false;
        }
      };

      legalRouteChecks.push(checkRoute("/privacy"));
      legalRouteChecks.push(checkRoute("/cookies"));
    }

    if (!legalPagesReady && legalRouteChecks.length > 0) {
      const [privacyOk, cookiesOk] = await Promise.all(legalRouteChecks);
      legalPagesReady = privacyOk && cookiesOk;
    }

    try {
      const consentFile = await readFile(consentPath, "utf-8");
      consentCategoryReady =
        consentFile.includes("advertising") &&
        consentFile.includes("analytics") &&
        consentFile.includes("essential");
    } catch {
      consentCategoryReady = false;
    }

    const checks: CheckItem[] = [
      {
        key: "ads_txt_exists",
        label: "ads.txt dosyası mevcut",
        required: true,
        ok: adsTxtExists,
        detail: adsTxtExists
          ? "public/ads.txt bulundu"
          : "public/ads.txt eksik",
      },
      {
        key: "ads_txt_configured",
        label: "ads.txt publisher ID tanımlı",
        required: true,
        ok: adsTxtConfigured,
        detail: adsTxtConfigured
          ? "Gerçek publisher ID görünüyor"
          : "Placeholder ID hala duruyor",
      },
      {
        key: "published_30d",
        label: "Son 30 gün yayın ritmi yeterli",
        required: true,
        ok: published30d >= 20,
        detail: `${published30d} yayın (hedef: en az 20)`,
      },
      {
        key: "legal_pages",
        label: "Gizlilik + Çerez sayfaları hazır",
        required: true,
        ok: legalPagesReady,
        detail: legalPagesReady
          ? "Yasal sayfalar erişilebilir"
          : "Yasal sayfalarda eksik dosya var",
      },
      {
        key: "consent_categories",
        label: "Çerez tercih kategorileri mevcut",
        required: true,
        ok: consentCategoryReady,
        detail: consentCategoryReady
          ? "essential/analytics/advertising mevcut"
          : "Kategorik consent eksik",
      },
      {
        key: "thin_content_ratio",
        label: "Düşük içerik oranı kontrolü",
        required: false,
        ok: publishedTotal === 0 ? true : thinCount / publishedTotal <= 0.35,
        detail:
          publishedTotal === 0
            ? "Yayın yok"
            : `${thinCount}/${publishedTotal} içerik kısa (eşik: %35)`,
      },
      {
        key: "missing_image_ratio",
        label: "Görsel eksikliği düşük",
        required: false,
        ok: publishedTotal === 0 ? true : missingImage / publishedTotal <= 0.15,
        detail:
          publishedTotal === 0
            ? "Yayın yok"
            : `${missingImage}/${publishedTotal} görsel eksik (eşik: %15)`,
      },
    ];

    const readyChecks = checks.filter((item) => item.ok).length;
    const requiredChecks = checks.filter((item) => item.required);
    const requiredReady = requiredChecks.filter((item) => item.ok).length;
    const score = Math.round((readyChecks / checks.length) * 100);

    const recommendations: string[] = [];
    if (!adsTxtConfigured) {
      recommendations.push(
        "ads.txt içindeki publisher ID'yi gerçek AdSense ID ile değiştirin.",
      );
    }
    if (published30d < 20) {
      recommendations.push(
        "Son 30 gün içerik sayısını artırın (en az 20 yayın hedefleyin).",
      );
    }
    if (publishedTotal > 0 && thinCount / publishedTotal > 0.35) {
      recommendations.push(
        "Kısa içerikleri genişletin, thin-content oranını düşürün.",
      );
    }
    if (publishedTotal > 0 && missingImage / publishedTotal > 0.15) {
      recommendations.push(
        "Görselsiz içerikleri backfill script ile tamamlayın.",
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          generatedAt: now.toISOString(),
          score,
          summary: {
            readyChecks,
            totalChecks: checks.length,
            requiredReady,
            requiredTotal: requiredChecks.length,
            published30d,
            publishedTotal,
            thinCount,
            missingImage,
          },
          checks,
          recommendations,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("[ADMIN_ADSENSE_READINESS] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
