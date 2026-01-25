/**
 * Pollinations.ai - Free AI Image Generation Service
 * https://pollinations.ai/
 */

interface PollinationsOptions {
  width?: number;
  height?: number;
  nologo?: boolean;
  seed?: number;
  model?: "flux" | "flux-realism" | "flux-anime" | "flux-3d" | "turbo";
  enhance?: boolean;
}

/**
 * Generate image URL from Pollinations.ai
 */
export function generateImageUrl(
  prompt: string,
  options: PollinationsOptions = {},
): string {
  // Validate and clean prompt
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt is required and must be a string");
  }

  const cleanPrompt = prompt.trim();
  if (cleanPrompt.length === 0) {
    throw new Error("Prompt cannot be empty");
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

  console.log("🎨 Pollinations.ai isteği:", cleanPrompt.substring(0, 100));
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
}

/**
 * Fetch image from Pollinations.ai and return as blob
 */
export async function fetchPollinationsImage(
  prompt: string,
  options: PollinationsOptions = {},
): Promise<string> {
  try {
    // Validate prompt
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      console.warn("⚠️  Empty prompt received, using fallback");
      prompt =
        "artificial intelligence technology, modern digital art, professional tech illustration, high quality, 4k";
    }

    const imageUrl = generateImageUrl(prompt, options);
    console.log("📝 Prompt:", prompt.substring(0, 100));
    console.log("🎨 Pollinations.ai görsel URL:", imageUrl.substring(0, 150));

    // Fetch image to verify it exists
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return the URL directly (Pollinations.ai provides stable URLs)
    return imageUrl;
  } catch (error) {
    console.error("❌ Pollinations.ai görsel hatası:", error);
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
      model: "flux-realism",
      enhance: true,
      nologo: true,
    });

    console.log("✅ Görsel başarıyla oluşturuldu:", imageUrl);
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
