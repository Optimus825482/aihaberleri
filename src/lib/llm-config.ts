/**
 * LLM Configuration — DB-backed provider settings.
 *
 * Reads the active provider from `LlmProvider` table.
 * Falls back to environment variables if no DB record exists
 * (for backward compatibility during migration).
 */
import { db } from "@/lib/db";

export interface LlmProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

// In-memory cache to avoid DB round-trip on every LLM call
let cachedConfig: LlmProviderConfig | null = null;
let lastFetchAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

function isCacheValid(): boolean {
  return cachedConfig !== null && Date.now() - lastFetchAt < CACHE_TTL_MS;
}

/**
 * Read active LLM provider from database.
 * Cached for 60 seconds — call invalidateLlmConfigCache() to force refresh.
 */
export async function getActiveLlmProvider(): Promise<LlmProviderConfig | null> {
  if (isCacheValid()) return cachedConfig;

  try {
    const provider = await db.llmProvider.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!provider) {
      cachedConfig = null;
      lastFetchAt = Date.now();
      return null;
    }

    cachedConfig = {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl.replace(/\/+$/, ""), // strip trailing slash
      apiKey: provider.apiKey,
      model: provider.model,
    };
    lastFetchAt = Date.now();
    return cachedConfig;
  } catch (error) {
    console.warn("⚠️ Failed to read LLM provider from DB:", error);
    return null;
  }
}

/**
 * Get all providers (for admin panel listing)
 */
export async function getAllProviders(): Promise<LlmProviderConfig[]> {
  const providers = await db.llmProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    apiKey: p.apiKey,
    model: p.model,
  }));
}

/**
 * Save a provider — creates or updates by name.
 * If `isActive` is true, deactivates all others first.
 */
export async function upsertProvider(data: {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
}): Promise<LlmProviderConfig> {
  if (data.isActive) {
    // Deactivate all others first
    await db.llmProvider.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  const provider = await db.llmProvider.upsert({
    where: { name: data.name },
    create: data,
    update: data,
  });

  // If this is the only provider and none active, auto-activate
  if (!provider.isActive) {
    const count = await db.llmProvider.count();
    if (count === 1) {
      await db.llmProvider.update({
        where: { id: provider.id },
        data: { isActive: true },
      });
      provider.isActive = true;
    }
  }

  invalidateLlmConfigCache();
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.model,
  };
}

/**
 * Delete a provider
 */
export async function deleteProvider(id: string): Promise<void> {
  await db.llmProvider.delete({ where: { id } });
  invalidateLlmConfigCache();
}

/**
 * Invalidate the in-memory cache so next call re-reads from DB
 */
export function invalidateLlmConfigCache(): void {
  cachedConfig = null;
  lastFetchAt = 0;
}

/**
 * Get LLM config from DB or fall back to env vars.
 * Returns { baseUrl, apiKey, model } or null if nothing is configured.
 */
export async function getLlmEndpoint(): Promise<{
  baseUrl: string;
  apiKey: string;
  model: string;
} | null> {
  const dbProvider = await getActiveLlmProvider();
  if (dbProvider) {
    return {
      baseUrl: dbProvider.baseUrl,
      apiKey: dbProvider.apiKey,
      model: dbProvider.model,
    };
  }

  // Fallback: env vars (legacy / migration)
  const apiKey =
    process.env.HABERCOMBO_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.KILO_API_KEY ||
    "";
  const baseUrl =
    process.env.HABERCOMBO_API_URL ||
    process.env.DEEPSEEK_API_URL ||
    process.env.KILO_API_URL ||
    "https://api.deepseek.com/v1";
  const model =
    process.env.HABERCOMBO_MODEL ||
    process.env.DEEPSEEK_MODEL ||
    process.env.KILO_MODEL ||
    "deepseek-chat";

  if (!apiKey) return null;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    model,
  };
}
