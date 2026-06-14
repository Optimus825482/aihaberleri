import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { z } from "zod";
import {
  getActiveLlmProvider,
  getAllProviders,
  upsertProvider,
  deleteProvider,
  invalidateLlmConfigCache,
} from "@/lib/llm-config";

export const dynamic = "force-dynamic";

// Validation schema
const ProviderSchema = z.object({
  name: z.string().min(1, "Provider adı zorunludur").max(100),
  baseUrl: z.string().min(1, "Base URL zorunludur").max(500),
  apiKey: z.string().min(1, "API Key zorunludur").max(2000),
  model: z.string().min(1, "Model adı zorunludur").max(200),
  isActive: z.boolean().default(false),
});

/**
 * GET /api/admin/llm-provider
 * Returns all providers and the active one.
 */
export async function GET() {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const providers = await getAllProviders();
    const active = await getActiveLlmProvider();

    return NextResponse.json({
      providers,
      active,
    });
  } catch (error) {
    console.error("❌ Failed to fetch LLM providers:", error);
    return NextResponse.json(
      { error: "Provider listesi alınamadı" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/llm-provider
 * Create or update a provider.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = ProviderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Geçersiz form verisi",
          details: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const provider = await upsertProvider(parsed.data);

    return NextResponse.json({
      success: true,
      provider,
    });
  } catch (error) {
    console.error("❌ Failed to save LLM provider:", error);
    return NextResponse.json(
      { error: "Provider kaydedilemedi" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/llm-provider
 * Delete a provider by id (send { id } in body).
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    await deleteProvider(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to delete LLM provider:", error);
    return NextResponse.json({ error: "Provider silinemedi" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/llm-provider/:action
 * Special actions: test-connection, set-inactive
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "test-connection") {
      // Fetch active provider and test
      const provider = await getActiveLlmProvider();
      if (!provider) {
        return NextResponse.json(
          { error: "Aktif provider bulunamadı" },
          { status: 404 },
        );
      }

      // Quick connectivity test
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              {
                role: "user",
                content: "Yanıtla: OK",
              },
            ],
            max_tokens: 10,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: "Bağlantı başarılı!",
          });
        }

        const errorText = await response.text().catch(() => "");
        return NextResponse.json(
          {
            error: `API hatası (${response.status}): ${errorText.substring(0, 200)}`,
          },
          { status: 502 },
        );
      } catch (fetchError) {
        return NextResponse.json(
          {
            error: `Bağlantı hatası: ${fetchError instanceof Error ? fetchError.message : "Timeout"}`,
          },
          { status: 502 },
        );
      }
    }

    if (action === "set-inactive") {
      const { id } = body;
      if (!id || typeof id !== "string") {
        return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
      }

      const { db } = await import("@/lib/db");
      await db.llmProvider.update({
        where: { id },
        data: { isActive: false },
      });
      invalidateLlmConfigCache();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  } catch (error) {
    console.error("❌ PATCH error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
