import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  isAdSenseConfigured,
  getAdSenseDetailedReport,
  getAdSenseDailyReport,
} from "@/lib/adsense-client";
import { getCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    if (!isAdSenseConfigured()) {
      return NextResponse.json({
        success: true,
        data: null,
        configured: false,
      });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 365);
    const type = searchParams.get("type") || "detailed"; // "detailed" | "daily"
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let customStartDate: Date | null = null;
    let customEndDate: Date | null = null;

    if (startDateParam && endDateParam) {
      const parsedStart = new Date(startDateParam);
      const parsedEnd = new Date(endDateParam);

      if (
        Number.isNaN(parsedStart.getTime()) ||
        Number.isNaN(parsedEnd.getTime())
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Geçersiz tarih formatı. startDate/endDate için YYYY-MM-DD kullanın.",
          },
          { status: 400 },
        );
      }

      parsedStart.setHours(0, 0, 0, 0);
      parsedEnd.setHours(0, 0, 0, 0);

      if (parsedStart > parsedEnd) {
        return NextResponse.json(
          {
            success: false,
            error: "startDate, endDate tarihinden büyük olamaz.",
          },
          { status: 400 },
        );
      }

      customStartDate = parsedStart;
      customEndDate = parsedEnd;
    }

    const cache = getCache();
    const rangeKey =
      customStartDate && customEndDate
        ? `${startDateParam}:${endDateParam}`
        : `${days}`;
    const cacheKey = `adsense:report:${type}:${rangeKey}`;
    const cached = await cache.get<any>(cacheKey, { tags: ["adsense"] });
    if (cached) {
      const res = NextResponse.json({ success: true, data: cached });
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    let data;
    if (type === "daily") {
      const endDate = customEndDate || new Date();
      const startDate = customStartDate || new Date();

      if (!customStartDate || !customEndDate) {
        startDate.setDate(startDate.getDate() - days);
      }

      data = await getAdSenseDailyReport(startDate, endDate);
    } else {
      if (customStartDate && customEndDate) {
        const dayDiff =
          Math.floor(
            (customEndDate.getTime() - customStartDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;
        data = await getAdSenseDetailedReport(dayDiff, customEndDate);
      } else {
        data = await getAdSenseDetailedReport(days);
      }
    }

    await cache.set(cacheKey, data, {
      ttl: 600, // 10 dakika
      tags: ["adsense"],
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const errorMessage = error?.message || "Bilinmeyen hata";
    console.error(
      "[AdSense Report API] Full error:",
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

    let userMessage = "AdSense raporu oluşturulamadı.";

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
    } else if (errorMessage.includes("ADSENSE_ACCOUNT_ID")) {
      userMessage = "ADSENSE_ACCOUNT_ID env variable tanımlı değil.";
    } else if (
      errorMessage.includes("yapılandırması eksik") ||
      errorMessage.includes("gerekli")
    ) {
      userMessage = errorMessage;
    } else if (
      errorMessage.includes("account") &&
      errorMessage.includes("not found")
    ) {
      userMessage =
        "AdSense hesap ID bulunamadı. ADSENSE_ACCOUNT_ID değerini kontrol edin.";
    }

    return NextResponse.json({
      success: true,
      data: null,
      configured: isAdSenseConfigured(),
      apiError: true,
      apiErrorMessage: userMessage,
    });
  }
}
