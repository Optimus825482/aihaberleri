/**
 * Agent Service - Orchestrates the autonomous news agent
 */

import { db } from "@/lib/db";
import { fetchAINews } from "./news.service";
import {
  selectBestArticles,
  processAndPublishArticles,
} from "./content.service";
import { emailService } from "@/lib/email";

export interface AgentExecutionResult {
  success: boolean;
  articlesCreated: number;
  articlesScraped: number;
  duration: number;
  errors: string[];
  publishedArticles: Array<{ id: string; slug: string }>;
}

/**
 * Execute the autonomous news agent workflow
 */
export async function executeNewsAgent(
  categorySlug?: string,
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let articlesScraped = 0;
  let articlesCreated = 0;
  const publishedArticles: Array<{ id: string; slug: string }> = [];

  // Create agent log
  const agentLog = await db.agentLog.create({
    data: {
      status: "RUNNING",
      articlesCreated: 0,
      articlesScraped: 0,
      errors: [],
      metadata: categorySlug ? { categorySlug } : undefined,
    },
  });

  console.log(
    `🤖 Agent çalıştırması başladı (Log ID: ${agentLog.id}${categorySlug ? `, Kategori: ${categorySlug}` : ""})`,
  );

  try {
    // Step 1: Search for AI news (RSS + Trend Analysis)
    console.log("📰 Adım 1: Yapay zeka haberleri aranıyor (RSS + Trend)...");
    const newsArticles = await fetchAINews(categorySlug);
    articlesScraped = newsArticles.length;
    console.log(`✅ ${articlesScraped} trend haber bulundu`);

    if (newsArticles.length === 0) {
      throw new Error("Haber bulunamadı");
    }

    // Step 2: Select best articles
    console.log("🎯 Adım 2: En iyi haberler seçiliyor...");
    const minArticles = parseInt(process.env.AGENT_MIN_ARTICLES_PER_RUN || "2");
    const maxArticles = parseInt(process.env.AGENT_MAX_ARTICLES_PER_RUN || "3");
    const targetCount =
      Math.floor(Math.random() * (maxArticles - minArticles + 1)) + minArticles;

    const selectedArticles = await selectBestArticles(
      newsArticles,
      targetCount,
    );
    console.log(`✅ ${selectedArticles.length} haber seçildi`);

    // Step 3: Process and publish articles
    console.log("⚙️  Adım 3: Haberler işleniyor ve yayınlanıyor...");
    const published = await processAndPublishArticles(
      selectedArticles,
      agentLog.id,
      categorySlug,
    );
    articlesCreated = published.length;
    publishedArticles.push(...published);
    console.log(`✅ ${articlesCreated} haber yayınlandı`);

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const status = articlesCreated > 0 ? "SUCCESS" : "PARTIAL";

    // Update last run time
    await db.setting.upsert({
      where: { key: "agent.lastRun" },
      update: { value: new Date().toISOString() },
      create: { key: "agent.lastRun", value: new Date().toISOString() },
    });

    // Calculate and set next run time
    const intervalSetting = await db.setting.findUnique({
      where: { key: "agent.intervalHours" },
    });
    const intervalHours = parseInt(intervalSetting?.value || "6");
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + intervalHours);

    await db.setting.upsert({
      where: { key: "agent.nextRun" },
      update: { value: nextRun.toISOString() },
      create: { key: "agent.nextRun", value: nextRun.toISOString() },
    });

    console.log(`⏰ Bir sonraki çalışma: ${nextRun.toLocaleString("tr-TR")}`);

    // Get email settings
    const emailSettings = await db.setting.findMany({
      where: { key: { in: ["agent.emailNotifications", "agent.adminEmail"] } },
    });
    const emailNotify =
      emailSettings.find((s) => s.key === "agent.emailNotifications")?.value !==
      "false";
    const adminEmail =
      emailSettings.find((s) => s.key === "agent.adminEmail")?.value ||
      "ikinciyenikitap54@gmail.com";

    // Send email report
    if (emailNotify) {
      try {
        const articlesWithTitles = await db.article.findMany({
          where: { id: { in: publishedArticles.map((a) => a.id) } },
          select: { title: true, slug: true },
        });

        await emailService.sendAgentReport(adminEmail, {
          status,
          articlesCreated,
          articlesScraped,
          duration,
          errors,
          publishedArticles: articlesWithTitles,
        });
      } catch (e) {
        console.error("Failed to send agent success email:", e);
      }
    }

    // Update agent log
    await db.agentLog.update({
      where: { id: agentLog.id },
      data: {
        status,
        articlesCreated,
        articlesScraped,
        duration,
        errors,
      },
    });

    console.log(`✅ Agent çalıştırması ${duration}s içinde tamamlandı`);

    return {
      success: true,
      articlesCreated,
      articlesScraped,
      duration,
      errors,
      publishedArticles,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen hata";
    errors.push(errorMessage);
    console.error("❌ Agent çalıştırması başarısız:", error);

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const status = articlesCreated > 0 ? "PARTIAL" : "FAILED";

    // CRITICAL: Always update agent log, even if other operations fail
    try {
      await db.agentLog.update({
        where: { id: agentLog.id },
        data: {
          status,
          articlesCreated,
          articlesScraped,
          duration,
          errors,
        },
      });
    } catch (logError) {
      console.error("❌ CRITICAL: Failed to update agent log:", logError);
    }

    // Get email settings
    try {
      const emailSettings = await db.setting.findMany({
        where: {
          key: { in: ["agent.emailNotifications", "agent.adminEmail"] },
        },
      });
      const emailNotify =
        emailSettings.find((s) => s.key === "agent.emailNotifications")
          ?.value !== "false";
      const adminEmail =
        emailSettings.find((s) => s.key === "agent.adminEmail")?.value ||
        "ikinciyenikitap54@gmail.com";

      // Send email report
      if (emailNotify) {
        try {
          const articlesWithTitles = await db.article.findMany({
            where: { id: { in: publishedArticles.map((a) => a.id) } },
            select: { title: true, slug: true },
          });

          await emailService.sendAgentReport(adminEmail, {
            status,
            articlesCreated,
            articlesScraped,
            duration,
            errors,
            publishedArticles: articlesWithTitles,
          });
        } catch (e) {
          console.error("Failed to send agent failure email:", e);
        }
      }
    } catch (emailError) {
      console.error("❌ Failed to send error notification:", emailError);
    }

    return {
      success: false,
      articlesCreated,
      articlesScraped,
      duration,
      errors,
      publishedArticles,
    };
  }
}

