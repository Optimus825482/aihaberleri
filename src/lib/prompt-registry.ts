/**
 * Prompt Registry - DeepSeek prompt versioning & A/B testing
 * Prompt'ları DB'de versiyonlar, aktif versiyonu döner, metrik toplar
 */

import { db } from "@/lib/db";

// Prisma client type workaround — TS server cache may not recognize new models
const prisma = db as any;

export type PromptName =
  | "article-rewrite"
  | "article-analyze"
  | "image-prompt"
  | "translation"
  | "article-rewrite-with-note"
  | "batch-score";

interface PromptConfig {
  temperature: number;
  maxTokens: number;
  model: string;
}

interface PromptTemplate {
  systemPrompt: string;
  userTemplate: string;
  config: PromptConfig;
  version: string;
  promptVersionId: string | null; // DB id for metrics tracking
}

// In-memory cache (refreshed every 5 min)
let promptCache: Map<string, PromptTemplate> = new Map();
let lastCacheRefresh = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get active prompt for a given name. Falls back to hardcoded defaults.
 */
export async function getActivePrompt(
  name: PromptName,
): Promise<PromptTemplate> {
  // Check cache
  if (Date.now() - lastCacheRefresh < CACHE_TTL && promptCache.has(name)) {
    return promptCache.get(name)!;
  }

  try {
    const active = await prisma.promptVersion.findFirst({
      where: { name, isActive: true },
    });

    if (active) {
      const config = (active.config as any) || {};
      const template: PromptTemplate = {
        systemPrompt: active.systemPrompt,
        userTemplate: active.userTemplate,
        config: {
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 4000,
          model: config.model ?? "deepseek-v4-flash",
        },
        version: active.version,
        promptVersionId: active.id,
      };
      promptCache.set(name, template);
      lastCacheRefresh = Date.now();
      return template;
    }
  } catch (e) {
    // DB error — fall through to defaults
  }

  // Return default (no DB entry)
  return getDefaultPrompt(name);
}

/**
 * Record prompt usage metrics (call after each DeepSeek call)
 */
export async function recordPromptMetrics(
  promptVersionId: string | null,
  score: number | null,
  durationMs: number,
): Promise<void> {
  if (!promptVersionId) return;
  try {
    const existing = await prisma.promptVersion.findUnique({
      where: { id: promptVersionId },
      select: { metrics: true },
    });
    const metrics = (existing?.metrics as any) || {
      usageCount: 0,
      totalScore: 0,
      totalDuration: 0,
    };
    metrics.usageCount = (metrics.usageCount || 0) + 1;
    if (score !== null) {
      metrics.totalScore = (metrics.totalScore || 0) + score;
      metrics.avgScore = Math.round(metrics.totalScore / metrics.usageCount);
    }
    metrics.totalDuration = (metrics.totalDuration || 0) + durationMs;
    metrics.avgDuration = Math.round(
      metrics.totalDuration / metrics.usageCount,
    );

    await prisma.promptVersion.update({
      where: { id: promptVersionId },
      data: { metrics: metrics as any },
    });
  } catch (e) {
    // Non-critical
  }
}

/**
 * List all prompt versions for admin UI
 */
export async function listPromptVersions(name?: PromptName) {
  return prisma.promptVersion.findMany({
    where: name ? { name } : undefined,
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });
}

/**
 * Create a new prompt version
 */
export async function createPromptVersion(data: {
  name: PromptName;
  version: string;
  systemPrompt: string;
  userTemplate: string;
  config?: Partial<PromptConfig>;
  description?: string;
  setActive?: boolean;
}) {
  // If setActive, deactivate others first
  if (data.setActive) {
    await prisma.promptVersion.updateMany({
      where: { name: data.name, isActive: true },
      data: { isActive: false },
    });
  }

  return prisma.promptVersion.create({
    data: {
      name: data.name,
      version: data.version,
      systemPrompt: data.systemPrompt,
      userTemplate: data.userTemplate,
      config: (data.config || {
        temperature: 0.7,
        maxTokens: 4000,
        model: "deepseek-v4-flash",
      }) as any,
      description: data.description,
      isActive: data.setActive ?? false,
    },
  });
}

/**
 * Activate a specific prompt version (deactivates others of same name)
 */
export async function activatePromptVersion(id: string) {
  const prompt = await prisma.promptVersion.findUnique({ where: { id } });
  if (!prompt) throw new Error("Prompt version not found");

  await prisma.promptVersion.updateMany({
    where: { name: prompt.name, isActive: true },
    data: { isActive: false },
  });

  return prisma.promptVersion.update({
    where: { id },
    data: { isActive: true },
  });
}

/**
 * Default prompts (hardcoded fallbacks — used when no DB entry exists)
 */
function getDefaultPrompt(name: PromptName): PromptTemplate {
  const defaults: Record<PromptName, PromptTemplate> = {
    "article-rewrite": {
      systemPrompt:
        "Sen dünyanın en iyi teknoloji editörüsün. Yazıların o kadar doğal ki, Turing testini geçmekle kalmıyor, insanlardan daha 'insan' tınlıyor. Asla AI gibi yazma. Sadece geçerli JSON yanıtı ver.",
      userTemplate: "{{REWRITE_PROMPT}}", // Placeholder — actual template is in deepseek.ts
      config: { temperature: 1.0, maxTokens: 4000, model: "deepseek-v4-flash" },
      version: "default",
      promptVersionId: null,
    },
    "article-analyze": {
      systemPrompt:
        "Sen uzman bir yapay zeka haber editörüsün. SADECE yapay zeka ile DOĞRUDAN ilgili haberleri seç. Genel ekonomi, politika veya teknoloji haberlerini ASLA seçme. Her zaman sadece geçerli JSON ile yanıt ver.",
      userTemplate: "{{ANALYZE_PROMPT}}",
      config: { temperature: 0.7, maxTokens: 2000, model: "deepseek-v4-flash" },
      version: "default",
      promptVersionId: null,
    },
    "image-prompt": {
      systemPrompt:
        "Sen uzman bir haber fotoğrafçısısın. Haberin içeriğini analiz et ve SPESIFIK, ÇEŞITLI görsel prompt oluştur. Generic ofis görselleri YASAK. Her haber için FARKLI bir görsel seç.",
      userTemplate: "{{IMAGE_PROMPT}}",
      config: { temperature: 1.0, maxTokens: 200, model: "deepseek-v4-flash" },
      version: "default",
      promptVersionId: null,
    },
    translation: {
      systemPrompt:
        "You are a professional translator specializing in technology and AI news.",
      userTemplate: "{{TRANSLATION_PROMPT}}",
      config: { temperature: 0.3, maxTokens: 4000, model: "deepseek-v4-flash" },
      version: "default",
      promptVersionId: null,
    },
    "article-rewrite-with-note": {
      systemPrompt:
        "Sen uzman bir haber editörüsün. Admin talimatlarını harfiyen uygulayarak haberi güncelle. Sadece geçerli JSON yanıtı ver.",
      userTemplate: "{{REWRITE_WITH_NOTE_PROMPT}}",
      config: { temperature: 0.7, maxTokens: 4000, model: "deepseek-v4-flash" },
      version: "default",
      promptVersionId: null,
    },
    "batch-score": {
      systemPrompt: "Sen bir haber kalite değerlendirme uzmanısın.",
      userTemplate: "{{BATCH_SCORE_PROMPT}}",
      config: { temperature: 0.3, maxTokens: 2000, model: "deepseek-v4-flash" },
      version: "default",
      promptVersionId: null,
    },
  };

  return defaults[name] || defaults["article-rewrite"];
}
