/**
 * IndexNow Key Verification Endpoint
 *
 * Bing/Yandex bots request /{key}.txt to verify site ownership.
 * This API route serves the key dynamically from DB, bypassing
 * Cloudflare cache and static file issues.
 *
 * Reached via next.config.js rewrite: /:key.txt → /api/indexnow-key?key=:key
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key || !/^[0-9a-f-]{32,36}$/i.test(key)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    // Verify the requested key matches our actual IndexNow key
    const setting = await db.setting.findUnique({
      where: { key: "indexnow_api_key" },
    });

    if (!setting || setting.value.toLowerCase() !== key.toLowerCase()) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(setting.value, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Robots-Tag": "noindex",
        "Access-Control-Allow-Origin": "*",
        // Tell Cloudflare to cache this 200 response
        "CDN-Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