/**
 * Get agent execution history
 */
export async function getAgentHistory(limit: number = 10) {
  return db.agentLog.findMany({
    take: limit,
    orderBy: { executionTime: "desc" },
    include: {
      articles: {
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
        },
      },
    },
  });
}

/**
 * Get agent statistics
 */
export async function getAgentStats() {
  const [
    totalExecutions,
    successfulExecutions,
    totalArticles,
    lastExecution,
    enabledSetting,
    nextRunSetting,
  ] = await Promise.all([
    db.agentLog.count(),
    db.agentLog.count({ where: { status: "SUCCESS" } }),
    db.article.count({ where: { agentLogId: { not: null } } }),
    db.agentLog.findFirst({
      orderBy: { executionTime: "desc" },
    }),
    db.setting.findUnique({ where: { key: "agent.enabled" } }),
    db.setting.findUnique({ where: { key: "agent.nextRun" } }),
  ]);

  const successRate =
    totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 100)
      : 0;

  return {
    totalExecutions,
    successfulExecutions,
    totalArticles,
    successRate,
    lastExecution: lastExecution?.executionTime || null,
    lastStatus: lastExecution?.status || null,
    enabled: enabledSetting?.value !== "false",
    nextRun: nextRunSetting?.value || null,
  };
}

export async function getCategoryStats() {
  const stats = await db.article.groupBy({
    by: ["categoryId"],
    _count: {
      id: true,
    },
    where: {
      status: "PUBLISHED",
    },
  });

  const categories = await db.category.findMany({
    where: {
      id: {
        in: stats.map((s) => s.categoryId),
      },
    },
  });

  return stats
    .map((stat) => {
      const category = categories.find((c) => c.id === stat.categoryId);
      return {
        name: category?.name || "Bilinmiyor",
        count: stat._count.id,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export default {
  executeNewsAgent,
  getAgentHistory,
  getAgentStats,
};
