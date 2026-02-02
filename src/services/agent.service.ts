/**
 * Agent Service - Orchestrates the autonomous news agent
 *
 * 🤖 AI AGENT MONITORING
 * This service is monitored by @backend-specialist via the background worker
 * See: WORKER-AGENT-ASSIGNMENT.md for monitoring details
 */

import { db } from "@/lib/db";
import { fetchAINews } from "./news.service";
import { agentLogger } from "@/lib/logger";
import { trackAgentExecution } from "@/lib/sentry";
import {
  selectBestArticles,
  processAndPublishArticles,
} from "./content.service";
import { emailService } from "@/lib/email";
import { getRedis } from "@/lib/redis";
import { emitToAdmin, SocketEvents } from "@/lib/socket";
import { pingSitemaps } from "@/lib/seo";
import { createModuleLogger } from "@/lib/agent-log-stream";

// Create module-specific loggers for live streaming
const liveLog = {
  agent: createModuleLogger("agent"),
  rss: createModuleLogger("rss"),
  content: createModuleLogger("content"),
  deepseek: createModuleLogger("deepseek"),
  image: createModuleLogger("image"),
  publish: createModuleLogger("publish"),
};

export interface AgentExecutionResult {
  success: boolean;
  articlesCreated: number;
  articlesScraped: number;
  duration: number;
  errors: string[];
  publishedArticles: Array<{ id: string; slug: string }>;
}

// Helper to update job progress in Redis
async function updateJobProgress(
  agentLogId: string,
  step: string,
  message: string,
  progress: number,
) {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(
        `job:${agentLogId}:progress`,
        JSON.stringify({
          step,
          message,
          progress,
          timestamp: new Date().toISOString(),
        }),
        "EX",
        3600, // Expire after 1 hour
      );
    }
  } catch (error) {
    // Non-critical, just log
    agentLogger.error(agentLogId, error as Error, {
      context: "update_job_progress",
    });
  }
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

  agentLogger.start(agentLog.id, categorySlug);

  // Live log: Agent started
  await liveLog.agent.info(
    `🚀 Agent başlatıldı (ID: ${agentLog.id.substring(0, 8)}...)`,
    {
      categorySlug: categorySlug || "all",
    },
  );

  // Emit agent started event
  emitToAdmin(SocketEvents.AGENT_STARTED, {
    timestamp: new Date().toISOString(),
    logId: agentLog.id,
    categorySlug: categorySlug || null,
  });

  console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃           🤖 AGENT EXECUTION START                ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Log ID:       ${agentLog.id.substring(0, 12)}...                    ┃
