import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const category = searchParams.get("category");

    // Makaleleri ve SEO verilerini getir
    const articles = await prisma.article.findMany({
      where:
        category && category !== "all"
          ? {
              category: {
                slug: category,
              },
            }
          : undefined,
      select: {
        id: true,
        title: true,
        slug: true,
        seoScore: true,
        metaDescription: true,
        keywords: true, // Changed from metaKeywords to keywords
        publishedAt: true,
        views: true,
        category: {
          select: {
            name: true,
          },
        },
        seoRecommendations: {
          select: {
            type: true,
            severity: true,
            message: true,
            isResolved: true,
          },
        },
      },
      orderBy: {
        seoScore: "asc",
      },
    });

    const data = articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      category: article.category.name,
      seoScore: article.seoScore,
      metaDescription: article.metaDescription || "",
      keywords: article.keywords?.join(", ") || "", // Convert array to string
      views: article.views,
      publishedAt: article.publishedAt?.toISOString() || "",
      totalRecommendations: article.seoRecommendations.length,
      unresolvedRecommendations: article.seoRecommendations.filter(
        (r: any) => !r.isResolved,
      ).length,
      criticalIssues: article.seoRecommendations.filter(
        (r: any) => r.severity === "critical" && !r.isResolved,
      ).length,
      recommendations: article.seoRecommendations.map((r: any) => ({
        type: r.type,
        severity: r.severity,
        message: r.message,
        resolved: r.isResolved,
      })),
    }));

    if (format === "csv") {
      // CSV formatı
      const headers = [
        "ID",
        "Başlık",
        "Slug",
        "Kategori",
        "SEO Skoru",
        "Meta Açıklama",
        "Meta Anahtar Kelimeler",
        "Görüntülenme",
        "Yayın Tarihi",
        "Toplam Öneri",
        "Çözülmemiş Öneri",
        "Kritik Sorun",
      ];

      const rows = data.map((item: any) => [
        item.id,
        `"${item.title.replace(/"/g, '""')}"`,
        item.slug,
        item.category,
        item.seoScore,
        `"${item.metaDescription.replace(/"/g, '""')}"`,
        `"${item.keywords.replace(/"/g, '""')}"`,
        item.views,
        item.publishedAt,
        item.totalRecommendations,
        item.unresolvedRecommendations,
        item.criticalIssues,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row: any) => row.join(",")),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="seo-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      // JSON formatı
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="seo-report-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Export başarısız",
      },
      { status: 500 },
    );
  }
}
