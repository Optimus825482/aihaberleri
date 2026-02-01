import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch newsletter preview for today's articles
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get today's start and end in Turkey timezone
    const now = new Date();
    const turkeyOffset = 3 * 60 * 60 * 1000; // UTC+3
    const turkeyNow = new Date(now.getTime() + turkeyOffset);
    
    // Start of today in Turkey
    const todayStart = new Date(turkeyNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartUTC = new Date(todayStart.getTime() - turkeyOffset);
    
    // End of today in Turkey
    const todayEnd = new Date(turkeyNow);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndUTC = new Date(todayEnd.getTime() - turkeyOffset);

    // Fetch today's published articles
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: todayStartUTC,
          lte: todayEndUTC,
        },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 10, // Limit to 10 articles for newsletter
    });

    // Get subscriber count
    const subscriberCount = await prisma.subscriber.count({
      where: {
        status: "active",
      },
    });

    // Generate subject line
    const dateStr = turkeyNow.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    
    const subject = articles.length > 0
      ? `🤖 AI Haberleri - ${dateStr} | ${articles.length} Yeni Haber`
      : `🤖 AI Haberleri - ${dateStr}`;

    // Format articles for preview
    const formattedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt || "",
      category: article.category.name,
      publishedAt: article.publishedAt?.toISOString() || "",
      imageUrl: article.imageUrl,
    }));

    return NextResponse.json({
      success: true,
      data: {
        subject,
        articleCount: articles.length,
        articles: formattedArticles,
        subscriberCount,
        scheduledTime: "19:00",
      },
    });
  } catch (error) {
    console.error("Newsletter preview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch newsletter preview" },
      { status: 500 }
    );
  }
}
