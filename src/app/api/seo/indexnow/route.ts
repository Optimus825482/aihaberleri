/**
 * IndexNow API Route
 * Manuel veya otomatik IndexNow submission için
 */

import { NextRequest, NextResponse } from "next/server";
import {
  submitUrlToIndexNow,
  submitUrlsToIndexNow,
  submitAllArticlesToIndexNow,
} from "@/lib/seo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, urls } = body;

    // Action'a göre işlem yap
    switch (action) {
      case "submit-url": {
        if (!url) {
          return NextResponse.json(
            { success: false, error: "URL gerekli" },
            { status: 400 },
          );
        }
        const success = await submitUrlToIndexNow(url);
        return NextResponse.json({ success });
      }

      case "submit-urls": {
        if (!urls || !Array.isArray(urls)) {
          return NextResponse.json(
            { success: false, error: "URLs array gerekli" },
            { status: 400 },
          );
        }
        const success = await submitUrlsToIndexNow(urls);
        return NextResponse.json({ success });
      }

      case "submit-all": {
        const result = await submitAllArticlesToIndexNow();
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: "Geçersiz action" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("❌ IndexNow API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
