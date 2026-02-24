import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const YOUTUBE_QUEUE_KEY = "youtube:publish-queue";
const YOUTUBE_QUEUE_STATUS_KEY = "youtube:publish-status";

export interface YouTubeQueueItem {
  topic: string;
  description: string;
  source: string;
  sourceUrl: string;
  keywords: string[];
  confidence: number;
  queuedAt: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

export interface YouTubeQueueStatus {
  isActive: boolean;
  intervalMinutes: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  currentItem: string | null;
  startedAt: string | null;
  nextPublishAt: string | null;
}

/**
 * POST /api/admin/youtube/queue-publish
 * Queue selected YouTube topics for scheduled publishing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const { topics, intervalMinutes = 15 } = body;

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir konu seçmelisiniz" },
        { status: 400 },
      );
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { success: false, error: "Redis bağlantısı yok" },
        { status: 500 },
      );
    }

    // Build queue items
    const queueItems: YouTubeQueueItem[] = topics.map((t: any) => ({
      topic: t.topic,
      description: t.description || "",
      source: t.source,
      sourceUrl: t.sourceUrl,
      keywords: t.keywords || [],
      confidence: t.confidence || 0,
      queuedAt: new Date().toISOString(),
      status: "pending" as const,
    }));

    // Store queue in Redis
    await redis.set(YOUTUBE_QUEUE_KEY, JSON.stringify(queueItems), "EX", 86400);

    // Set queue status
    const status: YouTubeQueueStatus = {
      isActive: true,
      intervalMinutes,
      totalItems: queueItems.length,
      completedItems: 0,
      failedItems: 0,
      currentItem: null,
      startedAt: new Date().toISOString(),
      nextPublishAt: new Date().toISOString(), // First one starts immediately
    };
    await redis.set(
      YOUTUBE_QUEUE_STATUS_KEY,
      JSON.stringify(status),
      "EX",
      86400,
    );

    console.log(
      `🎬 YouTube yayın kuyruğu oluşturuldu: ${queueItems.length} konu, ${intervalMinutes}dk aralık`,
    );

    return NextResponse.json({
      success: true,
      data: {
        queuedCount: queueItems.length,
        intervalMinutes,
        message: `${queueItems.length} konu ${intervalMinutes} dakika aralıkla yayınlanacak`,
      },
    });
  } catch (error) {
    console.error("YouTube queue error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/youtube/queue-publish
 * Get current queue status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { success: false, error: "Redis bağlantısı yok" },
        { status: 500 },
      );
    }

    const [queueData, statusData] = await Promise.all([
      redis.get(YOUTUBE_QUEUE_KEY),
      redis.get(YOUTUBE_QUEUE_STATUS_KEY),
    ]);

    const queue: YouTubeQueueItem[] = queueData ? JSON.parse(queueData) : [];
    const status: YouTubeQueueStatus | null = statusData
      ? JSON.parse(statusData)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        queue,
        status: status || {
          isActive: false,
          intervalMinutes: 15,
          totalItems: 0,
          completedItems: 0,
          failedItems: 0,
          currentItem: null,
          startedAt: null,
          nextPublishAt: null,
        },
      },
    });
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

/**
 * DELETE /api/admin/youtube/queue-publish
 * Cancel the current publishing queue
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { success: false, error: "Redis bağlantısı yok" },
        { status: 500 },
      );
    }

    await redis.del(YOUTUBE_QUEUE_KEY);
    await redis.del(YOUTUBE_QUEUE_STATUS_KEY);

    console.log("🎬 YouTube yayın kuyruğu iptal edildi");

    return NextResponse.json({
      success: true,
      message: "Kuyruk iptal edildi",
    });
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
