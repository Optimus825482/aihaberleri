import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSharedWhoogleStats, getWhoogleStats } from "@/lib/searxng";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdminAuth();
  if (session instanceof Response) {
    return session;
  }

  const localWhoogle = getWhoogleStats();
  const sharedWhoogle = await getSharedWhoogleStats();
  const useSharedSnapshot =
    !!sharedWhoogle &&
    ((sharedWhoogle.requests ?? 0) > (localWhoogle.requests ?? 0) ||
      (!!sharedWhoogle.updatedAt &&
        (!localWhoogle.updatedAt ||
          new Date(sharedWhoogle.updatedAt).getTime() >=
            new Date(localWhoogle.updatedAt).getTime())));
  const whoogle = useSharedSnapshot ? sharedWhoogle : localWhoogle;

  return NextResponse.json(
    {
      success: true,
      data: {
        whoogle,
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
