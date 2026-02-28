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

interface PollinationsOptions {
  width?: number;
  height?: number;
  seed?: number;
  model?:
    | "kontext"
    | "turbo"
    | "nanobanana"
    | "nanobanana-pro"
    | "seedream"
    | "flux"
    | "gptimage";
  enhance?: boolean;
  nologo?: boolean;
}

// API Configuration
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt"; // Legacy anonymous endpoint
const POLLINATIONS_GEN_URL = "https://gen.pollinations.ai/image"; // New authenticated endpoint
const UNSPLASH_SOURCE_URL = "https://source.unsplash.com";
const PICSUM_URL = "https://picsum.photos";

// Cache Configuration
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const CACHE_KEY_PREFIX = "pollinations:image:";

/**
 * Generate cache key from prompt using SHA-256 hash
 */
function generateCacheKey(prompt: string): string {
  return `${CACHE_KEY_PREFIX}${createHash("sha256").update(prompt).digest("hex")}`;
}

function buildQueryFromPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 6);

  if (words.length === 0) {
    return "artificial,intelligence,technology";
  }

  return words.join(",");
}

async function canFetchImage(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchFreeBackupImage(
  prompt: string,
  options: PollinationsOptions = {},
): Promise<string> {
  const { width = 1200, height = 630 } = options;
  const query = buildQueryFromPrompt(prompt);

  const unsplashUrl = `${UNSPLASH_SOURCE_URL}/${width}x${height}/?${encodeURIComponent(query)}`;
  if (await canFetchImage(unsplashUrl)) {
    console.warn(
      "⚠️ Pollinations başarısız, Unsplash Source fallback kullanılıyor",
    );
    return unsplashUrl;
  }

  const seed = createHash("md5").update(prompt).digest("hex").slice(0, 12);
  const picsumUrl = `${PICSUM_URL}/seed/${seed}/${width}/${height}`;
  console.warn("⚠️ Unsplash başarısız, Picsum fallback kullanılıyor");
  return picsumUrl;
}

/**
 * Get cached image URL from Redis
 */
async function getCachedImage(prompt: string): Promise<string | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;

    const cacheKey = generateCacheKey(prompt);
    const cachedUrl = await redis.get(cacheKey);

    if (cachedUrl) {
      console.log("🎯 Cache HIT for prompt:", prompt.substring(0, 50) + "...");
      return cachedUrl;
    }

    console.log("🎯 Cache MISS for prompt:", prompt.substring(0, 50) + "...");
    return null;
  } catch (error) {
    console.warn("⚠️ Redis cache read error:", error);
    return null;
  }
}

/**
 * Cache image URL in Redis with 7-day TTL
 */
async function cacheImageUrl(prompt: string, imageUrl: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const cacheKey = generateCacheKey(prompt);
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, imageUrl);
    console.log("💾 Image cached for 7 days");
  } catch (error) {
    console.warn("⚠️ Redis cache write error:", error);
    // Don't fail if caching fails
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
    seed,
    model = "flux", // Use flux as default - most stable model
    enhance = true,
  } = options;

  // Validate model - updated with actual API supported models from gen.pollinations.ai
  const validModels = [
    "kontext",
    "turbo",
    "nanobanana",
    "nanobanana-pro",
    "seedream",
    "seedream-pro",
    "gptimage",
    "gptimage-large",
    "flux",
    "zimage",
    "veo",
    "seedance",
    "seedance-pro",
    "wan",
    "klein",
    "klein-large",
    "gpt-image",
    "gpt-image-1-mini",
    "gpt-image-1.5",
    "gpt-image-large",
    "z-image",
    "z-image-turbo",
    "veo-3.1-fast",
    "video",
    "wan2.6",
    "wan-i2v",
    "flux-klein",
    "flux-klein-9b",
    "klein-9b",
  ];

  if (model && !validModels.includes(model)) {
    console.warn(`⚠️ Invalid model "${model}", falling back to "flux"`);
    options.model = "flux";
  }

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

  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString(),
    model,
    enhance: enhance.toString(),
  });

  if (seed) {
    params.append("seed", seed.toString());
  }

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
export async function fetchPollinationsImage(
  prompt: string,
  options: PollinationsOptions = {},
  maxRetries = 3,
): Promise<string> {
  // Validate prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    console.warn("⚠️  Empty prompt received, using fallback");
    prompt =
      "artificial intelligence technology, modern digital art, professional tech illustration, high quality, 4k, no people, no humans";
  }

  // 🚀 CACHE CHECK: Try to get cached image first
  const cachedUrl = await getCachedImage(prompt);
  if (cachedUrl) {
    return cachedUrl;
  }

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
    seed,
    model = "flux", // Use flux as default - most stable model
    enhance = true,
  } = options;

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
        const params = new URLSearchParams({
          width: width.toString(),
          height: height.toString(),
          model,
          enhance: enhance.toString(),
        });

        if (seed) {
          params.append("seed", seed.toString());
        }

        const imageUrl = `${POLLINATIONS_GEN_URL}/${encodedPrompt}?${params.toString()}`;

        console.log("📝 Prompt:", cleanPrompt.substring(0, 100));
        console.log(
          "🎨 Authenticated URL:",
          imageUrl.substring(0, 120) + "...",
        );

        // Verify image is accessible with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s timeout

        try {
          const response = await fetch(imageUrl, {
            headers: {
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
            await cacheImageUrl(sanitizedPrompt, imageUrl);
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
            console.warn(`⚠️ Trying anonymous fallback...`);
            return await fetchPollinationsImageAnonymous(
              sanitizedPrompt,
              options,
            );
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }

      // No API key, use anonymous method
      return await fetchPollinationsImageAnonymous(sanitizedPrompt, options);
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        console.error(
          `❌ Pollinations.ai failed after ${maxRetries} attempts:`,
          error,
        );
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

  return await fetchFreeBackupImage(sanitizedPrompt, options);
}

/**
 * Anonymous fallback for image generation (has rate limits)
 */
async function fetchPollinationsImageAnonymous(
  prompt: string,
  options: PollinationsOptions = {},
): Promise<string> {
  const imageUrl = generateImageUrl(prompt, options);
  console.log("📝 Prompt:", prompt.substring(0, 100));
  console.log("🎨 Pollinations.ai görsel URL:", imageUrl.substring(0, 150));

  // Fetch image to verify it exists with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s timeout - Pollinations can be VERY slow (increased from 120s)

  try {
    const response = await fetch(imageUrl, {
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
    await cacheImageUrl(prompt, imageUrl);
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
