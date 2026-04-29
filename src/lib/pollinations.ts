/**
 * Pollinations.ai - AI Image Generation Service
 * https://pollinations.ai/
 *
 * Supports both anonymous and authenticated usage.
 * Set POLLINATIONS_API_KEY for higher rate limits.
 *
 * PERFORMANCE: Image caching implemented to avoid regenerating same prompts
 * Cache key: hash(prompt) → Value: imageUrl, TTL: 7 days
 */

import { createHash } from "crypto";
import { getRedis } from "@/lib/redis";
import { createModuleLogger } from "@/lib/agent-log-stream";

const imageLog = createModuleLogger("image");

interface PollinationsOptions {
  width?: number;
  height?: number;
  seed?: number;
  skipCache?: boolean;
  model?:
    | "kontext"
    | "nanobanana"
    | "nanobanana-2"
    | "nanobanana-pro"
    | "seedream5"
    | "seedream"
    | "seedream-pro"
    | "flux"
    | "zimage"
    | "klein"
    | "klein-large"
    | "imagen-4"
    | "flux-2-dev"
    | "grok-imagine"
    | "gptimage"
    | "gptimage-large";
  enhance?: boolean;
  nologo?: boolean;
  negativePrompt?: string;
  safe?: boolean;
  quality?: "low" | "medium" | "high" | "hd";
  transparent?: boolean;
  allowBackupFallback?: boolean;
}

const POLLINATIONS_IMAGE_MODELS = new Set([
  "kontext",
  "nanobanana",
  "nanobanana-2",
  "nanobanana-pro",
  "seedream5",
  "seedream",
  "seedream-pro",
  "gptimage",
  "gptimage-large",
  "flux",
  "zimage",
  "klein",
  "klein-large",
  "imagen-4",
  "flux-2-dev",
  "grok-imagine",
]);

const NEGATIVE_PROMPT_MODELS = new Set(["flux", "zimage"]);
const QUALITY_MODELS = new Set(["gptimage", "gptimage-large"]);
const TRANSPARENT_MODELS = new Set(["gptimage", "gptimage-large"]);
const DEFAULT_NEGATIVE_PROMPT =
  "people, humans, faces, hands, portraits, selfies, crowded scene, text watermark, logo";

// API Configuration
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt"; // Legacy anonymous endpoint
const POLLINATIONS_GEN_URL = "https://gen.pollinations.ai/image"; // New authenticated endpoint
const PICSUM_URL = "https://picsum.photos";

// Together.ai Configuration (Flux Schnell — free tier)
// DEPRECATED: Together.ai artık ücretsiz değil, minimum $5 kredi gerekiyor
// const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
// const TOGETHER_API_URL = "https://api.together.xyz/v1/images/generations";

// Gemini Image Generation (Nano Banana — paid tier)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

// AI Horde (free, unlimited, crowdsourced GPU cluster)
const AI_HORDE_API_KEY = process.env.AI_HORDE_API_KEY || "0000000000";
const AI_HORDE_BASE_URL = "https://aihorde.net/api/v2";

// Cache Configuration
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const CACHE_KEY_PREFIX = "pollinations:image:";
const CACHE_KEY_VERSION = "v2";
const DEFAULT_POLLINATIONS_REQUEST_TIMEOUT_MS = 25000;
const POLLINATIONS_IMAGE_ACCEPT_HEADER =
  "image/jpeg, image/png, image/webp, */*";

/**
 * Generate cache key from prompt using SHA-256 hash
 */
function generateCacheKey(prompt: string, options: PollinationsOptions = {}): string {
  const signature = JSON.stringify({
    v: CACHE_KEY_VERSION,
    prompt,
    model: options.model ?? "flux",
    width: options.width ?? 1200,
    height: options.height ?? 630,
    safe: options.safe ?? null,
    enhance: options.enhance ?? true,
    negativePrompt: options.negativePrompt ?? null,
  });
  return `${CACHE_KEY_PREFIX}${createHash("sha256").update(signature).digest("hex")}`;
}

