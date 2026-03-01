/**
 * Agent Service - Orchestrates the autonomous news agent
 *
 * 🤖 AI AGENT MONITORING
 * This service is monitored by @backend-specialist via the background worker
 * See: WORKER-AGENT-ASSIGNMENT.md for monitoring details
 */

import { db } from "@/lib/db";
import { AgentStatus } from "@prisma/client";
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
import { createModuleLogger, logPipelineBanner } from "@/lib/agent-log-stream";
import { PipelineTracer } from "@/lib/pipeline-tracer";

// Module loggers
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

      // Also add to log stream for live viewing
      await redis.rpush(
        `job:${agentLogId}:logs`,
        `[${step.toUpperCase()}] ${message}`,
      );
      // Keep only last 100 logs
      await redis.ltrim(`job:${agentLogId}:logs`, -100, -1);
      // Set expiry on logs
      await redis.expire(`job:${agentLogId}:logs`, 3600);
    }
  } catch (error) {
    // Non-critical, just log
    agentLogger.error(agentLogId, error as Error, {
      context: "update_job_progress",
    });
  }
}

// Helper to add log message to Redis stream
async function addLogMessage(agentLogId: string, message: string) {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.rpush(`job:${agentLogId}:logs`, message);
      await redis.ltrim(`job:${agentLogId}:logs`, -100, -1);
      await redis.expire(`job:${agentLogId}:logs`, 3600);
    }
  } catch (error) {
    // Non-critical, ignore
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

  // Initialize pipeline tracer
  const tracer = new PipelineTracer("news-pipeline");
  await tracer.startTrace(agentLog.id, { categorySlug });

  // Live log: Agent started
  await liveLog.agent.info(
    `Agent başlatıldı (${agentLog.id.substring(0, 8)}…)`,
  );
  agentLogger.start(agentLog.id, categorySlug);

  emitToAdmin(SocketEvents.AGENT_STARTED, {
    timestamp: new Date().toISOString(),
    logId: agentLog.id,
    categorySlug: categorySlug || null,
  });

  await addLogMessage(agentLog.id, `Agent başlatıldı`);

  try {
    // Step 1: Collect news (RSS + YouTube)
    agentLogger.step(agentLog.id, "fetch_news", "Haberler toplanıyor", 20);
    await liveLog.rss.info("RSS + YouTube taranıyor…");

    const rssSpan = tracer.span("rss-fetch");
    await rssSpan.start();

    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "fetching",
      message: "Haberler toplanıyor (RSS + YouTube)…",
      progress: 20,
    });

    const newsArticles = await fetchAINews(categorySlug);

    // YouTube topics — skip when ALL RSS feeds are unchanged (saves ~10-15s/cycle)
    let youtubeTopics: typeof newsArticles = [];
    let youtubeSkipped = false;

    if (newsArticles.length === 0) {
      // Check Redis flag set by fetchAllRSSFeeds
      try {
        const redis = getRedis();
        if (redis) {
          const allUnchanged = await redis.get("rss:all_feeds_unchanged");
          if (allUnchanged === "1") {
            youtubeSkipped = true;
            await liveLog.rss.info(
              "📋 Tüm RSS feed'ler değişmemiş — YouTube tarama atlanıyor",
            );
          }
        }
      } catch {
        // Non-critical — proceed with YouTube scan
      }
    }

    if (!youtubeSkipped) {
      try {
        const { discoverYouTubeTopics } =
          await import("@/lib/youtube-pipeline");
        youtubeTopics = await discoverYouTubeTopics(72, 15);
        if (youtubeTopics.length > 0) {
          await liveLog.rss.info(
            `${youtubeTopics.length} YouTube konusu keşfedildi`,
          );
        }
      } catch (ytError: any) {
        await liveLog.rss.warn(`YouTube tarama hatası: ${ytError.message}`);
      }
    }

    // Merge RSS + YouTube
    const allArticles = [...newsArticles, ...youtubeTopics];
    articlesScraped = allArticles.length;

    await rssSpan.end({
      rssCount: newsArticles.length,
      ytCount: youtubeTopics.length,
      total: allArticles.length,
    });

    await liveLog.rss.success(
      `${articlesScraped} haber bulundu (RSS: ${newsArticles.length}, YT: ${youtubeTopics.length})`,
    );
    await addLogMessage(
      agentLog.id,
      `${articlesScraped} haber bulundu (RSS: ${newsArticles.length}, YT: ${youtubeTopics.length})`,
    );

    if (allArticles.length === 0) {
      // Normal durum: RSS feed'ler henüz güncellenmedi veya tüm haberler duplicate.
      // Bu bir hata DEĞİLdir — 6 dakikada bir çalışan agent için beklenen durum.
      // throw yerine graceful return yapılıyor ki BullMQ job FAILED göstermesin.
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await liveLog.agent.warn(
        "Tüm haberler duplicate — yeni haber yok, atlanıyor",
      );
      await addLogMessage(
        agentLog.id,
        "Yeni haber bulunamadı — tüm içerik zaten görülmüş",
      );

      await tracer.endTrace("SUCCESS" as any, {
        articlesCreated: 0,
        articlesScraped,
        duration,
        skipped: true,
      });

      await db.agentLog.update({
        where: { id: agentLog.id },
        data: {
          status: AgentStatus.SUCCESS,
          articlesCreated: 0,
          articlesScraped,
          duration,
          errors: [],
        },
      });

      emitToAdmin(SocketEvents.AGENT_COMPLETED, {
        articlesCreated: 0,
        articlesScraped,
        duration,
        timestamp: new Date().toISOString(),
        logId: agentLog.id,
      });

      agentLogger.complete(agentLog.id, {
        success: true,
        articlesCreated: 0,
        articlesScraped,
        duration,
        errors: [],
      });

      trackAgentExecution(agentLog.id, {
        success: true,
        articlesCreated: 0,
        duration,
        errors: [],
      });

      return {
        success: true,
        articlesCreated: 0,
        articlesScraped,
        duration,
        errors: [],
        publishedArticles: [],
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🆕 KONU GRUPLAMA + HİBRİT SKOR ÖNCELİKLENDİRME
    // ═══════════════════════════════════════════════════════════════════
    //
    // 1. Haberleri konularına göre grupla (entity + keyword matching)
    // 2. Cross-platform trend cluster'larıyla eşleştir
    // 3. Hibrit skor hesapla:
    //    finalScore = trendScore*0.4 + clusterPopularity*0.3
    //               + sourceCount*0.2 + recency*0.1
    // 4. Her grubun en iyi temsilcisini seç → pipeline'a gönder
    //
    // TEK KRİTER DEĞİL: Trend skoru, cluster popülaritesi, kaynak sayısı
    //                     ve güncellik birlikte değerlendirilir
    // ═══════════════════════════════════════════════════════════════════

    // Get article count from database settings (admin panel saves "agent.articlesPerRun")
    const articlesPerRunSetting = await db.setting.findUnique({
      where: { key: "agent.articlesPerRun" },
    });

    const envMax = parseInt(process.env.AGENT_MAX_ARTICLES_PER_RUN || "2");
    const maxArticles = articlesPerRunSetting
      ? parseInt(articlesPerRunSetting.value)
      : envMax;

    // targetCount = admin panel setting (1-10), default 2
    const targetCount = Math.max(1, Math.min(maxArticles, 10));

    await liveLog.agent.info(
      `Hedef: ${targetCount} haber (ayar: ${maxArticles})`,
    );

    // Step 2: Konu gruplandırma + hibrit skorlama
    agentLogger.step(
      agentLog.id,
      "topic_grouping",
      "Konu gruplandırma + hibrit skor",
      35,
    );

    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "topic_grouping",
      message: "Haberler konularına göre gruplandırılıyor…",
      progress: 35,
    });

    const topicSpan = tracer.span("topic-grouping");
    await topicSpan.start({ articleCount: allArticles.length });

    const { groupAndRankByTopic } = await import("./topic-grouping.service");
    const groupingResult = await groupAndRankByTopic(allArticles);

    await topicSpan.end({
      totalGroups: groupingResult.stats.totalGroups,
      clusteredGroups: groupingResult.stats.clusteredGroups,
      topTopic: groupingResult.stats.topTopic,
      topScore: groupingResult.stats.topScore,
      durationMs: groupingResult.stats.durationMs,
    });

    // Log konu gruplandırma sonuçları
    await liveLog.agent.info(
      `📊 ${groupingResult.stats.totalGroups} konu grubu | ` +
        `${groupingResult.stats.clusteredGroups} trend eşleşmesi | ` +
        `Top: "${groupingResult.stats.topTopic}" (skor: ${groupingResult.stats.topScore})`,
    );
    await addLogMessage(
      agentLog.id,
      `Konu gruplandırma: ${groupingResult.stats.totalGroups} grup, ` +
        `${groupingResult.stats.clusteredGroups} trend eşleşmesi`,
    );

    // Top 3 grubu logla
    for (const g of groupingResult.groupSummary.slice(0, 3)) {
      const clusterTag = g.matchedCluster ? ` ↔ 🔥 ${g.matchedCluster}` : "";
      await liveLog.agent.info(
        `  📌 ${g.topic} (${g.articleCount} kaynak, hibrit: ${g.avgHybridScore})${clusterTag}`,
      );
    }

    // Step 2.5: Content variation check (son 48 saat dupleri)
    agentLogger.step(
      agentLog.id,
      "content_variation",
      "İçerik çeşitlendirme",
      45,
    );

    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "variation",
      message: "İçerik çeşitlendirme kontrolü…",
      progress: 45,
    });

    // Son 48 saatte yayınlanan haberler (konu tekrarını engellemek için)
    const recentHours = 48;
    const recentArticles = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - recentHours * 60 * 60 * 1000),
        },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        topic: true,
        publishedAt: true,
        slug: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 100,
    });

    await liveLog.agent.info(
      `Son ${recentHours} saatte ${recentArticles.length} haber yayınlanmış`,
    );

    // Hibrit skora göre sıralı haberleri pipeline'a gönder
    // rankedArticles zaten en önemli → en az önemli sıralı
    // Pipeline limit: targetCount başına yeterli aday ver (min 8 — filter'lardan sonra yetsin)
    const pipelineLimit = Math.max(8, targetCount * 4);
    const uniqueArticles =
      groupingResult.rankedArticles.length > pipelineLimit
        ? groupingResult.rankedArticles.slice(0, pipelineLimit)
        : groupingResult.rankedArticles;

    if (groupingResult.rankedArticles.length > pipelineLimit) {
      await liveLog.agent.info(
        `Pipeline limiti: ${groupingResult.rankedArticles.length} → ${uniqueArticles.length} (hedef: ${targetCount})`,
      );
    }

    // Hibrit skor breakdown'u logla (ilk 5 haber)
    for (const art of uniqueArticles.slice(0, 5)) {
      const b = art.scoreBreakdown;
      const clusterTag = art.matchedCluster
        ? ` [🔥 ${art.matchedCluster}]`
        : "";
      await addLogMessage(
        agentLog.id,
        `  #${uniqueArticles.indexOf(art) + 1} [H:${art.hybridScore}] T:${b.trendComponent} C:${b.clusterComponent} S:${b.sourceComponent} R:${b.recencyComponent}${clusterTag} — ${art.title.substring(0, 50)}…`,
      );
    }

    // Step 3: Multi-agent pipeline
    agentLogger.step(
      agentLog.id,
      "multi_agent_pipeline",
      "Pipeline başlatılıyor",
      60,
    );

    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "pipeline",
      message: "Multi-agent pipeline başlatıldı",
      progress: 60,
    });

    // Start multi-agent pipeline
    const { startMultiAgentPipeline, waitForPipelineCompletion } =
      await import("./multi-agent-pipeline.service");

    const pipelineSpan = tracer.span("multi-agent-pipeline");
    await pipelineSpan.start({
      articleCount: uniqueArticles.length,
      targetCount,
    });

    const { jobId: pipelineJobId, runId: pipelineRunId } =
      await startMultiAgentPipeline(uniqueArticles, {
        agentLogId: agentLog.id,
        categorySlug,
        targetCount,
      });

    logPipelineBanner("start", {
      articles: uniqueArticles.length,
      target: targetCount,
      logId: agentLog.id,
    });

    await liveLog.agent.info(
      `Pipeline: ${uniqueArticles.length} haber işlenecek`,
    );
    await addLogMessage(
      agentLog.id,
      `Pipeline başlatıldı: ${uniqueArticles.length} haber`,
    );

    // Wait for pipeline
    await addLogMessage(agentLog.id, "Haberler işleniyor…");
    const pipelineResult = await waitForPipelineCompletion(
      agentLog.id,
      20 * 60 * 1000, // 20 minutes timeout
      pipelineJobId,
      pipelineRunId,
    );

    if (!pipelineResult.success) {
      await pipelineSpan.end({
        success: false,
        errors: pipelineResult.errors.length,
      });
      // Only throw if pipeline actually failed (not just "no relevant articles found")
      if (
        pipelineResult.errors.length > 0 &&
        !pipelineResult.errors.every((e) => e.includes("articles failed"))
      ) {
        await addLogMessage(
          agentLog.id,
          `Pipeline hatası: ${pipelineResult.errors.join(", ")}`,
        );
        throw new Error(`Pipeline failed: ${pipelineResult.errors.join(", ")}`);
      }
      // Pipeline completed but no articles were relevant — this is NOT a failure
      await liveLog.agent.warn(
        "Pipeline tamamlandı ama ilgili haber bulunamadı",
      );
      await addLogMessage(
        agentLog.id,
        "Pipeline tamamlandı — ilgili haber bulunamadı",
      );
    }

    articlesCreated = pipelineResult.articlesPublished;

    await pipelineSpan.end({ articlesPublished: articlesCreated });

    // Get published articles — this is the SOURCE OF TRUTH (pipeline monitor can miscount)
    const publishedArticlesData = await db.article.findMany({
      where: {
        agentLogId: agentLog.id,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        slug: true,
      },
    });

    publishedArticles.push(...publishedArticlesData);

    // FIX: Use actual DB count as source of truth (pipeline monitor may report 0 due to race condition)
    if (publishedArticlesData.length > articlesCreated) {
      articlesCreated = publishedArticlesData.length;
    }

    logPipelineBanner("complete", {
      published: articlesCreated,
      duration: Math.floor((Date.now() - startTime) / 1000),
    });
    await addLogMessage(agentLog.id, `${articlesCreated} haber yayınlandı`);
    await liveLog.publish.success(`${articlesCreated} haber yayında`);

    if (articlesCreated > 0) {
      pingSitemaps()
        .then((results) => {
          const ok = [
            results.google,
            results.bing,
            results.indexNow,
            results.webSub,
          ].filter(Boolean).length;
          liveLog.publish.info(`Sitemap ping: ${ok}/4 başarılı`);
        })
        .catch(() => {});
    }

    // Emit article published events
    for (const article of publishedArticles) {
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

    await tracer.endTrace(status as any, {
      articlesCreated,
      articlesScraped,
      duration,
    });

    await liveLog.agent.success(
      `Tamamlandı: ${articlesCreated} haber, ${duration}s`,
    );

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

    await liveLog.agent.info(
      `Sonraki çalışma: ${nextRun.toLocaleString("tr-TR")}`,
    );

    // Get email settings
    const emailSettings = await db.setting.findMany({
      where: { key: { in: ["agent.emailNotifications", "agent.adminEmail"] } },
    });
    const emailNotify =
      emailSettings.find((s: any) => s.key === "agent.emailNotifications")
        ?.value !== "false";
    const adminEmail = emailSettings.find(
      (s: any) => s.key === "agent.adminEmail",
    )?.value;

    if (!adminEmail) {
      await liveLog.agent.warn(
        "Admin email not configured — email notification skipped",
      );
    }

    // Send email report
    if (emailNotify && adminEmail) {
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
        await liveLog.agent.error(
          `Email gönderimi başarısız: ${e instanceof Error ? e.message : String(e)}`,
        );
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

    trackAgentExecution(agentLog.id, {
      success: true,
      articlesCreated,
      duration,
      errors,
    });

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

    await tracer.endTrace("FAILED", {
      error: errorMessage,
      articlesCreated,
      duration,
    });

    logPipelineBanner("error", { error: errorMessage, duration });

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

    trackAgentExecution(agentLog.id, {
      success: false,
      articlesCreated,
      duration,
      errors,
    });

    await liveLog.agent.error(`Başarısız: ${errorMessage} (${duration}s)`);

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
      console.error("CRITICAL: Failed to update agent log:", logError);
    }

    // Get email settings
    try {
      const emailSettings = await db.setting.findMany({
        where: {
          key: { in: ["agent.emailNotifications", "agent.adminEmail"] },
        },
      });
      const emailNotify =
        emailSettings.find((s: any) => s.key === "agent.emailNotifications")
          ?.value !== "false";
      const adminEmail = emailSettings.find(
        (s: any) => s.key === "agent.adminEmail",
      )?.value;

      if (!adminEmail) {
        // Silent — already logged above
      }

      // Send email report
      if (emailNotify && adminEmail) {
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
          // Email failure is non-critical
        }
      }
    } catch (emailError) {
      // Email error is non-critical
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
        in: stats.map((s: any) => s.categoryId),
      },
    },
  });

  return stats
    .map((stat: any) => {
      const category = categories.find((c: any) => c.id === stat.categoryId);
      return {
        name: category?.name || "Bilinmiyor",
        count: stat._count.id,
      };
    })
    .sort((a: any, b: any) => b.count - a.count);
}

export default {
  executeNewsAgent,
  getAgentHistory,
  getAgentStats,
};
