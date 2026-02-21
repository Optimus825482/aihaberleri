import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type LiveCheckItem = {
  key: string;
  label: string;
  url: string;
  ok: boolean;
  detail: string;
};

const ADS_CLIENT_ID = "ca-pub-2444093901783574";
const SCRIPT_MARKER = `adsbygoogle.js?client=${ADS_CLIENT_ID}`;

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
        });
        continue;
      }

      const hasScript = result.html.includes(SCRIPT_MARKER);
      const hasSlot = result.html.includes(`data-ad-slot=\"${route.slot}\"`);
      const hasFormat = result.html.includes(
        `data-ad-format=\"${route.format}\"`,
      );
      const hasLayout = route.layout
        ? result.html.includes(`data-ad-layout=\"${route.layout}\"`)
        : true;

      const ok = hasScript && hasSlot && hasFormat && hasLayout;

      checks.push({
        key: route.key,
        label: route.label,
        url,
        ok,
        detail: ok
          ? "Script + slot + format doğrulandı."
          : `Eksik: ${[
              !hasScript ? "script" : null,
              !hasSlot ? "slot" : null,
              !hasFormat ? "format" : null,
              !hasLayout ? "layout" : null,
            ]
              .filter(Boolean)
              .join(", ")}`,
      });
    }

    const okCount = checks.filter((item) => item.ok).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          score: Math.round((okCount / checks.length) * 100),
          summary: {
            okCount,
            total: checks.length,
          },
          checks,
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