function normalizeModel(
  model: PollinationsOptions["model"],
): NonNullable<PollinationsOptions["model"]> {
  if (!model || !POLLINATIONS_IMAGE_MODELS.has(model)) {
    if (model) {
      console.warn(`⚠️ Invalid model "${model}", falling back to "flux"`);
    }
    return "flux";
  }

  return model;
}

function buildPollinationsParams(
  options: PollinationsOptions,
): URLSearchParams {
  const model = normalizeModel(options.model);
  const params = new URLSearchParams({
    width: String(options.width ?? 1200),
    height: String(options.height ?? 630),
    model,
    enhance: String(options.enhance ?? true),
  });

  if (typeof options.seed === "number") {
    params.append("seed", String(options.seed));
  }

  if (typeof options.safe === "boolean") {
    params.append("safe", String(options.safe));
  }

  if (NEGATIVE_PROMPT_MODELS.has(model)) {
    params.append(
      "negative_prompt",
      options.negativePrompt?.trim() || DEFAULT_NEGATIVE_PROMPT,
    );
  }

  if (options.quality && QUALITY_MODELS.has(model)) {
    params.append("quality", options.quality);
  }

  if (
    typeof options.transparent === "boolean" &&
    TRANSPARENT_MODELS.has(model)
  ) {
    params.append("transparent", String(options.transparent));
  }

  return params;
}

export function isFallbackImageUrl(
  imageUrl: string | null | undefined,
): boolean {
  if (!imageUrl) {
    return false;
  }

  return (
    imageUrl.includes("source.unsplash.com") ||
    imageUrl.includes("picsum.photos") ||
    imageUrl.includes("/logos/og-image.png")
  );
  // Note: Together.ai URLs (api.together.ai) are NOT fallback — they're real AI-generated images
  // Note: Gemini data URLs (data:image/...) are NOT fallback — they're real AI-generated images
}

export async function fetchFreeBackupImage(
  prompt: string,
  options: PollinationsOptions = {},
): Promise<string> {
  const { width = 1200, height = 630 } = options;
  const seed = createHash("md5").update(prompt).digest("hex").slice(0, 12);
  const picsumUrl = `${PICSUM_URL}/seed/${seed}/${width}/${height}`;
  console.warn("⚠️ Pollinations başarısız, Picsum fallback kullanılıyor");
  return picsumUrl;
}

/**
 * Get cached image URL from Redis
 */
async function getCachedImage(
  prompt: string,
  options: PollinationsOptions = {},
): Promise<string | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;

    const cacheKey = generateCacheKey(prompt, options);
    const cachedUrl = await redis.get(cacheKey);

    if (cachedUrl) {
      imageLog.success(`Cache HIT: ${prompt.substring(0, 50)}...`);
      return cachedUrl;
    }

    imageLog.debug(`Cache MISS: ${prompt.substring(0, 50)}...`);
    return null;
  } catch (error) {
    console.warn("⚠️ Redis cache read error:", error);
    return null;
  }
}

/**
 * Cache image URL in Redis with 7-day TTL
 */
async function cacheImageUrl(
  prompt: string,
  imageUrl: string,
  options: PollinationsOptions = {},
): Promise<void> {
  try {
    // Skip caching base64 data URLs — they're too large for Redis (500KB-2MB each)
    // Gemini images go through image-optimizer → R2 upload, so caching the data URL is wasteful
    if (imageUrl.startsWith("data:")) {
      return;
    }

    const redis = getRedis();
    if (!redis) return;

    const cacheKey = generateCacheKey(prompt, options);
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, imageUrl);
    console.log("💾 Image cached for 7 days");
  } catch (error) {
    console.warn("⚠️ Redis cache write error:", error);
  }
}

/**
 * Generate image URL from Pollinations.ai (simple URL method)
 */
