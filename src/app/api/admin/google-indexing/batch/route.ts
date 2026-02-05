import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleIds } = body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli article ID'leri gerekli",
        },
        { status: 400 },
      );
    }

    // Calculate tomorrow's date at 9:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    // Create batch job in database
    const batchJob = await prisma.googleIndexingBatch.create({
      data: {
        scheduledFor: tomorrow,
        status: "PENDING",
        totalArticles: articleIds.length,
        processedArticles: 0,
        failedArticles: 0,
      },
    });

    // Create batch items for each article
    const batchItems = await prisma.googleIndexingBatchItem.createMany({
      data: articleIds.map((articleId: string) => ({
        batchId: batchJob.id,
        articleId,
        status: "PENDING",
      })),
    });

    // Update articles to mark as scheduled
    await prisma.article.updateMany({
      where: {
        id: {
          in: articleIds,
        },
      },
      data: {
        googleIndexingScheduled: true,
        googleIndexingScheduledAt: tomorrow,
      },
    });

    return NextResponse.json({
      success: true,
      batchId: batchJob.id,
      scheduledFor: tomorrow.toISOString(),
      totalArticles: articleIds.length,
      message: `${articleIds.length} haber yarın saat 09:00 için planlandı`,
    });
  } catch (error) {
    console.error("Failed to create batch job:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Batch işlemi oluşturulurken bir hata oluştu",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get batch job status
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch ID gerekli",
        },
        { status: 400 },
      );
    }

    const batchJob = await prisma.googleIndexingBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          include: {
            article: {
              select: {
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!batchJob) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch job bulunamadı",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      batch: {
        id: batchJob.id,
        status: batchJob.status,
        scheduledFor: batchJob.scheduledFor.toISOString(),
        totalArticles: batchJob.totalArticles,
        processedArticles: batchJob.processedArticles,
        failedArticles: batchJob.failedArticles,
        startedAt: batchJob.startedAt?.toISOString() || null,
        completedAt: batchJob.completedAt?.toISOString() || null,
        items: batchJob.items.map((item) => ({
          id: item.id,
          articleId: item.articleId,
          articleTitle: item.article.title,
          articleSlug: item.article.slug,
          status: item.status,
          error: item.error,
          processedAt: item.processedAt?.toISOString() || null,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch batch status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Batch durumu alınırken bir hata oluştu",
      },
      { status: 500 },
    );
  }
}
