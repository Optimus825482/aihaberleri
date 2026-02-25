import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  isAdSenseConfigured,
  getAdSenseMetricsForAnalysis,
} from "@/lib/adsense-client";
import { callDeepSeek } from "@/lib/deepseek";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdSenseAnalysisDelegate = {
  create: (...args: any[]) => Promise<any>;
};

const adSenseAnalysisTable = (db as any)["adSenseAnalysis"] as
  | AdSenseAnalysisDelegate
  | undefined;

/**
 * POST: AI analiz yap + DB'ye kaydet
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    if (!isAdSenseConfigured()) {
      return NextResponse.json({
        success: false,
        error: "AdSense yapılandırması eksik. ADSENSE_ACCOUNT_ID gerekli.",
        configured: false,
      });
    }

    // AdSense metriklerini topla
    const metricsStart = Date.now();
    const metrics = await getAdSenseMetricsForAnalysis();
    const metricsDuration = Date.now() - metricsStart;

    // AI prompt oluştur
    const prompt = buildAnalysisPrompt(metrics);

    const aiStart = Date.now();
    const aiResponse = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "Sen bir dijital reklam gelir optimizasyon uzmanısın. AdSense performans metriklerini analiz ederek detaylı, uygulanabilir öneriler sunuyorsun. JSON formatında yanıt ver.",
        },
        { role: "user", content: prompt },
      ],
      {
        temperature: 0.3,
        maxTokens: 3000,
      },
    );
    const aiDuration = Date.now() - aiStart;

    // AI yanıtını parse et
    const parsed = parseAIResponse(aiResponse);

    // DB'ye kaydet
    if (!adSenseAnalysisTable) {
      return NextResponse.json(
        { success: false, error: "AdSenseAnalysis modeli bulunamadı" },
        { status: 500 },
      );
    }

    const analysis = await adSenseAnalysisTable.create({
      data: {
        metricsSnapshot: {
          summary: metrics.summary,
          last7Days: metrics.last7Days,
          last30DaySample: metrics.last30Days.slice(-7), // Son 7 gün sample
          topCountries: metrics.byCountry.slice(0, 5),
          topPages: metrics.byPage.slice(0, 10),
          adUnits: metrics.byAdUnit,
          fetchedAt: new Date().toISOString(),
          fetchDurationMs: metricsDuration,
        },
        analysis: parsed.analysis,
        recommendations: parsed.recommendations,
        warnings: parsed.warnings,
        status: "PENDING",
        aiModel: "qwen3-80b",
        aiDuration,
      },
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    const errorMessage = error?.message || "Bilinmeyen hata";
    console.error(
      "[AdSense AI Analysis] Full error:",
      JSON.stringify(
        {
          message: errorMessage,
          code: error?.code,
          status: error?.status,
          name: error?.name,
          stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
        },
        null,
        2,
      ),
    );

    let userMessage = "AdSense analizi yapılamadı.";

    if (
      errorMessage.includes("has not been used in project") ||
      errorMessage.includes("disabled") ||
      errorMessage.includes("is not enabled")
    ) {
      userMessage = "AdSense API, Google Cloud projenizde henüz aktif değil.";
    } else if (
      errorMessage.includes("Permission denied") ||
      errorMessage.includes("PERMISSION_DENIED") ||
      error?.code === 403
    ) {
      userMessage =
        "AdSense API erişim izni yok. Service account'u AdSense panelinde Viewer olarak ekleyin.";
    } else if (
      error?.code === 401 ||
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("Invalid JWT")
    ) {
      userMessage = "Service account kimlik doğrulaması başarısız.";
    } else if (
      errorMessage.includes("DECODER") ||
      errorMessage.includes("ERR_OSSL") ||
      errorMessage.includes("unsupported") ||
      errorMessage.includes("routines")
    ) {
      userMessage =
        "Private key formatı hatalı. ADSENSE_PRIVATE_KEY değerini kontrol edin.";
    } else if (
      errorMessage.includes("ADSENSE_ACCOUNT_ID") ||
      errorMessage.includes("yapılandırması eksik") ||
      errorMessage.includes("gerekli")
    ) {
      userMessage = errorMessage;
    }

    return NextResponse.json({
      success: false,
      error: userMessage,
      configured: isAdSenseConfigured(),
      apiError: true,
    });
  }
}

function buildAnalysisPrompt(
  metrics: Awaited<ReturnType<typeof getAdSenseMetricsForAnalysis>>,
): string {
  const s = metrics.summary;

  const last7Trend = metrics.last7Days
    .map(
      (d) =>
        `${d.date}: $${d.earnings.toFixed(2)} | Clicks:${d.clicks} | Imp:${d.impressions} | RPM:$${d.rpm.toFixed(2)}`,
    )
    .join("\n");

  const last30Trend = metrics.last30Days
    .map(
      (d) =>
        `${d.date}: $${d.earnings.toFixed(2)} | Clicks:${d.clicks} | Imp:${d.impressions}`,
    )
    .join("\n");

  const topCountries = metrics.byCountry
    .slice(0, 10)
    .map(
      (c) =>
        `${c.country}: $${c.earnings.toFixed(2)} | Clicks:${c.clicks} | Imp:${c.impressions}`,
    )
    .join("\n");

  const topPages = metrics.byPage
    .slice(0, 15)
    .map(
      (p) =>
        `${p.page}: $${p.earnings.toFixed(2)} | RPM:$${p.rpm.toFixed(2)} | Clicks:${p.clicks}`,
    )
    .join("\n");

  const adUnits = metrics.byAdUnit
    .map(
      (a) =>
        `${a.adUnit}: $${a.earnings.toFixed(2)} | Clicks:${a.clicks} | Imp:${a.impressions}`,
    )
    .join("\n");

  return `# AdSense Performans Analizi

## Özet Metrikler
- Bugün Kazanç: $${s.todayEarnings.toFixed(2)}
- Bu Ay Kazanç: $${s.monthEarnings.toFixed(2)}
- Toplam Kazanç: $${s.totalEarnings.toFixed(2)}
- Bugün CTR: ${s.todayCtr.toFixed(2)}%
- Bugün CPC: $${s.todayCpc.toFixed(3)}
- Bugün RPM: $${s.todayRpm.toFixed(2)}
- Bugün Page RPM: $${s.todayPageRpm.toFixed(2)}
- Bugün Tıklamalar: ${s.todayClicks}
- Bugün Gösterimler: ${s.todayImpressions}

## Son 7 Gün Trendi
${last7Trend}

## Son 30 Gün Trendi
${last30Trend}

## Ülke Bazlı Performans (Top 10)
${topCountries}

## Sayfa Bazlı Performans (Top 15)
${topPages}

## Reklam Birimi Performansı
${adUnits}

---

Lütfen bu verileri analiz ederek şu formatta JSON yanıt ver:
\`\`\`json
{
  "analysis": "Genel durum ve trend analizi (3-5 paragraf, Türkçe, detaylı)",
  "recommendations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "category": "REVENUE|CTR|RPM|TRAFFIC|CONTENT|AD_PLACEMENT",
      "title": "Kısa başlık",
      "description": "Detaylı açıklama ve uygulama adımları",
      "expectedImpact": "Beklenen etki"
    }
  ],
  "warnings": [
    {
      "severity": "CRITICAL|WARNING|INFO",
      "message": "Uyarı mesajı",
      "metric": "İlgili metrik"
    }
  ]
}
\`\`\`

Önemli:
- Düşük CTR, CPC veya RPM varsa net öneriler sun
- Ülke trafiğini analiz et — yüksek CTR ülkelere daha fazla içerik öner
- Sayfa bazlı performans farkları varsa neden olabileceğini açıkla
- Reklam birimi yerleşim optimizasyonu öner
- Trend analizi yap — iyiye mi kötüye mi gidiyor?
- En az 5, en fazla 10 öneri sun
- Minimum 2 uyarı belirle`;
}

function parseAIResponse(raw: string): {
  analysis: string;
  recommendations: any[];
  warnings: any[];
} {
  try {
    // JSON bloğunu bul
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr);

    return {
      analysis: parsed.analysis || raw,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch {
    return {
      analysis: raw,
      recommendations: [],
      warnings: [
        {
          severity: "WARNING",
          message: "AI yanıtı yapılandırılmış formatta parse edilemedi.",
          metric: "AI_RESPONSE",
        },
      ],
    };
  }
}