export function generateImageUrl(
  prompt: string,
  options: PollinationsOptions = {},
): string {
  // Validate and clean prompt
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt is required and must be a string");
  }

  let cleanPrompt = prompt.trim();
  if (cleanPrompt.length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  // CRITICAL: Limit prompt length to avoid 400 errors
  // Pollinations.ai has URL length limits (~2000 chars)
  // After encoding, prompts should be max 200 chars
  if (cleanPrompt.length > 200) {
    console.warn(
      `⚠️ Prompt too long (${cleanPrompt.length} chars), truncating to 200`,
    );
    cleanPrompt = cleanPrompt.substring(0, 197) + "...";
  }

  const {
    width = 1200,
    height = 630,
    model = "flux", // Use flux as default - most stable model
  } = options;

  const normalizedModel = normalizeModel(model);

  const encodedPrompt = encodeURIComponent(cleanPrompt);

  // Check final URL length
  const baseUrl = `${POLLINATIONS_IMAGE_URL}/${encodedPrompt}`;
  if (baseUrl.length > 1800) {
    console.error(
      `❌ URL too long even after truncation: ${baseUrl.length} chars`,
    );
    // Use a simple fallback prompt
    const fallbackPrompt = "artificial intelligence technology digital art";
    return generateImageUrl(fallbackPrompt, options);
  }

  const params = buildPollinationsParams({
    ...providerOptions,
    width,
    height,
    model: normalizedModel,
  });

  console.log("🎨 Pollinations.ai isteği:", cleanPrompt.substring(0, 100));
  return `${POLLINATIONS_IMAGE_URL}/${encodedPrompt}?${params.toString()}`;
}

/**
 * Fetch image from Pollinations.ai using API endpoint (with auth)
 * This method is preferred when API key is available for better rate limits
 * Includes retry logic with exponential backoff and fallback strategy
 *
 * OPTIMIZED: Reduced retry delays, better rate limit handling
 */
// ============================================
// GEMINI IMAGE GENERATION — Nano Banana (free tier, ~500 images/day)
// Returns data URL (base64) or null on failure
// ============================================
export async function fetchGeminiImage(
  prompt: string,
  options: PollinationsOptions = {},
): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;

  const cleanPrompt =
    prompt.length > 900 ? prompt.substring(0, 897) + "..." : prompt;

  console.log(
    `🤖 Gemini Nano Banana generating: ${cleanPrompt.substring(0, 80)}...`,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cleanPrompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "16:9" },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      imageLog.warn(
        `Gemini ${response.status}: ${errorText.substring(0, 200)}`,
      );
      return null;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
        imageLog.success(
          `Gemini image generated (${Math.round((part.inlineData.data.length * 0.75) / 1024)}KB)`,
        );
        return dataUrl;
      }
    }

    imageLog.warn("Gemini returned no image data");
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") {
      imageLog.warn("Gemini request timed out (30s)");
    } else {
      imageLog.warn(`Gemini error: ${(error as Error).message}`);
    }
    return null;
  }
}

