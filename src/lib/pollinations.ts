/**
 * Pollinations.ai - AI Image Generation Service
 * https://pollinations.ai/
 *
 * Supports both anonymous and authenticated usage.
 * Set POLLINATIONS_API_KEY for higher rate limits.
 */

interface PollinationsOptions {
  width?: number;
  height?: number;
  nologo?: boolean;
  seed?: number;
  model?: "flux" | "flux-realism" | "flux-anime" | "flux-3d" | "turbo";
  enhance?: boolean;
}

// API Configuration
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt";
const POLLINATIONS_GEN_URL = "https://gen.pollinations.ai/image";

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
    nologo = true,
    seed,
    model = "flux-realism",
    enhance = true,
  } = options;

  // Validate model
  if (
    model &&
    !["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"].includes(model)
  ) {
    throw new Error(
      "Invalid model. Choose from: flux, flux-realism, flux-anime, flux-3d, turbo",
    );
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
    nologo: nologo.toString(),
    model,
    enhance: enhance.toString(),
  });

  if (seed) {
    params.append("seed", seed.toString());
  }

  // Add API key if available
  if (POLLINATIONS_API_KEY) {
    params.append("key", POLLINATIONS_API_KEY);
  }

  console.log("🎨 Pollinations.ai isteği:", cleanPrompt.substring(0, 100));
  return `${POLLINATIONS_IMAGE_URL}/${encodedPrompt}?${params.toString()}`;
}

/**
 * Fetch image from Pollinations.ai using API endpoint (with auth)
 * This method is preferred when API key is available for better rate limits
 * Includes retry logic with exponential backoff and fallback strategy
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
      "artificial intelligence technology, modern digital art, professional tech illustration, high quality, 4k";
  }

  const {
    width = 1200,
    height = 630,
    nologo = true,
    seed,
    model = "flux-realism",
    enhance = true,
  } = options;

  // Retry loop with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // If we have an API key, use the authenticated endpoint for better rate limits
      if (POLLINATIONS_API_KEY) {
        console.log(
          `🔑 Pollinations.ai API key ile görsel üretiliyor... (attempt ${attempt}/${maxRetries})`,
        );

        // Truncate prompt to avoid 400 errors (URL length limits)
        let cleanPrompt = prompt.trim();
        if (cleanPrompt.length > 800) {
          console.warn(
            `⚠️ Prompt too long (${cleanPrompt.length} chars), truncating to 800 for API`,
          );
          cleanPrompt = cleanPrompt.substring(0, 797) + "...";
        }
        const encodedPrompt = encodeURIComponent(cleanPrompt);
        const params = new URLSearchParams({
          width: width.toString(),
          height: height.toString(),
          nologo: nologo.toString(),
          model,
          enhance: enhance.toString(),
          key: POLLINATIONS_API_KEY,
        });

        if (seed) {
          params.append("seed", seed.toString());
        }

        const imageUrl = `${POLLINATIONS_IMAGE_URL}/${encodedPrompt}?${params.toString()}`;

        console.log("📝 Prompt:", prompt.substring(0, 100));
        console.log(
          "🎨 Authenticated URL (key=***)",
          imageUrl.substring(0, 120) + "...",
        );

        // Verify image is accessible with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
          const response = await fetch(imageUrl, {
            headers: {
              Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            console.log("✅ Pollinations.ai görsel başarıyla oluşturuldu");
            return imageUrl;
          }

          // Retry on 502/503, not on 400/404
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.warn(
              `⚠️ Pollinations API ${response.status}, retry ${attempt}/${maxRetries} in ${delay}ms`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // For 4xx errors, try anonymous fallback immediately
          if (response.status >= 400 && response.status < 500) {
            console.warn(
              `⚠️ Pollinations API ${response.status}, trying anonymous fallback`,
            );
            return await fetchPollinationsImageAnonymous(prompt, options);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }

      // No API key, use anonymous method
      return await fetchPollinationsImageAnonymous(prompt, options);
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        console.error(
          `❌ Pollinations.ai failed after ${maxRetries} attempts:`,
          error,
        );
        // Return fallback image
        return getFallbackImage();
      }

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.warn(
        `⚠️ Pollinations.ai error, retry ${attempt}/${maxRetries} in ${delay}ms:`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but return fallback just in case
  return getFallbackImage();
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
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return the URL directly (Pollinations.ai provides stable URLs)
    return imageUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get fallback image when Pollinations.ai fails
 */
function getFallbackImage(): string {
  // Return a generic AI news placeholder
  // You can replace this with a static image in /public/images/
  const fallbackPrompt = "artificial intelligence technology digital art";
  return generateImageUrl(fallbackPrompt, {
    width: 1200,
    height: 630,
    model: "flux-realism",
    nologo: true,
  });
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
      model: "flux-realism",
      enhance: true,
      nologo: true,
    });

    console.log("✅ Görsel başarıyla oluşturuldu:", imageUrl.substring(0, 100));
    return imageUrl;
  } catch (error) {
    console.error("❌ Görsel oluşturma hatası:", error);
    // Fallback to a default tech image
    return generateImageUrl("artificial intelligence technology digital art", {
      width: 1200,
      height: 630,
      model: "flux-realism",
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
