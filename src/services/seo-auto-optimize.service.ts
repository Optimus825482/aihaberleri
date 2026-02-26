import { db } from "@/lib/db";
import { calculateSEOScore } from "@/lib/seo-calculator";
import { SEOPipelineService } from "@/services/seo-pipeline.service";
import { BulkJobStore } from "@/lib/bulk-job-store";

type LanguageFilter = "tr" | "en" | "all";
type TriggerSource = "manual" | "autopilot";

interface ArticleForOptimize {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  metaDescription: string | null;
  slug: string;
  keywords: string[];
  imageUrl: string | null;
  seoScore: number | null;
}

interface AutopilotSettings {
  enabled: boolean;
  intervalMinutes: number;
  maxScore: number;
  language: LanguageFilter;
  batchSize: number;
  delayMs: number;
}

interface AutopilotStatus {
  lastRunAt: number | null;
  lastResult: string | null;
  nextRunAt: number | null;
}

const SEO_AUTOPILOT_DEFAULTS: AutopilotSettings = {
  enabled: false, // DISABLED: Pre-publish SEO optimization handles this now
  intervalMinutes: 30,
  maxScore: 80,
  language: "tr",
  batchSize: 50,
  delayMs: 2500,
};

const SETTINGS_KEYS = {
  enabled: "seo.autopilot.enabled",
  intervalMinutes: "seo.autopilot.intervalMinutes",
  maxScore: "seo.autopilot.maxScore",
  language: "seo.autopilot.language",
  batchSize: "seo.autopilot.batchSize",
  delayMs: "seo.autopilot.delayMs",
  lastRunAt: "seo.autopilot.lastRunAt",
  lastResult: "seo.autopilot.lastResult",
  nextRunAt: "seo.autopilot.nextRunAt",
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function getSetting(key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function getAutopilotSettings(): Promise<AutopilotSettings> {
  const [
    enabledRaw,
    intervalRaw,
    maxScoreRaw,
    languageRaw,
    batchRaw,
    delayRaw,
  ] = await Promise.all([
    getSetting(SETTINGS_KEYS.enabled),
    getSetting(SETTINGS_KEYS.intervalMinutes),
    getSetting(SETTINGS_KEYS.maxScore),
    getSetting(SETTINGS_KEYS.language),
    getSetting(SETTINGS_KEYS.batchSize),
    getSetting(SETTINGS_KEYS.delayMs),
  ]);

  const parsedLanguage =
    languageRaw === "tr" || languageRaw === "en" || languageRaw === "all"
      ? languageRaw
      : SEO_AUTOPILOT_DEFAULTS.language;

  return {
    enabled:
      enabledRaw === null
        ? SEO_AUTOPILOT_DEFAULTS.enabled
        : enabledRaw === "true",
    intervalMinutes: clamp(
      Number(intervalRaw ?? SEO_AUTOPILOT_DEFAULTS.intervalMinutes),
      5,
      240,
    ),
    maxScore: clamp(
      Number(maxScoreRaw ?? SEO_AUTOPILOT_DEFAULTS.maxScore),
      40,
      95,
    ),
    language: parsedLanguage,
    batchSize: clamp(
      Number(batchRaw ?? SEO_AUTOPILOT_DEFAULTS.batchSize),
      10,
      50,
    ),
    delayMs: clamp(
      Number(delayRaw ?? SEO_AUTOPILOT_DEFAULTS.delayMs),
      1000,
      15000,
    ),
  };
}

async function getAutopilotStatus(): Promise<AutopilotStatus> {
  const [lastRunAtRaw, lastResultRaw, nextRunAtRaw] = await Promise.all([
    getSetting(SETTINGS_KEYS.lastRunAt),
    getSetting(SETTINGS_KEYS.lastResult),
    getSetting(SETTINGS_KEYS.nextRunAt),
  ]);

  const lastRunAt = lastRunAtRaw ? Number(lastRunAtRaw) : null;
  const nextRunAt = nextRunAtRaw ? Number(nextRunAtRaw) : null;

  return {
    lastRunAt: Number.isFinite(lastRunAt) ? lastRunAt : null,
    lastResult: lastResultRaw,
    nextRunAt: Number.isFinite(nextRunAt) ? nextRunAt : null,
  };
}

async function selectCandidateArticles(
  maxScore: number,
  limit: number,
  language: LanguageFilter,
): Promise<ArticleForOptimize[]> {
  const whereClause: any = {
    status: "PUBLISHED",
    OR: [{ seoScore: { lt: maxScore } }, { seoScore: null }],
  };

  if (language !== "all") {
    whereClause.language = language;
  }

  const rawArticles = await db.article.findMany({
    where: whereClause,
    orderBy: { seoScore: "asc" },
    take: limit * 2,
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      metaDescription: true,
      slug: true,
      keywords: true,
      imageUrl: true,
      seoScore: true,
    },
  });

  const selected: ArticleForOptimize[] = [];

  for (const article of rawArticles) {
    if (article.seoScore === null || article.seoScore === 0) {
      const realScore = calculateSEOScore({
        title: article.title,
        content: article.content || "",
        excerpt: article.excerpt || "",
        metaDescription: article.metaDescription,
        slug: article.slug,
        keywords: article.keywords,
        imageUrl: article.imageUrl,
      });

      await db.article.update({
        where: { id: article.id },
        data: { seoScore: realScore.score },
      });

      article.seoScore = realScore.score;
    }

    if ((article.seoScore || 0) < maxScore) {
      selected.push(article);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBulkOptimize(
  jobId: string,
  articles: ArticleForOptimize[],
  options: { maxScore: number; delayMs: number },
): Promise<void> {
  const pipeline = new SEOPipelineService();

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const beforeScore = article.seoScore || 0;

    if (beforeScore >= options.maxScore) {
      BulkJobStore.addProgress(jobId, {
        index: i + 1,
        total: articles.length,
        articleId: article.id,
        title: article.title,
        status: "skipped",
        beforeScore,
        afterScore: beforeScore,
        scoreDelta: 0,
        message: `Skor yeterli: ${beforeScore}`,
      });
      continue;
    }

    try {
      BulkJobStore.setProcessing(jobId, i + 1, article.title);

      const result = await pipeline.run({
        title: article.title,
        content: article.content || "",
        excerpt: article.excerpt,
        metaDescription: article.metaDescription,
        slug: article.slug,
        keywords: article.keywords,
        imageUrl: article.imageUrl,
      });

      if (!result.success || result.diffs.length === 0) {
        const isSkip = result.diffs.length === 0 && result.success;
        BulkJobStore.addProgress(jobId, {
          index: i + 1,
          total: articles.length,
          articleId: article.id,
          title: article.title,
          status: isSkip ? "skipped" : "failed",
          beforeScore,
          afterScore: beforeScore,
          scoreDelta: 0,
          message: result.message,
        });
        continue;
      }

      const allFields = result.diffs
        .filter(
          (d) =>
            d.field !== "seoScore" &&
            d.guardrailPassed !== false &&
            d.before !== d.after,
        )
        .map((d) => d.field);

      if (allFields.length === 0) {
        BulkJobStore.addProgress(jobId, {
          index: i + 1,
          total: articles.length,
          articleId: article.id,
          title: article.title,
          status: "skipped",
          beforeScore: result.beforeScore,
          afterScore: result.afterScore,
          scoreDelta: 0,
          message: "Uygulanacak değişiklik bulunamadı.",
        });
        continue;
      }

      const updateData = pipeline.buildUpdateData(result.diffs, allFields);
      await db.article.update({ where: { id: article.id }, data: updateData });

      const updatedArticle = await db.article.findUnique({
        where: { id: article.id },
      });

      let finalScore = result.afterScore;
      if (updatedArticle) {
        const seoResult = calculateSEOScore({
          title: updatedArticle.title,
          content: updatedArticle.content || "",
          excerpt: updatedArticle.excerpt || "",
          metaDescription: updatedArticle.metaDescription,
          slug: updatedArticle.slug,
          keywords: updatedArticle.keywords,
          imageUrl: updatedArticle.imageUrl,
        });

        finalScore = seoResult.score;
        await db.article.update({
          where: { id: article.id },
          data: { seoScore: seoResult.score },
        });
      }

      const scoreDelta = finalScore - beforeScore;
      BulkJobStore.addProgress(jobId, {
        index: i + 1,
        total: articles.length,
        articleId: article.id,
        title: article.title,
        status: "success",
        beforeScore,
        afterScore: finalScore,
        scoreDelta,
        message: `${beforeScore} → ${finalScore} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})`,
      });
    } catch (error) {
      BulkJobStore.addProgress(jobId, {
        index: i + 1,
        total: articles.length,
        articleId: article.id,
        title: article.title,
        status: "error",
        beforeScore,
        afterScore: beforeScore,
        scoreDelta: 0,
        message: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      BulkJobStore.clearProcessing(jobId);
      if (i < articles.length - 1) {
        await sleep(options.delayMs);
      }
    }
  }

  BulkJobStore.complete(jobId);
  BulkJobStore.cleanup();

  const completed = BulkJobStore.get(jobId);
  if (completed) {
    await Promise.all([
      setSetting(SETTINGS_KEYS.lastRunAt, String(Date.now())),
      setSetting(
        SETTINGS_KEYS.lastResult,
        `${completed.succeeded}/${completed.total} başarılı, ${completed.failed} hata, ${completed.skipped} atlandı`,
      ),
    ]);
  }
}

export async function startSEOAutoOptimizeJob(options?: {
  maxScore?: number;
  language?: LanguageFilter;
  limit?: number;
  source?: TriggerSource;
}): Promise<
  | {
      started: true;
      jobId: string;
      total: number;
      language: LanguageFilter;
      maxScore: number;
      limit: number;
    }
  | {
      started: false;
      reason: "active-job" | "no-candidate";
      jobId?: string;
      message: string;
    }
> {
  if (BulkJobStore.hasActiveJob()) {
    const active = BulkJobStore.getActive();
    return {
      started: false,
      reason: "active-job",
      jobId: active?.id,
      message: "Zaten çalışan bir optimizasyon var",
    };
  }

  const settings = await getAutopilotSettings();
  const source = options?.source || "manual";
  const maxScore = clamp(options?.maxScore ?? settings.maxScore, 40, 95);
  const language = options?.language ?? settings.language;
  const limit = clamp(options?.limit ?? settings.batchSize, 1, 50);

  const articles = await selectCandidateArticles(maxScore, limit, language);
  if (articles.length === 0) {
    return {
      started: false,
      reason: "no-candidate",
      message: `Ön-ölçüm sonrası ${maxScore} altında skorlu makale bulunamadı.`,
    };
  }

  const jobId = `seo-bulk-${Date.now()}`;
  BulkJobStore.create(jobId, articles.length);

  runBulkOptimize(jobId, articles, {
    maxScore,
    delayMs: settings.delayMs,
  }).catch(async (error) => {
    BulkJobStore.fail(
      jobId,
      error instanceof Error ? error.message : "Bilinmeyen hata",
    );
    await Promise.all([
      setSetting(SETTINGS_KEYS.lastRunAt, String(Date.now())),
      setSetting(
        SETTINGS_KEYS.lastResult,
        `Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
      ),
    ]);
  });

  await setSetting(SETTINGS_KEYS.lastRunAt, String(Date.now()));

  if (source === "autopilot") {
    await setSetting(
      SETTINGS_KEYS.nextRunAt,
      String(Date.now() + settings.intervalMinutes * 60 * 1000),
    );
  }

  return {
    started: true,
    jobId,
    total: articles.length,
    language,
    maxScore,
    limit,
  };
}

export async function getSEOAutoOptimizeState(jobId?: string, since = 0) {
  let targetId = jobId;

  if (!targetId) {
    const active = BulkJobStore.getActive();
    targetId = active?.id;
  }

  const [settings, status] = await Promise.all([
    getAutopilotSettings(),
    getAutopilotStatus(),
  ]);

  const autopilot = {
    ...settings,
    ...status,
  };

  if (!targetId) {
    return {
      active: false,
      autopilot,
    };
  }

  const job = BulkJobStore.get(targetId);
  if (!job) {
    return {
      active: false,
      autopilot,
      error: "Job bulunamadı",
    };
  }

  return {
    active: job.status === "running",
    jobId: job.id,
    status: job.status,
    total: job.total,
    current: job.current,
    succeeded: job.succeeded,
    failed: job.failed,
    skipped: job.skipped,
    avgImprovement:
      job.succeeded > 0 ? Math.round(job.totalImprovement / job.succeeded) : 0,
    progress: BulkJobStore.getProgressSince(job.id, since),
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    processingTitle: job.processingTitle,
    processingIndex: job.processingIndex,
    autopilot,
  };
}

export async function updateSEOAutopilotSettings(input: {
  enabled?: boolean;
  intervalMinutes?: number;
  maxScore?: number;
  language?: LanguageFilter;
  delayMs?: number;
}) {
  const settings = await getAutopilotSettings();
  const merged: AutopilotSettings = {
    enabled: input.enabled ?? settings.enabled,
    intervalMinutes: clamp(
      input.intervalMinutes ?? settings.intervalMinutes,
      5,
      240,
    ),
    maxScore: clamp(input.maxScore ?? settings.maxScore, 40, 95),
    language: input.language ?? settings.language,
    batchSize: clamp(settings.batchSize, 10, 50),
    delayMs: clamp(input.delayMs ?? settings.delayMs, 1000, 15000),
  };

  await Promise.all([
    setSetting(SETTINGS_KEYS.enabled, String(merged.enabled)),
    setSetting(SETTINGS_KEYS.intervalMinutes, String(merged.intervalMinutes)),
    setSetting(SETTINGS_KEYS.maxScore, String(merged.maxScore)),
    setSetting(SETTINGS_KEYS.language, merged.language),
    setSetting(SETTINGS_KEYS.batchSize, String(merged.batchSize)),
    setSetting(SETTINGS_KEYS.delayMs, String(merged.delayMs)),
    setSetting(
      SETTINGS_KEYS.nextRunAt,
      String(Date.now() + merged.intervalMinutes * 60 * 1000),
    ),
  ]);

  return merged;
}

export async function runScheduledSEOPatrol() {
  const settings = await getAutopilotSettings();
  if (!settings.enabled) {
    return { triggered: false, reason: "disabled" as const };
  }

  const status = await getAutopilotStatus();
  const now = Date.now();

  if (status.nextRunAt && now < status.nextRunAt) {
    return { triggered: false, reason: "not-due" as const };
  }

  const started = await startSEOAutoOptimizeJob({
    maxScore: settings.maxScore,
    language: settings.language,
    limit: settings.batchSize,
    source: "autopilot",
  });

  if (!started.started) {
    return {
      triggered: false,
      reason: started.reason,
      jobId: started.jobId,
      message: started.message,
    };
  }

  return {
    triggered: true,
    reason: "started" as const,
    jobId: started.jobId,
    total: started.total,
  };
}