// ============================================
// AI HORDE — Free, unlimited, crowdsourced GPU cluster
// Async: submit → poll → get result (typically 10-30s)
// ============================================
export async function fetchAIHordeImage(
  prompt: string,
  options: PollinationsOptions = {},
): Promise<string | null> {
  const cleanPrompt =
    prompt.length > 500 ? prompt.substring(0, 497) + "..." : prompt;

  imageLog.info(`AI Horde generating: ${cleanPrompt.substring(0, 80)}...`);

  try {
    // Step 1: Submit async generation
    const submitRes = await fetch(`${AI_HORDE_BASE_URL}/generate/async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: AI_HORDE_API_KEY,
        "Client-Agent": "AIHaberleri:v1.0:info@aihaberleri.org",
      },
      body: JSON.stringify({
        prompt: cleanPrompt,
        params: {
          width: 1024,
          height: 576,
          steps: 25,
          cfg_scale: 7.5,
          sampler_name: "k_euler_a",
          n: 1,
          negative_prompt:
            "nsfw, nude, explicit, sexual, " +
            "people, person, human, man, woman, face, body, hands, fingers, " +
            "humanoid, mannequin, figure, portrait, silhouette, " +
            "robot body, android body, cyborg body, robot face, robot head, " +
            "watermark, text, logo, signature, blurry, low quality, deformed",
        },
        nsfw: false,
        censor_nsfw: true,
        models: ["AlbedoBase XL (SDXL)"],
        r2: true,
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => "");
      imageLog.warn(
        `AI Horde submit failed ${submitRes.status}: ${errText.substring(0, 200)}`,
      );
      return null;
    }

    const submitData = await submitRes.json();
    const genId = submitData.id;
    if (!genId) {
      imageLog.warn("AI Horde returned no generation ID");
      return null;
    }

    // Step 2: Poll for completion (max 90s, 3s intervals)
    const maxPolls = 30;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const checkRes = await fetch(
        `${AI_HORDE_BASE_URL}/generate/check/${genId}`,
        {
          headers: { "Client-Agent": "AIHaberleri:v1.0:info@aihaberleri.org" },
        },
      );
      const checkData = await checkRes.json();

      if (checkData.done) {
        // Step 3: Get result
        const statusRes = await fetch(
          `${AI_HORDE_BASE_URL}/generate/status/${genId}`,
          {
            headers: {
              "Client-Agent": "AIHaberleri:v1.0:info@aihaberleri.org",
            },
          },
        );
        const statusData = await statusRes.json();
        const gen = statusData.generations?.[0];

        if (gen?.img) {
          const imgUrl = gen.img.startsWith("http")
            ? gen.img
            : `data:image/webp;base64,${gen.img}`;
          imageLog.success(
            `AI Horde image generated in ${(i + 1) * 3}s (model: ${gen.model || "Deliberate"}, worker: ${gen.worker_name || "unknown"})`,
          );
          return imgUrl;
        }

        imageLog.warn("AI Horde generation completed but no image returned");
        return null;
      }

      // Log progress every 5th poll
      if (i > 0 && i % 5 === 0) {
        imageLog.debug(
          `AI Horde waiting... queue: ${checkData.queue_position || "?"}, eta: ${checkData.wait_time || "?"}s`,
        );
      }
    }

    imageLog.warn("AI Horde timeout (90s) — falling back");
    return null;
  } catch (error) {
    imageLog.warn(`AI Horde error: ${(error as Error).message}`);
    return null;
  }
}

// ============================================
// PAYMENT CIRCUIT BREAKER
// 402 gelince 10 dakika boyunca direkt fallback'e düş, boşa retry yapma
// ============================================
let pollinationsPaymentFailed = false;
let pollinationsPaymentFailedAt = 0;
const PAYMENT_CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function isPollinationsPaymentBlocked(): boolean {
  if (!pollinationsPaymentFailed) return false;
  if (Date.now() - pollinationsPaymentFailedAt > PAYMENT_CIRCUIT_COOLDOWN_MS) {
    pollinationsPaymentFailed = false;
    console.log("🔄 Pollinations payment circuit reset — retrying");
    return false;
  }
  return true;
}

export async function fetchPollinationsImage(
  prompt: string,
  options: PollinationsOptions = {},
  maxRetries = 3,
  requestTimeoutMs = DEFAULT_POLLINATIONS_REQUEST_TIMEOUT_MS,
): Promise<string> {
  const { skipCache = false, ...providerOptions } = options;
  // Validate prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    console.warn("⚠️  Empty prompt received, using fallback");
    prompt =
      "artificial intelligence technology, modern digital art, professional tech illustration, high quality, 4k, no people, no humans";
  }

  // 🚀 CACHE CHECK: Try to get cached image first
  const cachedUrl = skipCache ? null : await getCachedImage(prompt, providerOptions);
  if (cachedUrl) {
    return cachedUrl;
  }

  // 💰 PAYMENT CIRCUIT BREAKER: Skip Pollinations entirely if payment failed recently
  if (isPollinationsPaymentBlocked()) {
    imageLog.warn("Pollinations payment circuit OPEN — skipping to fallback");
  }

  // ============================================
  // PROVIDER 1: AI Horde (free, unlimited, crowdsourced)
  // ============================================
  try {
    const hordeUrl = await fetchAIHordeImage(prompt, options);
    if (hordeUrl) {
      await cacheImageUrl(prompt, hordeUrl, providerOptions);
      return hordeUrl;
    }
  } catch (hordeError) {
    imageLog.warn(`AI Horde failed: ${(hordeError as Error).message}`);
  }

  // ============================================
  // PROVIDER 2: Pollinations (if not payment-blocked)
  // ============================================
  if (isPollinationsPaymentBlocked()) {
    imageLog.warn("Pollinations payment circuit OPEN — skipping");
  }

  // ============================================
  // PROVIDER 2: Pollinations (if not payment-blocked)
  // ============================================
  if (!isPollinationsPaymentBlocked()) {
    // CRITICAL: Ensure no humans in prompt - add strong negative prompt
    let sanitizedPrompt = prompt.trim();

    // Remove any human-related terms that might have slipped through.
    // FIX (2026-02-28): Negative lookbehind (?<![Nn][Oo]\s) preserves "no people",
    // "no humans" etc.  Without this, the regex stripped "people" from "no people"
    // which produced the broken "no , no humans, ..." artifact visible in image URLs.
    const humanPatterns = [
      /(?<![Nn][Oo]\s)\b(person|people|man|woman|human|face|portrait|silhouette|figure|employee|worker|staff)\b/gi,
      /(?<![Nn][Oo]\s)\b(head|hand|arm|leg|body|finger|eye|mouth|profile|businessman|businesswoman)\b/gi,
    ];
    for (const pattern of humanPatterns) {
      sanitizedPrompt = sanitizedPrompt
        .replace(pattern, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Ensure negative prompt is present
    if (
      !sanitizedPrompt.toLowerCase().includes("no people") &&
      !sanitizedPrompt.toLowerCase().includes("no humans")
    ) {
      sanitizedPrompt +=
        ", no people, no humans, no faces, no hands, empty scene";
    }

    const {
      width = 1200,
      height = 630,
      model = "flux", // Use flux as default - most stable model
      allowBackupFallback = true,
    } = options;
    const normalizedModel = normalizeModel(model);

    // Retry loop with exponential backoff (OPTIMIZED: faster retries)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // If we have an API key, use the new authenticated endpoint
        if (POLLINATIONS_API_KEY) {
          console.log(
            `🔑 Pollinations.ai API key ile görsel üretiliyor... (attempt ${attempt}/${maxRetries})`,
          );
          console.log(
            `🔑 API Key exists: ${POLLINATIONS_API_KEY ? "YES" : "NO"}, length: ${POLLINATIONS_API_KEY?.length || 0}`,
          );

          // Truncate prompt to avoid issues - use sanitizedPrompt
          let cleanPrompt = sanitizedPrompt;
          if (cleanPrompt.length > 800) {
            console.warn(
              `⚠️ Prompt too long (${cleanPrompt.length} chars), truncating to 800`,
            );
            cleanPrompt = cleanPrompt.substring(0, 797) + "...";
          }

          const encodedPrompt = encodeURIComponent(cleanPrompt);

          // Build new API URL: https://gen.pollinations.ai/image/{prompt}
          const params = buildPollinationsParams({
            ...providerOptions,
            width,
            height,
            model: normalizedModel,
          });

          const imageUrl = `${POLLINATIONS_GEN_URL}/${encodedPrompt}?${params.toString()}`;

          console.log("📝 Prompt:", cleanPrompt.substring(0, 100));
          console.log(
            "🎨 Authenticated URL:",
            imageUrl.substring(0, 120) + "...",
          );

          // Verify image is accessible with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            requestTimeoutMs,
          );

          try {
            const response = await fetch(imageUrl, {
              headers: {
                Accept: POLLINATIONS_IMAGE_ACCEPT_HEADER,
                Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              console.log(
                "✅ Pollinations.ai görsel başarıyla oluşturuldu (authenticated)",
              );
              // Cache the result for future use
            await cacheImageUrl(sanitizedPrompt, imageUrl, options);
              return imageUrl;
            }

            // OPTIMIZED: Handle 429 rate limit with exponential backoff
            if (response.status === 429 && attempt < maxRetries) {
              const delay = Math.min(2000 * Math.pow(2, attempt - 1), 8000); // Start at 2s, max 8s
              console.warn(
                `⚠️ Rate limit (429), retry ${attempt}/${maxRetries} in ${delay}ms`,
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            // Retry on 502/503/504 (OPTIMIZED: faster retry)
            if (
              (response.status === 502 ||
                response.status === 503 ||
                response.status === 504) &&
              attempt < maxRetries
            ) {
              const delay = Math.min(1500 * Math.pow(2, attempt - 1), 6000); // Start at 1.5s, max 6s
              console.warn(
                `⚠️ Pollinations API ${response.status} (service temporarily down), retry ${attempt}/${maxRetries} in ${delay}ms`,
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            // For 4xx errors, try anonymous fallback
            if (response.status >= 400 && response.status < 500) {
              const errorText = await response.text();
              console.warn(
                `⚠️ Pollinations API ${response.status}: ${errorText.substring(0, 200)}`,
              );

              // 402 = payment required — set circuit breaker, skip all retries
              if (response.status === 402) {
                pollinationsPaymentFailed = true;
                pollinationsPaymentFailedAt = Date.now();
                imageLog.warn(
                  "Pollinations payment circuit OPENED — will skip for 10 minutes",
                );
                break; // Exit retry loop immediately
              }

              imageLog.warn("Trying anonymous fallback...");
              return await fetchPollinationsImageAnonymous(
                sanitizedPrompt,
                options,
                requestTimeoutMs,
              );
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        }

        // No API key, use anonymous method
        return await fetchPollinationsImageAnonymous(
          sanitizedPrompt,
          options,
          requestTimeoutMs,
        );
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          console.error(
            `❌ Pollinations.ai failed after ${maxRetries} attempts:`,
            error,
          );
          if (!allowBackupFallback) {
            throw error;
          }
          // PROVIDER 3: Gemini (paid, last resort before Picsum)
          if (GOOGLE_API_KEY) {
            try {
              const geminiUrl = await fetchGeminiImage(
                sanitizedPrompt,
                options,
              );
              if (geminiUrl) {
                await cacheImageUrl(sanitizedPrompt, geminiUrl);
                return geminiUrl;
              }
            } catch {
              /* fall through to Picsum */
            }
          }
          return await fetchFreeBackupImage(sanitizedPrompt, options);
        }

        // OPTIMIZED: Faster exponential backoff (start at 1s instead of 2s)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000); // 1s, 2s, 4s, max 8s
        console.warn(
          `⚠️ Pollinations.ai error, retry ${attempt}/${maxRetries} in ${delay}ms:`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!allowBackupFallback) {
      throw new Error("Pollinations image generation failed without fallback");
    }

    // PROVIDER 3: Gemini (paid, last resort before Picsum)
    if (GOOGLE_API_KEY) {
      try {
        const geminiUrl = await fetchGeminiImage(sanitizedPrompt, options);
        if (geminiUrl) {
          await cacheImageUrl(sanitizedPrompt, geminiUrl);
          return geminiUrl;
        }
      } catch {
        /* fall through to Picsum */
      }
    }

    return await fetchFreeBackupImage(sanitizedPrompt, options);
  } // end if (!isPollinationsPaymentBlocked)

  // ============================================
  // PROVIDER 3: Gemini (paid, last resort before Picsum)
  // ============================================
  if (GOOGLE_API_KEY) {
    try {
      const geminiUrl = await fetchGeminiImage(prompt, options);
      if (geminiUrl) {
        await cacheImageUrl(prompt, geminiUrl);
        return geminiUrl;
      }
    } catch {
      /* fall through to Picsum */
    }
  }

  // PROVIDER 4: Picsum (random stock photo, last resort)
  return await fetchFreeBackupImage(prompt, options);
}
/**
 * Anonymous fallback for image generation (has rate limits)
 */
async function fetchPollinationsImageAnonymous(
  prompt: string,
  options: PollinationsOptions = {},
  requestTimeoutMs = DEFAULT_POLLINATIONS_REQUEST_TIMEOUT_MS,
): Promise<string> {
  const imageUrl = generateImageUrl(prompt, options);
  console.log("📝 Prompt:", prompt.substring(0, 100));
  console.log("🎨 Pollinations.ai görsel URL:", imageUrl.substring(0, 150));

  // Fetch image to verify it exists with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: POLLINATIONS_IMAGE_ACCEPT_HEADER,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Log the error for debugging
      console.error(
        `❌ Anonymous endpoint failed with status: ${response.status}`,
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return the URL directly (Pollinations.ai provides stable URLs)
    // Cache for future use
    await cacheImageUrl(prompt, imageUrl, options);
    return imageUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Anonymous endpoint error:", error);
    throw error;
  }
}

/**
 * Generate AI image prompt from article content using DeepSeek
 */
export async function generateImagePromptFromArticle(
  title: string,
  content: string,
): Promise<string> {
  // Extract key concepts from title and content
  const text = `${title}\n${content.substring(0, 500)}`;

  // Create a focused prompt for AI news images
  const basePrompt = `professional technology news illustration, modern digital art, high quality, 4k, clean design, tech aesthetic`;

  // Add article-specific keywords
  const keywords = extractKeywords(text);
  const specificPrompt = keywords.length > 0 ? `${keywords.join(", ")}, ` : "";

  return `${specificPrompt}${basePrompt}`;
}

/**
 * Extract keywords from text for image generation
 */
function extractKeywords(text: string): string[] {
  const aiKeywords = [
    "artificial intelligence",
    "AI",
    "machine learning",
    "neural network",
    "deep learning",
    "robot",
    "automation",
    "technology",
    "digital",
    "innovation",
    "future",
    "data",
    "algorithm",
    "computer",
    "software",
  ];

  const turkishKeywords = [
    "yapay zeka",
    "makine öğrenmesi",
    "derin öğrenme",
    "robot",
    "otomasyon",
    "teknoloji",
    "dijital",
    "inovasyon",
    "gelecek",
    "veri",
    "algoritma",
    "bilgisayar",
    "yazılım",
  ];

  const allKeywords = [...aiKeywords, ...turkishKeywords];
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const keyword of allKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword);
      if (found.length >= 3) break; // Limit to 3 keywords
    }
  }

  return found;
}

/**
 * Generate image for AI news article
 */
export async function generateAINewsImage(
  title: string,
  content: string,
): Promise<string> {
  try {
    console.log("🎨 AI haber görseli oluşturuluyor...");

    // Generate prompt from article
    const prompt = await generateImagePromptFromArticle(title, content);
    console.log("📝 Görsel prompt:", prompt);

    // Fetch image from Pollinations.ai
    const imageUrl = await fetchPollinationsImage(prompt, {
      width: 1200,
      height: 630,
      model: "flux",
      enhance: true,
    });

    console.log("✅ Görsel başarıyla oluşturuldu:", imageUrl.substring(0, 100));
    return imageUrl;
  } catch (error) {
    console.error("❌ Görsel oluşturma hatası:", error);
    // Fallback to a default tech image
    return generateImageUrl("artificial intelligence technology digital art", {
      width: 1200,
      height: 630,
      model: "flux",
    });
  }
}

/**
 * Check Pollinations.ai API balance (if authenticated)
 */
export async function checkPollinationsBalance(): Promise<number | null> {
  if (!POLLINATIONS_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      "https://gen.pollinations.ai/account/balance",
      {
        headers: {
          Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`🌸 Pollinations.ai Pollen Balance: ${data.balance}`);
      return data.balance;
    }
    return null;
  } catch {
    return null;
  }
}
