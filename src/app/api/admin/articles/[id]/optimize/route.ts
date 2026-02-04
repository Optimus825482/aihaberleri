import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEOAnalyzerAgent } from "@/agents/seo/analyzer.agent";
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

    // Get article
    const article = await db.article.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!article) {
      return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
    }

    // Initialize agents
    const agentInstances: Record<string, any> = {
      analyzer: new SEOAnalyzerAgent(),
      content: new ContentOptimizerAgent(),
      technical: new TechnicalSEOAgent(),
    };

    // Run selected agents in parallel
    const results = await Promise.all(
      agents.map(async (agentType: string) => {
        const agent = agentInstances[agentType];
        if (!agent) {
          throw new Error(`Geçersiz agent: ${agentType}`);
        }

        // Each agent has different method signatures
        let result;
        if (agentType === "analyzer") {
          // SEOAnalyzerAgent.analyze expects: { title, content, excerpt, metaTitle, metaDescription, keywords, slug }
          result = await agent.analyze({
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            metaTitle: article.metaTitle,
            metaDescription: article.metaDescription,
            keywords: article.keywords,
            slug: article.slug,
          });
        } else if (agentType === "content") {
          // ContentOptimizerAgent.optimize expects: { title, content, excerpt, metaTitle, metaDescription, keywords, slug }
          result = await agent.optimize({
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            metaTitle: article.metaTitle,
            metaDescription: article.metaDescription,
            keywords: article.keywords,
            slug: article.slug,
          });
        } else if (agentType === "technical") {
          // TechnicalSEOAgent.optimize expects: { id, title, slug, content, imageUrl, category }
          result = await agent.optimize({
            id: article.id,
            title: article.title,
            slug: article.slug,
            content: article.content,
            imageUrl: article.imageUrl,
            category: article.category,
          });
        } else {
          throw new Error(`Geçersiz agent: ${agentType}`);
        }

        return {
          type: agentType,
          result,
        };
      }),
    );

    // Merge results and generate diffs
    const diffs: any[] = [];
    const optimizations: any = {};

    for (const { type, result } of results) {
      if (result.optimizations) {
        Object.assign(optimizations, result.optimizations);
      }

      // Generate diffs for review mode
      if (mode === "review") {
        if (
          result.optimizations?.metaTitle &&
          result.optimizations.metaTitle !== article.metaTitle
        ) {
          diffs.push({
            field: "metaTitle",
            label: "Meta Başlık",
            before: article.metaTitle || "",
            after: result.optimizations.metaTitle,
            type: "text",
          });
        }

        if (
          result.optimizations?.metaDescription &&
          result.optimizations.metaDescription !== article.metaDescription
        ) {
          diffs.push({
            field: "metaDescription",
            label: "Meta Açıklama",
            before: article.metaDescription || "",
            after: result.optimizations.metaDescription,
            type: "text",
          });
        }

        if (
          result.optimizations?.keywords &&
          JSON.stringify(result.optimizations.keywords) !==
            JSON.stringify(article.keywords)
        ) {
          diffs.push({
            field: "keywords",
            label: "Anahtar Kelimeler",
            before: article.keywords?.join(", ") || "",
            after: result.optimizations.keywords.join(", "),
            type: "text",
          });
        }

        if (
          result.optimizations?.title &&
          result.optimizations.title !== article.title
        ) {
          diffs.push({
            field: "title",
            label: "Başlık",
            before: article.title,
            after: result.optimizations.title,
            type: "text",
          });
        }

        if (
          result.optimizations?.excerpt &&
          result.optimizations.excerpt !== article.excerpt
        ) {
          diffs.push({
            field: "excerpt",
            label: "Özet",
            before: article.excerpt,
            after: result.optimizations.excerpt,
            type: "text",
          });
        }
      }
    }

    // Auto mode - apply directly
    if (mode === "auto" && Object.keys(optimizations).length > 0) {
      await db.article.update({
        where: { id },
        data: optimizations,
      });

      // Recalculate SEO score
      const analyzer = new SEOAnalyzerAgent();
      const updatedArticle = await db.article.findUnique({ where: { id } });
      if (updatedArticle) {
        const analysis = await analyzer.analyze({
          title: updatedArticle.title,
          content: updatedArticle.content,
          excerpt: updatedArticle.excerpt,
          metaTitle: updatedArticle.metaTitle,
          metaDescription: updatedArticle.metaDescription,
          keywords: updatedArticle.keywords,
          slug: updatedArticle.slug,
        });

        await db.article.update({
          where: { id },
          data: { seoScore: analysis.score },
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      diffs: mode === "review" ? diffs : [],
      optimizations: mode === "auto" ? optimizations : {},
      agentsRun: agents,
    });
  } catch (error) {
    console.error("SEO optimization error:", error);
    return NextResponse.json(
      { error: "Optimizasyon başarısız oldu" },
      { status: 500 },
    );
  }
}
