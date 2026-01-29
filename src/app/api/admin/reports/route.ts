import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import * as XLSX from "xlsx";

/**
 * GET /api/admin/reports
 * Generate and download analytics reports
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    if (!hasPermission(session.user.role, Permission.VIEW_ANALYTICS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "summary";
    const format = searchParams.get("format") || "excel";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Build date filter
    const dateFilter: any = {};
    if (from) {
      dateFilter.gte = new Date(from);
    }
    if (to) {
      dateFilter.lte = new Date(to);
    }

    let reportData: any = {};

    // Generate report based on type
    switch (type) {
      case "summary":
        reportData = await generateSummaryReport(dateFilter);
        break;
      case "detailed":
        reportData = await generateDetailedReport(dateFilter);
        break;
      case "articles":
        reportData = await generateArticlesReport(dateFilter);
        break;
      case "categories":
        reportData = await generateCategoriesReport(dateFilter);
        break;
      case "traffic":
        reportData = await generateTrafficReport(dateFilter);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 },
        );
    }

    // Export based on format
    if (format === "excel") {
      const buffer = generateExcelReport(reportData, type);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=report_${type}_${Date.now()}.xlsx`,
        },
      });
    } else if (format === "pdf") {
      // PDF generation would go here (requires additional setup)
      return NextResponse.json(
        { error: "PDF export not implemented yet" },
        { status: 501 },
      );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("[REPORTS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Report generators
async function generateSummaryReport(dateFilter: any) {
  const [articles, totalViews, categories] = await Promise.all([
    prisma.article.count({
      where: { createdAt: dateFilter },
    }),
    prisma.article.aggregate({
      where: { createdAt: dateFilter },
      _sum: { views: true },
    }),
    prisma.category.count(),
  ]);

  return {
    summary: {
      totalArticles: articles,
      totalViews: totalViews._sum.views || 0,
      totalCategories: categories,
      reportDate: new Date().toISOString(),
    },
  };
}

async function generateDetailedReport(dateFilter: any) {
  const articles = await prisma.article.findMany({
    where: { createdAt: dateFilter },
    include: { category: true },
    orderBy: { views: "desc" },
    take: 100,
  });

  return { articles };
}

async function generateArticlesReport(dateFilter: any) {
  const articles = await prisma.article.findMany({
    where: { publishedAt: dateFilter },
    select: {
      title: true,
      views: true,
      score: true,
      status: true,
      publishedAt: true,
      category: { select: { name: true } },
    },
    orderBy: { views: "desc" },
  });

  return { articles };
}

async function generateCategoriesReport(dateFilter: any) {
  const categories = await prisma.category.findMany({
    include: {
      articles: {
        where: { createdAt: dateFilter },
        select: { views: true },
      },
    },
  });

  return {
    categories: categories.map((cat) => ({
      name: cat.name,
      articleCount: cat.articles.length,
      totalViews: cat.articles.reduce((sum, a) => sum + a.views, 0),
    })),
  };
}

async function generateTrafficReport(dateFilter: any) {
  const visitors = await prisma.visitor.count({
    where: { createdAt: dateFilter },
  });

  const countries = await prisma.visitor.groupBy({
    by: ["country"],
    where: { createdAt: dateFilter },
    _count: true,
  });

  return {
    totalVisitors: visitors,
    topCountries: countries.sort((a, b) => b._count - a._count).slice(0, 10),
  };
}

// Excel generation helper
function generateExcelReport(data: any, type: string): Buffer {
  const workbook = XLSX.utils.book_new();

  if (type === "summary") {
    const sheet = XLSX.utils.json_to_sheet([data.summary]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Özet");
  } else if (type === "articles") {
    const sheet = XLSX.utils.json_to_sheet(data.articles);
    XLSX.utils.book_append_sheet(workbook, sheet, "Makaleler");
  } else if (type === "categories") {
    const sheet = XLSX.utils.json_to_sheet(data.categories);
    XLSX.utils.book_append_sheet(workbook, sheet, "Kategoriler");
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