┃  Start Time:   ${new Date().toLocaleString("tr-TR").padEnd(25)}┃
┃  Category:     ${(categorySlug || "All").padEnd(28)}┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);

  try {
    // Step 1: Search for AI news (RSS + Trend Analysis)
    agentLogger.step(
      agentLog.id,
      "fetch_news",
      "Yapay zeka haberleri aranıyor (RSS + Trend)",
      20,
    );
    console.log("📰 Adım 1: Yapay zeka haberleri aranıyor (RSS + Trend)...");
    await updateJobProgress(
      agentLog.id,
      "fetching",
      "Yapay zeka haberleri toplanıyor...",
      20,
    );

    // Emit progress
    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "fetching",
      message: "Yapay zeka haberleri toplanıyor (RSS + Trend)...",
      progress: 20,
    });

    const newsArticles = await fetchAINews(categorySlug);
    articlesScraped = newsArticles.length;
    console.log(`✅ ${articlesScraped} trend haber bulundu`);

    // Live log: Articles fetched
    await liveLog.rss.success(
      `📰 ${articlesScraped} haber bulundu (RSS + Trend)`,
    );

    if (newsArticles.length === 0) {
      throw new Error("Haber bulunamadı");
    }

    // Step 2: Smart Filtering Pipeline (NEW!)
    agentLogger.step(
      agentLog.id,
      "smart_filtering",
      "Akıllı filtreleme ve topic extraction",
      40,
    );
    console.log("🎯 Adım 2: Akıllı filtreleme başlatılıyor...");
    await updateJobProgress(
      agentLog.id,
      "filtering",
      "Akıllı filtreleme ve topic extraction...",
      40,
    );

    // Emit progress
    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "filtering",
      message: "Akıllı filtreleme ve topic extraction...",
      progress: 40,
    });

    // Get article count from database settings (priority) or env vars (fallback)
    const minSetting = await db.setting.findUnique({
      where: { key: "agent.minArticles" },
    });
    const maxSetting = await db.setting.findUnique({
      where: { key: "agent.maxArticles" },
    });

    const minArticles = minSetting
      ? parseInt(minSetting.value)
      : parseInt(process.env.AGENT_MIN_ARTICLES_PER_RUN || "3");
    const maxArticles = maxSetting
      ? parseInt(maxSetting.value)
      : parseInt(process.env.AGENT_MAX_ARTICLES_PER_RUN || "5");

    console.log(
      `📊 Haber sayısı ayarları: min=${minArticles}, max=${maxArticles}`,
    );

    const targetCount =
      Math.floor(Math.random() * (maxArticles - minArticles + 1)) + minArticles;

    console.log(`🎯 Hedef haber sayısı: ${targetCount}`);

    // Live log: Smart filtering
    await liveLog.deepseek.info(
      `🚀 Akıllı filtreleme: ${newsArticles.length} haber → ${targetCount} unique topic`,
    );

    // NEW: Run smart filtering pipeline
    const { runSmartFiltering } = await import("./smart-filtering.service");
    const filteringResult = await runSmartFiltering(newsArticles, {
      batchSize: 10,
      topPerBatch: 5,
      targetCount: targetCount,
      timeWindowDays: 2, // 7 günden 2 güne düşürüldü (daha güncel haberler için)
    });

    const selectedArticles = filteringResult.stage3_unique;
    console.log(`✅ ${selectedArticles.length} unique topic haberi seçildi`);
    console.log(
      `   Duplicate rate: ${(filteringResult.stats.duplicate_rate * 100).toFixed(1)}%`,
    );

    // Live log: Articles selected
    await liveLog.deepseek.success(
      `✅ ${selectedArticles.length} unique topic seçildi (duplicate rate: ${(filteringResult.stats.duplicate_rate * 100).toFixed(1)}%)`,
    );

    // Step 3: Process and publish articles (includes deep research, rewriting, translation)
    agentLogger.step(
      agentLog.id,
      "process_articles",
      "Haberler yeniden yazılıyor ve görseller oluşturuluyor",
      60,
    );
    console.log("⚙️  Adım 3: Haberler işleniyor ve yayınlanıyor...");
    await updateJobProgress(
      agentLog.id,
      "processing",
      "Haberler yeniden yazılıyor ve görseller oluşturuluyor...",
      60,
    );

    // Emit progress
    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "processing",
      message: "Haberler yeniden yazılıyor ve görseller oluşturuluyor...",
      progress: 60,
    });

    // Transform ArticleWithTopic[] to the format expected by processAndPublishArticles
    let articlesForProcessing = selectedArticles.map((articleWithTopic) => ({
      article: articleWithTopic as any, // Cast to NewsArticle (compatible structure)
      category: "Teknoloji", // Default category (will be overridden by DeepSeek if needed)
      topic: articleWithTopic.topic, // Pass topic through for saving
    }));

    // 🔄 RETRY MECHANISM: Try up to 3 times with duplicate exclusion
    let published: Array<{ id: string; slug: string }> = [];
    let attempt = 1;
    const maxAttempts = 3;
    const excludedUrls = new Set<string>();
    const excludedTopics = new Set<string>();

    while (attempt <= maxAttempts && published.length < targetCount) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(
        `🔄 ATTEMPT ${attempt}/${maxAttempts}: Processing articles...`,
      );
      console.log(`${"=".repeat(60)}`);
      console.log(`   Articles to process: ${articlesForProcessing.length}`);
      console.log(`   Already published: ${published.length}/${targetCount}`);
      console.log(`   Excluded URLs: ${excludedUrls.size}`);
      console.log(`   Excluded topics: ${excludedTopics.size}`);

      const newlyPublished = await processAndPublishArticles(
        articlesForProcessing,
        agentLog.id,
        categorySlug,
      );

      // Add newly published to total
      published.push(...newlyPublished);

      if (published.length >= targetCount) {
        console.log(
          `✅ SUCCESS: ${published.length}/${targetCount} haber yayınlandı`,
        );
        break;
      }

      if (published.length > 0) {
        console.log(
          `✅ SUCCESS on attempt ${attempt}: ${published.length} haber yayınlandı`,
        );
        break;
      }

      // If no articles published and we have more attempts
      if (attempt < maxAttempts) {
        console.log(
          `\n⚠️  Attempt ${attempt} failed: ${published.length} articles published`,
        );
        console.log(
          `   ${articlesForProcessing.length - published.length} were duplicates`,
        );
        console.log(`🔄 Preparing retry ${attempt + 1}/${maxAttempts}...`);

        // Collect URLs and topics that were already processed (both published and duplicates)
        articlesForProcessing.forEach((item) => {
          if (item.article.url) {
            excludedUrls.add(item.article.url);
          }
          if (item.topic) {
            excludedTopics.add(item.topic);
          }
        });

        // Get remaining articles from Stage 2 (with topics) that haven't been tried yet
        const remainingArticles = filteringResult.stage2_with_topics.filter(
          (article) =>
            !excludedUrls.has(article.url || "") &&
            !excludedTopics.has(article.topic || ""),
        );

        console.log(`\n📊 Retry ${attempt + 1} statistics:`);
        console.log(
          `   Original pool: ${filteringResult.stage2_with_topics.length} articles`,
        );
        console.log(
          `   Already processed: ${excludedUrls.size} URLs, ${excludedTopics.size} topics`,
        );
        console.log(
          `   Remaining untried: ${remainingArticles.length} articles`,
        );

        if (remainingArticles.length === 0) {
          console.log(`❌ No remaining articles to retry. Giving up.`);
          break;
        }

        // Sort by score and take top N (excluding already processed ones)
        const retryCount = Math.min(targetCount, remainingArticles.length);
        const retryArticles = remainingArticles
          .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0))
          .slice(0, retryCount);

        console.log(
          `   Selected for retry: ${retryArticles.length} NEW articles`,
        );
        console.log(
          `   Top retry article: "${retryArticles[0]?.title?.substring(0, 50)}..."`,
        );

        // Transform for processing
        articlesForProcessing = retryArticles.map((articleWithTopic) => ({
          article: articleWithTopic as any,
          category: "Teknoloji",
          topic: articleWithTopic.topic,
        }));

        attempt++;
      } else {
        console.log(
          `\n❌ All ${maxAttempts} attempts failed. ${published.length} articles published total.`,
        );
        break;
      }
    }

    articlesCreated = published.length;
    publishedArticles.push(...published);
    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `✅ FINAL RESULT: ${articlesCreated} haber yayınlandı (${attempt} attempt)`,
    );
    console.log(`${"=".repeat(60)}\n`);

    // Live log: Articles created
    await liveLog.publish.success(`✅ ${articlesCreated} haber yayında!`);

    // Ping search engines to update sitemaps (non-blocking)
    // Uses multiple methods: IndexNow, WebSub, legacy ping
    if (articlesCreated > 0) {
      pingSitemaps()
        .then((results) => {
          const successCount = [
            results.google,
            results.bing,
            results.indexNow,
            results.webSub,
          ].filter(Boolean).length;
          console.log(`🔔 Sitemap ping: ${successCount}/4 yöntem başarılı`);
          if (results.indexNow)
            console.log("   ✅ IndexNow: Bing/Yandex bildirildi");
          if (results.webSub) console.log("   ✅ WebSub: Google bildirildi");
        })
        .catch((err) => {
          console.warn("⚠️ Sitemap ping hatası:", err.message);
        });
    }

    // Emit article published events
    for (const article of published) {
      emitToAdmin(SocketEvents.ARTICLE_PUBLISHED, {
        id: article.id,
        slug: article.slug,
        timestamp: new Date().toISOString(),
      });
    }

    await updateJobProgress(
      agentLog.id,
      "publishing",
      "Haberler veritabanına kaydediliyor...",
      80,
    );

    // Emit progress
    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "publishing",
      message: "Haberler veritabanına kaydediliyor...",
      progress: 80,
    });

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
    const intervalHours = parseFloat(intervalSetting?.value || "6");
    const nextRun = new Date();
    // Decimal hours support (0.25 = 15min, 0.5 = 30min)
    nextRun.setTime(
      nextRun.getTime() + Math.round(intervalHours * 60 * 60 * 1000),
    );

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

    await updateJobProgress(
      agentLog.id,
      "completed",
      "Tamamlandı! Haberler yayında.",
      100,
    );

    // Emit completion event
    emitToAdmin(SocketEvents.AGENT_COMPLETED, {
      articlesCreated,
      articlesScraped,
      duration,
      timestamp: new Date().toISOString(),
      logId: agentLog.id,
    });

    agentLogger.complete(agentLog.id, {
      success: true,
      articlesCreated,
      articlesScraped,
      duration,
      errors,
    });

    // Track in Sentry for monitoring
    trackAgentExecution(agentLog.id, {
      success: true,
      articlesCreated,
      duration,
      errors,
    });

    console.log(`✅ Agent çalıştırması ${duration}s içinde tamamlandı`);

    console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃           ✅ AGENT EXECUTION SUCCESS              ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Status:         ${status.padEnd(31)}┃
┃  Duration:       ${duration}s${" ".repeat(31 - String(duration).length)}┃
┃  Articles Found: ${articlesScraped}${" ".repeat(31 - String(articlesScraped).length)}┃
┃  Articles Made:  ${articlesCreated}${" ".repeat(31 - String(articlesCreated).length)}┃
┃  Next Run:       ${nextRun.toLocaleString("tr-TR").padEnd(25)}┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);

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

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Emit failure event
    emitToAdmin(SocketEvents.AGENT_FAILED, {
      error: errorMessage,
      logId: agentLog.id,
      timestamp: new Date().toISOString(),
      articlesCreated,
      duration,
    });

    agentLogger.error(agentLog.id, error as Error, {
      articlesCreated,
      articlesScraped,
      duration,
    });

    // Track in Sentry
    trackAgentExecution(agentLog.id, {
      success: false,
      articlesCreated,
      duration,
      errors,
    });

    console.error("❌ Agent çalıştırması başarısız:", error);

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
      agentLogger.error(agentLog.id, logError as Error, {
        context: "critical_log_update_failed",
      });
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
