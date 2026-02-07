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

// ============================================================================
// UI UTILITIES - Box drawing for console output
// ============================================================================

/**
 * Create a formatted box header for agent execution logs
 */
function createAgentBoxHeader(data: {
  logId: string;
  startTime: Date;
  category: string;
}): string {
  const shortId = data.logId.substring(0, 12);
  const startTimeStr = data.startTime.toLocaleString("tr-TR").padEnd(25);
  const category = (data.category || "All").padEnd(28);

  return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃           🤖 AGENT EXECUTION START                ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Log ID:       ${shortId}                    ┃
┃  Start Time:   ${startTimeStr}┃
┃  Category:     ${category}┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
}

/**
 * Create a formatted box footer for agent execution logs
 */
function createAgentBoxFooter(data: {
  status: string;
  duration: number;
  articlesScraped: number;
  articlesCreated: number;
  nextRun: Date;
}): string {
  const status = data.status.padEnd(31);
  const duration = `${data.duration}s${" ".repeat(31 - String(data.duration).length)}`;
  const scraped = `${data.articlesScraped}${" ".repeat(31 - String(data.articlesScraped).length)}`;
  const created = `${data.articlesCreated}${" ".repeat(31 - String(data.articlesCreated).length)}`;
  const nextRun = data.nextRun.toLocaleString("tr-TR").padEnd(25);

  return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃           ✅ AGENT EXECUTION SUCCESS              ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Status:         ${status}┃
┃  Duration:       ${duration}┃
┃  Articles Found: ${scraped}┃
┃  Articles Made:  ${created}┃
┃  Next Run:       ${nextRun}┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
}

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

  // Add to Redis log stream
  await addLogMessage(
    agentLog.id,
    `🚀 Agent başlatıldı - ${new Date().toLocaleString("tr-TR")}`,
  );

  console.log(
    createAgentBoxHeader({
      logId: agentLog.id,
      startTime: new Date(),
      category: categorySlug || "All",
    }),
  );

  try {
    // Step 1: Search for AI news (RSS + Trend Analysis)
    agentLogger.step(
      agentLog.id,
      "fetch_news",
      "Yapay zeka haberleri aranıyor (RSS + Trend)",
      20,
    );
    console.log("📰 Adım 1: Yapay zeka haberleri aranıyor (RSS + Trend)...");
    await addLogMessage(
      agentLog.id,
      "📰 RSS kaynaklarından haberler toplanıyor...",
    );
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
    console.log(
      `✅ ${articlesScraped} unique trend haber bulundu (duplicate filtering yapıldı)`,
    );

    // Live log: Articles fetched
    await liveLog.rss.success(`📰 ${articlesScraped} unique haber bulundu`);
    await addLogMessage(
      agentLog.id,
      `✅ ${articlesScraped} unique haber bulundu`,
    );

    if (newsArticles.length === 0) {
      console.log(`\n⚠️  Tüm haberler duplicate! Yeni haber yok.`);
      await addLogMessage(
        agentLog.id,
        "⚠️ Tüm haberler duplicate - yeni haber yok",
      );
      throw new Error("Tüm haberler duplicate - yeni haber bulunamadı");
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🆕 YENİ YAKLAŞIM: Content Variation - Duplicate'leri Engelleme, Çeşitlendir!
    // ═══════════════════════════════════════════════════════════════════
    //
    // ESKİ SİSTEM: Duplicate haberler tamamen engelleniyordu → %100 duplicate oranı
    // YENİ SİSTEM: Aynı konulardan FARKLI AÇILARDAN içerik üret
    //
    // Adım 1: Mevcut yayınlanmış haberleri getir
    // Adım 2: Aday haberleri kontrol et
    // Adım 3: Benzer konu varsa → VARIATION oluştur
    // Adım 4: Benzer konu yoksa → Normal akış
    // ═══════════════════════════════════════════════════════════════════

    // Get article count from database settings (priority) or env vars (fallback)
    const minSetting = await db.setting.findUnique({
      where: { key: "agent.minArticles" },
    });
    const maxSetting = await db.setting.findUnique({
      where: { key: "agent.maxArticles" },
    });

    const envMin = parseInt(process.env.AGENT_MIN_ARTICLES_PER_RUN || "1");
    const envMax = parseInt(process.env.AGENT_MAX_ARTICLES_PER_RUN || "1");

    // Use DB setting if exists, otherwise env var (defaults to 1)
    const minArticles = minSetting ? parseInt(minSetting.value) : envMin;
    const maxArticles = maxSetting ? parseInt(maxSetting.value) : envMax;

    // 🎯 15 dk = 0.25 saat. En az 1 haber garanti!
    const targetCount = Math.max(1, Math.min(
      Math.floor(Math.random() * (maxArticles - minArticles + 1)) + minArticles,
      3, // Maksimum 3 article (her biri farklı açı)
    ));

    console.log(
      `📊 Haber sayısı ayarları: min=${minArticles}, max=${maxArticles}`,
    );
    console.log(
      `🎯 Hedef haber sayısı: ${targetCount} (content variation mode aktif)`,
    );

    // Step 2: Content Variation Check
    agentLogger.step(
      agentLog.id,
      "content_variation",
      "İçerik çeşitlendirme kontrolü",
      40,
    );
    console.log("🔄 Adım 2: İçerik çeşitlendirme stratejisi...");
    await addLogMessage(agentLog.id, "🔄 İçerik çeşitlendirme kontrolü yapılıyor...");
    await updateJobProgress(
      agentLog.id,
      "variation",
      "Benzer konular için farklı açılar araştırılıyor...",
      40,
    );

    // Emit progress
    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "variation",
      message: "İçerik çeşitlendirme stratejisi uygulanıyor...",
      progress: 40,
    });

    // 🆕 Mevcut haberleri getir (son 48 saat)
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

    console.log(`📚 Son ${recentHours} saatte ${recentArticles.length} haber yayınlanmış`);

    // 🆕 Content Variation Service ile kontrol et
    const { findOrCreateVariation, createVariationArticle } = await import("./content-variation.service");

    // Tüm aday haberleri kontrol et ve variation planı oluştur
    const variationPlan: Array<{
      article: any;
      needsVariation: boolean;
      variation?: any;
      baseArticle?: any;
    }> = [];

    for (const candidate of newsArticles.slice(0, 10)) { // İlk 10 adayı kontrol et
      const result = await findOrCreateVariation(
        candidate.title,
        candidate.description,
        candidate.url,
        recentArticles,
        recentHours
      );

      if (result.shouldCreateVariation) {
        console.log(`🔄 VARIATION NEEDED: "${candidate.title.substring(0, 50)}..."`);
        console.log(`   → ${result.variation.angle} açısı ile içerik üretilecek`);

        variationPlan.push({
          article: candidate,
          needsVariation: true,
          variation: result.variation,
          baseArticle: result.baseArticle
        });
      } else {
        console.log(`✅ ORIGINAL OK: "${candidate.title.substring(0, 50)}..."`);
        variationPlan.push({
          article: candidate,
          needsVariation: false
        });
      }

      if (variationPlan.length >= targetCount) break;
    }

    console.log(`\n📊 Variation Plan: ${variationPlan.length} haber`);
    console.log(`   - Original: ${variationPlan.filter(p => !p.needsVariation).length}`);
    console.log(`   - Variation: ${variationPlan.filter(p => p.needsVariation).length}`);

    if (variationPlan.length === 0) {
      console.log(`⚠️ Hiç haber planlanamadı! En az 1 variation oluşturulacak...`);

      // Force create variation from first candidate
      const firstCandidate = newsArticles[0];
      if (firstCandidate) {
        const variations = await import("./content-variation.service");
        const defaultVariations = await variations.generateContentAngles(
          firstCandidate.title,
          firstCandidate.description,
          recentArticles.map(a => a.topic)
        );
        variationPlan.push({
          article: firstCandidate,
          needsVariation: true,
          variation: defaultVariations[0]
        });
      }
    }

    const selectedArticles = variationPlan.map((plan, index) => ({
      ...plan.article,
      _variation: plan.variation,
      _needsVariation: plan.needsVariation,
      _baseArticle: plan.baseArticle,
      _index: index
    }));

    await addLogMessage(
      agentLog.id,
      `✅ ${selectedArticles.length} haber planlandı (${variationPlan.filter(p => p.needsVariation).length} variation)`,
    );

    // Live log: Articles planned
    await liveLog.deepseek.success(
      `✅ ${selectedArticles.length} haber planlandı (${variationPlan.filter(p => p.needsVariation).length} variation)`,
    );

    // Step 3: Start Multi-Agent Pipeline (NEW!)
    agentLogger.step(
      agentLog.id,
      "multi_agent_pipeline",
      "Multi-agent pipeline başlatılıyor (Enrichment + Visual + Publish)",
      60,
    );
    console.log("🤖 Adım 3: Multi-agent pipeline başlatılıyor...");
    await updateJobProgress(
      agentLog.id,
      "pipeline",
      "Multi-agent pipeline: Enrichment → Visual → Publish",
      60,
    );

    // Emit progress
    emitToAdmin(SocketEvents.AGENT_PROGRESS, {
      step: "pipeline",
      message: "Multi-agent pipeline başlatıldı",
      progress: 60,
    });

    // Start multi-agent pipeline
    const { startMultiAgentPipeline, waitForPipelineCompletion } =
      await import("./multi-agent-pipeline.service");

    await startMultiAgentPipeline(selectedArticles, {
      agentLogId: agentLog.id,
      categorySlug,
      targetCount,
    });

    // Live log: Pipeline started
    await liveLog.agent.info(
      `🤖 Multi-agent pipeline başlatıldı: ${selectedArticles.length} haber işlenecek`,
    );
    await addLogMessage(
      agentLog.id,
      `🤖 Multi-agent pipeline başlatıldı: ${selectedArticles.length} haber işlenecek`,
    );

    // Wait for pipeline completion
    console.log("⏳ Multi-agent pipeline tamamlanması bekleniyor...");
    await addLogMessage(
      agentLog.id,
      "⏳ Haberler işleniyor (içerik + görsel + çeviri)...",
    );
    const pipelineResult = await waitForPipelineCompletion(
      agentLog.id,
      20 * 60 * 1000, // 20 minutes timeout
    );

    if (!pipelineResult.success) {
      await addLogMessage(
        agentLog.id,
        `❌ Pipeline hatası: ${pipelineResult.errors.join(", ")}`,
      );
      throw new Error(
        `Multi-agent pipeline failed: ${pipelineResult.errors.join(", ")}`,
      );
    }

    articlesCreated = pipelineResult.articlesPublished;

    // Get published articles
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

    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `✅ MULTI-AGENT PIPELINE COMPLETED: ${articlesCreated} haber yayınlandı`,
    );
    console.log(`${"=".repeat(60)}\n`);
    await addLogMessage(
      agentLog.id,
      `🎉 ${articlesCreated} haber başarıyla yayınlandı!`,
    );

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
      emailSettings.find((s: any) => s.key === "agent.emailNotifications")
        ?.value !== "false";
    const adminEmail = emailSettings.find(
      (s: any) => s.key === "agent.adminEmail",
    )?.value;

    if (!adminEmail) {
      console.warn(
        "⚠️ Agent admin email not configured in settings. Email notification skipped.",
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
        emailSettings.find((s: any) => s.key === "agent.emailNotifications")
          ?.value !== "false";
      const adminEmail =
        emailSettings.find((s: any) => s.key === "agent.adminEmail")?.value;

      if (!adminEmail) {
        console.warn(
          "⚠️ Agent admin email not configured. Error email notification skipped.",
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
