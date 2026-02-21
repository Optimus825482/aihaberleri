import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readFile } from "node:fs/promises";
import path from "node:path";

type GlobalCheckItem = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

type LiveCheckItem = {
  key: string;
  label: string;
  url: string;
  ok: boolean;
  detail: string;
  debug?: {
    status?: number;
    path?: string;
    hasScript?: boolean;
    hasSlot?: boolean;
    hasFormat?: boolean;
    hasLayout?: boolean;
    missing?: string[];
    snippet?: string;
  };
};

const ADS_CLIENT_ID = "ca-pub-2444093901783574";
const SCRIPT_MARKER = `adsbygoogle.js?client=${ADS_CLIENT_ID}`;

const hasAttrValue = (html: string, attr: string, value: string) => {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${attr}\\s*=\\s*[\"']${escapedValue}[\"']`, "i");
  return regex.test(html);
};

const getFirstAdSnippet = (html: string) => {
  const match = html.match(
    /<ins[^>]*class=["'][^"']*adsbygoogle[^"']*["'][^>]*>/i,
  );
  return match?.[0]?.slice(0, 220);
};

const fetchHtml = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  const html = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    html,
  };
};

export async function GET(request: NextRequest) {
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      request.nextUrl.origin;

    const adsenseEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
    const configuredClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

    const adsTxtPath = path.join(process.cwd(), "public", "ads.txt");
    let adsTxtExists = false;
    let adsTxtConfigured = false;

    try {
      const adsTxtContent = await readFile(adsTxtPath, "utf-8");
      adsTxtExists = true;
      const normalizedAdsLines = adsTxtContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => Boolean(line) && !line.startsWith("#"));

      adsTxtConfigured = normalizedAdsLines.some((line) =>
        /google\.com\s*,\s*pub-\d{10,}\s*,\s*DIRECT\s*,\s*f08c47fec0942fa0/i.test(
          line,
        ),
      );
    } catch {
      adsTxtExists = false;
      adsTxtConfigured = false;
    }

    const globalChecks: GlobalCheckItem[] = [
      {
        key: "adsense_enabled",
        label: "NEXT_PUBLIC_ADSENSE_ENABLED",
        ok: adsenseEnabled,
        detail: adsenseEnabled ? "true" : "false veya tanımsız",
      },
      {
        key: "adsense_client_id",
        label: "NEXT_PUBLIC_ADSENSE_CLIENT_ID",
        ok: configuredClientId === ADS_CLIENT_ID,
        detail:
          configuredClientId === ADS_CLIENT_ID
            ? ADS_CLIENT_ID
            : configuredClientId
              ? `Uyumsuz: ${configuredClientId}`
              : "Tanımsız",
      },
      {
        key: "ads_txt_exists",
        label: "ads.txt dosyası",
        ok: adsTxtExists,
        detail: adsTxtExists
          ? "public/ads.txt mevcut"
          : "public/ads.txt bulunamadı",
      },
      {
        key: "ads_txt_configured",
        label: "ads.txt publisher satırı",
        ok: adsTxtConfigured,
        detail: adsTxtConfigured
          ? "Google publisher satırı doğrulandı"
          : "Geçerli google.com, pub-..., DIRECT satırı bulunamadı",
      },
    ];

    const [latestTrArticle, latestEnTranslation] = await Promise.all([
      db.article.findFirst({
        where: { status: "PUBLISHED" },
        select: { slug: true },
        orderBy: { publishedAt: "desc" },
      }),
      db.articleTranslation.findFirst({
        where: {
          locale: "en",
          article: { status: "PUBLISHED" },
        },
        select: { slug: true },
        orderBy: {
          article: { publishedAt: "desc" },
        },
      }),
    ]);

    const routes: Array<{
      key: string;
      label: string;
      path: string | null;
      slot: string;
      format: string;
      layout?: string;
    }> = [
      {
        key: "tr_home",
        label: "TR Ana Sayfa",
        path: "/",
        slot: "3977540197",
        format: "auto",
      },
      {
        key: "en_home",
        label: "EN Ana Sayfa",
        path: "/en",
        slot: "6653849624",
        format: "fluid",
      },
      {
        key: "tr_article",
        label: "TR Haber Detay",
        path: latestTrArticle ? `/news/${latestTrArticle.slug}` : null,
        slot: "6220560152",
        format: "fluid",
        layout: "in-article",
      },
      {
        key: "en_article",
        label: "EN Haber Detay",
        path: latestEnTranslation
          ? `/en/news/${latestEnTranslation.slug}`
          : null,
        slot: "3183333271",
        format: "autorelaxed",
      },
    ];

    const checks: LiveCheckItem[] = [];

    for (const route of routes) {
      if (!route.path) {
        checks.push({
          key: route.key,
          label: route.label,
          url: "-",
          ok: false,
          detail: "Örnek haber bulunamadı, bu rota kontrol edilemedi.",
          debug: {
            path: route.path ?? undefined,
            missing: ["route"],
          },
        });
        continue;
      }

      const url = `${origin}${route.path}`;
      const result = await fetchHtml(url);

      if (!result.ok) {
        checks.push({
          key: route.key,
          label: route.label,
          url,
          ok: false,
          detail: `Sayfa yanıtı başarısız (${result.status}).`,
          debug: {
            status: result.status,
            path: route.path,
            missing: ["page-response"],
          },
        });
        continue;
      }

      const hasScript = result.html.includes(SCRIPT_MARKER);
      const hasSlot = hasAttrValue(result.html, "data-ad-slot", route.slot);
      const hasFormat = hasAttrValue(
        result.html,
        "data-ad-format",
        route.format,
      );
      const hasLayout = route.layout
        ? hasAttrValue(result.html, "data-ad-layout", route.layout)
        : true;
      const snippet = getFirstAdSnippet(result.html);

      const ok = hasScript && hasSlot && hasFormat && hasLayout;
      const missing = [
        !hasScript ? "script" : null,
        !hasSlot ? "slot" : null,
        !hasFormat ? "format" : null,
        !hasLayout ? "layout" : null,
      ].filter(Boolean) as string[];

      checks.push({
        key: route.key,
        label: route.label,
        url,
        ok,
        detail: ok
          ? "Script + slot + format doğrulandı."
          : `Eksik: ${missing.join(", ")}`,
        debug: {
          status: result.status,
          path: route.path,
          hasScript,
          hasSlot,
          hasFormat,
          hasLayout,
          missing,
          snippet,
        },
      });
    }

    const recommendations: string[] = [];
    if (!adsenseEnabled) {
      recommendations.push("NEXT_PUBLIC_ADSENSE_ENABLED değerini true yapın.");
    }
    if (configuredClientId !== ADS_CLIENT_ID) {
      recommendations.push(
        `NEXT_PUBLIC_ADSENSE_CLIENT_ID değerini ${ADS_CLIENT_ID} yapın.`,
      );
    }
    if (!adsTxtExists || !adsTxtConfigured) {
      recommendations.push(
        "public/ads.txt içinde gerçek google.com publisher satırını doğrulayın.",
      );
    }
    if (checks.some((item) => !item.ok)) {
      recommendations.push(
        "Eksik rotalarda slot/format/layout değerlerini sayfa kodu ile eşitleyin.",
      );
    }

    const allChecksCount = globalChecks.length + checks.length;
    const globalOkCount = globalChecks.filter((item) => item.ok).length;
    const okCount = checks.filter((item) => item.ok).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          score: Math.round(((globalOkCount + okCount) / allChecksCount) * 100),
          summary: {
            globalOkCount,
            globalTotal: globalChecks.length,
            okCount,
            total: checks.length,
          },
          globalChecks,
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
