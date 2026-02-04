import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEOAnalyzerAgent, SEOAnalysis } from "@/agents/seo/analyzer.agent";
import { ContentOptimizerAgent } from "@/agents/seo/content-optimizer.agent";
import { TechnicalSEOAgent } from "@/agents/seo/technical-seo.agent";

/**
 * POST /api/admin/articles/[id]/optimize
 * Multi-agent SEO optimization endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { agents = [], mode = "review" } = body;

    // Validate input
    if (!Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json(
        { error: "En az bir agent seçilmelidir" },
        { status: 400 },
      );
    }

    // Get article with related articles for internal linking
    const article = await db.article.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!article) {
      return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
    }

    // Get related articles for TechnicalSEOAgent
    const relatedArticles = await db.article.findMany({
      where: {
        id: { not: article.id },
        categoryId: article.categoryId,
        status: "PUBLISHED",
      },
      select: { id: true, title: true, slug: true },
      take: 5,
      orderBy: { publishedAt: "desc" },
    });

    // Initialize agents
    const analyzerAgent = new SEOAnalyzerAgent();
    const contentAgent = new ContentOptimizerAgent();
    const technicalAgent = new TechnicalSEOAgent();

    // Store results
    const agentResults: any[] = [];
    const diffs: any[] = [];
    const optimizations: any = {};

    // First, run analyzer if needed (required for content optimizer)
    let analysis: SEOAnalysis | null = null;
    if (agents.includes("analyzer") || agents.includes("content")) {
      analysis = await analyzerAgent.analyze({
        title: article.title,
        content: article.content || "",
        metaDescription: article.metaDescription || undefined,
        slug: article.slug,
        keywords: article.keywords || undefined,
        imageUrl: article.imageUrl || undefined,
      });

      if (agents.includes("analyzer")) {
        agentResults.push({
          type: "analyzer",
          result: analysis,
        });

        // Add analysis-based recommendations to diffs
        if (mode === "review" && analysis.issues.length > 0) {
          diffs.push({
            field: "seoAnalysis",
            label: "SEO Analizi",
            before: `Mevcut Skor: ${article.seoScore || 0}`,
            after: `Yeni Skor: ${analysis.score}`,
            type: "info",
            details: {
              score: analysis.score,
              issues: analysis.issues,
              opportunities: analysis.opportunities,
              summary: analysis.summary,
            },
          });
        }
      }
    }

    // Run content optimizer if requested
    if (agents.includes("content") && analysis) {
      const contentResult = await contentAgent.optimize(
        {
          title: article.title,
          content: article.content || "",
          metaDescription: article.metaDescription || undefined,
          keywords: article.keywords || undefined,
        },
        analysis,
      );

      agentResults.push({
        type: "content",
        result: contentResult,
      });

      // Extract optimizations from content result
      if (mode === "review") {
        if (contentResult.title?.optimized) {
          diffs.push({
            field: "title",
            label: "Başlık",
            before: article.title,
            after: contentResult.title.optimized,
            type: "text",
            improvements: contentResult.title.improvements,
          });
          optimizations.title = contentResult.title.optimized;
        }

        if (contentResult.metaDescription?.optimized) {
          diffs.push({
            field: "metaDescription",
            label: "Meta Açıklama",
            before: article.metaDescription || "",
            after: contentResult.metaDescription.optimized,
            type: "text",
            improvements: contentResult.metaDescription.improvements,
          });
          optimizations.metaDescription = contentResult.metaDescription.optimized;
        }

        if (contentResult.content?.optimizedContent) {
          diffs.push({
            field: "content",
            label: "İçerik",
            before: (article.content || "").substring(0, 200) + "...",
            after: contentResult.content.optimizedContent.substring(0, 200) + "...",
            type: "content",
            improvements: contentResult.content.improvements,
          });
          optimizations.content = contentResult.content.optimizedContent;
        }

        if (contentResult.keywords?.optimized) {
          diffs.push({
            field: "keywords",
            label: "Anahtar Kelimeler",
            before: (article.keywords || []).join(", "),
            after: contentResult.keywords.optimized.join(", "),
            type: "text",
          });
          optimizations.keywords = contentResult.keywords.optimized;
        }
      }
    }

    // Run technical SEO if requested
    if (agents.includes("technical")) {
      const technicalResult = await technicalAgent.optimize(
        {
          id: article.id,
          title: article.title,
          slug: article.slug,
          content: article.content,
          imageUrl: article.imageUrl,
          category: article.category,
        },
        relatedArticles,
      );

      agentResults.push({
        type: "technical",
        result: technicalResult,
      });

      // Extract technical optimizations
      if (mode === "review") {
        if (technicalResult.slug?.optimized && technicalResult.slug.optimized !== article.slug) {
          diffs.push({
            field: "slug",
            label: "URL Slug",
            before: article.slug,
            after: technicalResult.slug.optimized,
            type: "text",
            improvements: technicalResult.slug.improvements,
          });
          optimizations.slug = technicalResult.slug.optimized;
        }

        if (technicalResult.internalLinks && technicalResult.internalLinks.length > 0) {
          diffs.push({
            field: "internalLinks",
            label: "Dahili Linkler",
            before: "Mevcut link yok",
            after: technicalResult.internalLinks.map((l: any) => l.anchor).join(", "),
            type: "links",
            details: technicalResult.internalLinks,
          });
        }

        if (technicalResult.schema?.markup) {
          diffs.push({
            field: "schema",
            label: "Schema Markup",
            before: "Schema yok",
            after: "Article Schema eklendi",
            type: "schema",
            details: technicalResult.schema,
          });
        }
      }
    }

    // Auto mode - apply optimizations directly
    if (mode === "auto" && Object.keys(optimizations).length > 0) {
      await db.article.update({
        where: { id },
        data: optimizations,
      });

      // Recalculate SEO score
      const updatedArticle = await db.article.findUnique({ where: { id } });
      if (updatedArticle) {
        const newAnalysis = await analyzerAgent.analyze({
          title: updatedArticle.title,
          content: updatedArticle.content || "",
          metaDescription: updatedArticle.metaDescription || undefined,
          slug: updatedArticle.slug,
          keywords: updatedArticle.keywords || undefined,
        });

        await db.article.update({
          where: { id },
          data: { seoScore: newAnalysis.score },
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      diffs: mode === "review" ? diffs : [],
      optimizations: mode === "auto" ? optimizations : {},
      agentsRun: agents,
      results: agentResults.map(r => ({
        type: r.type,
        score: r.result.score || r.result.estimatedScore,
      })),
    });
  } catch (error) {
    console.error("SEO optimization error:", error);
    return NextResponse.json(
      { error: "Optimizasyon başarısız oldu", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
