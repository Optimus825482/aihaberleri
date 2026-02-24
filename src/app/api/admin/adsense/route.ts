import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isAdSenseConfigured, getAdSenseEarnings } from "@/lib/adsense-client";
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

    // Cache: 5 dakika
    const cache = getCache();
    const cacheKey = "adsense:summary";
    const cached = await cache.get<any>(cacheKey, { tags: ["adsense"] });
    if (cached) {
      const res = NextResponse.json({
        success: true,
        data: cached,
        configured: true,
      });
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    const earnings = await getAdSenseEarnings();

    await cache.set(cacheKey, earnings, {
      ttl: 300, // 5 dakika
      tags: ["adsense"],
    });

    return NextResponse.json({
      success: true,
      data: earnings,
      configured: true,
    });
  } catch (error: any) {
    const errorMessage = error?.message || "Bilinmeyen hata";
    console.error(
      "[AdSense Summary API] Full error:",
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

    // Hata tipine göre kullanıcı dostu mesaj
    let userMessage = "AdSense verileri şu anda alınamıyor.";

    if (
      errorMessage.includes("has not been used in project") ||
      errorMessage.includes("disabled") ||
      errorMessage.includes("is not enabled")
    ) {
      userMessage =
        "AdSense API, Google Cloud projenizde henüz aktif değil. Google Cloud Console'dan 'AdSense Management API' arayıp enable edin.";
    } else if (
      errorMessage.includes("Permission denied") ||
      errorMessage.includes("PERMISSION_DENIED") ||
      error?.code === 403
    ) {
      userMessage =
        "AdSense API erişim izni yok. Service account'u AdSense panelinde Kullanıcılar > Viewer olarak ekleyin.";
    } else if (
      error?.code === 401 ||
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("Invalid JWT")
    ) {
      userMessage =
        "Service account kimlik doğrulaması başarısız. Private key ve email bilgilerini kontrol edin.";
    } else if (
      errorMessage.includes("DECODER") ||
      errorMessage.includes("ERR_OSSL") ||
      errorMessage.includes("unsupported") ||
      errorMessage.includes("routines")
    ) {
      userMessage =
        "Private key formatı hatalı. Coolify'da ADSENSE_PRIVATE_KEY değerini kontrol edin (PEM formatı bozulmuş olabilir).";
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
        "AdSense hesap ID bulunamadı. ADSENSE_ACCOUNT_ID değerini kontrol edin (pub-XXXXX formatı).";
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
