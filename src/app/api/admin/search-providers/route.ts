import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSharedGoogleNewsStats, getGoogleNewsStats } from "@/lib/google-news-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdminAuth();
  if (session instanceof Response) {
    return session;
  }

  const localGoogleNews = getGoogleNewsStats();
  const sharedGoogleNews = await getSharedGoogleNewsStats();
  const useSharedSnapshot =
    !!sharedGoogleNews &&
    ((sharedGoogleNews.requests ?? 0) > (localGoogleNews.requests ?? 0) ||
      (!!sharedGoogleNews.updatedAt &&
        (!localGoogleNews.updatedAt ||
          new Date(sharedGoogleNews.updatedAt).getTime() >=
            new Date(localGoogleNews.updatedAt).getTime())));
  const googleNews = useSharedSnapshot ? sharedGoogleNews : localGoogleNews;

  return NextResponse.json(
    {
      success: true,
      data: {
        googleNews,
        source: useSharedSnapshot ? "redis" : "memory",
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
