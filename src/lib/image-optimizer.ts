/**
 * Image Optimizer Service
 * Generates multiple sizes with WebP conversion for optimal performance
 * Supports local storage + Cloudflare R2 with automatic fallback
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Image size configurations
export const IMAGE_SIZES = {
  large: { width: 1200, quality: 85, suffix: "large" },
  medium: { width: 800, quality: 85, suffix: "medium" },
  small: { width: 400, quality: 85, suffix: "small" },
  thumb: { width: 200, quality: 80, suffix: "thumb" },
} as const;

export interface ImageSizes {
  large: string;
  medium: string;
  small: string;
  thumb: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  storage: "local" | "r2";
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    console.log(`📥 Downloading image from: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("❌ Image download error:", error);
    throw new Error(
      `Image download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Save buffer to local storage (/public/images/)
 */
async function saveToLocal(buffer: Buffer, filename: string): Promise<string> {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");

    // Ensure directory exists
    await fs.mkdir(imagesDir, { recursive: true });

    const filePath = path.join(imagesDir, filename);
    await fs.writeFile(filePath, buffer);

    // Return public URL (relative to public/)
    return `/images/${filename}`;
  } catch (error) {
    console.error("❌ Local save error:", error);
    throw new Error(
      `Failed to save image locally: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Upload to Cloudflare R2 (if configured)
 * Requires: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 */
async function uploadToR2(buffer: Buffer, key: string): Promise<UploadResult> {
  const {
    R2_ENDPOINT,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  } = process.env;

  // Check if R2 is configured
  if (
    !R2_ENDPOINT ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET
  ) {
    return {
      success: false,
      error: "R2 not configured",
      storage: "local",
    };
  }

  try {
    // Use AWS SDK v3 if available, otherwise skip R2
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

    const client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable", // 1 year cache
      }),
    );

    // Return public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
      : `${R2_ENDPOINT.replace(/\/$/, "")}/${R2_BUCKET}/${key}`;

    console.log(`✅ Uploaded to R2: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      storage: "r2",
    };
  } catch (error) {
    console.error("❌ R2 upload error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "R2 upload failed (unknown)",
      storage: "local",
    };
  }
}

/**
 * Upload image buffer with automatic fallback (R2 → Local)
 */
async function uploadImage(buffer: Buffer, key: string): Promise<string> {
  // Try R2 first (if configured)
  const r2Result = await uploadToR2(buffer, key);
  if (r2Result.success && r2Result.url) {
    return r2Result.url;
  }

  // Fallback to local storage
  console.log("⚠️  R2 unavailable, using local storage");
  const filename = key.split("/").pop() || key;
  return saveToLocal(buffer, filename);
}

/**
 * Generate multiple sizes from original image with WebP conversion
 */
async function generateImageSizes(
  originalBuffer: Buffer,
  slug: string,
): Promise<ImageSizes> {
  console.log(`🎨 Generating 4 image sizes for: ${slug}`);

  const results: Partial<ImageSizes> = {};

  try {
    // Process each size
    for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
      const key = `${slug}-${config.suffix}.webp`;

      try {
        // Resize and convert to WebP
        const processedBuffer = await sharp(originalBuffer)
          .resize(config.width, null, {
            // Auto height to maintain aspect ratio
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: config.quality })
          .toBuffer();

        // Upload with fallback
        const url = await uploadImage(processedBuffer, key);
        results[sizeName as keyof ImageSizes] = url;

        console.log(
          `  ✅ ${sizeName}: ${(processedBuffer.length / 1024).toFixed(1)}KB → ${url}`,
        );
      } catch (error) {
        console.error(`  ❌ Failed to generate ${sizeName}:`, error);
        throw error;
      }
    }

    // Ensure all sizes are present
    if (!results.large || !results.medium || !results.small || !results.thumb) {
      throw new Error("Not all image sizes were generated");
    }

    return results as ImageSizes;
  } catch (error) {
    console.error("❌ Image size generation failed:", error);
    throw error;
  }
}

/**
 * Main function: Download, optimize, and generate multiple sizes
 * @param imageUrl - Original image URL from Pollinations or other source
 * @param slug - Article slug for filename generation
 * @returns Object with URLs for all 4 sizes
 */
export async function optimizeAndGenerateSizes(
  imageUrl: string,
  slug: string,
): Promise<ImageSizes> {
  console.log(`\n🖼️  Image Optimization Pipeline Started`);
  console.log(`   Source: ${imageUrl}`);
  console.log(`   Slug: ${slug}`);

  try {
    // Step 1: Download original image
    const startTime = Date.now();
    const originalBuffer = await downloadImage(imageUrl);
    const downloadTime = Date.now() - startTime;

    // Get original metadata
    const metadata = await sharp(originalBuffer).metadata();
    const originalSize = originalBuffer.length;

    console.log(`\n📊 Original Image:`);
    console.log(`   Format: ${metadata.format}`);
    console.log(`   Size: ${metadata.width}x${metadata.height}`);
    console.log(`   File Size: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log(`   Download Time: ${downloadTime}ms`);

    // Step 2: Generate all sizes with WebP conversion
    const optimizationStart = Date.now();
    const sizes = await generateImageSizes(originalBuffer, slug);
    const optimizationTime = Date.now() - optimizationStart;

    console.log(`\n✅ Optimization Complete!`);
    console.log(`   Total Time: ${downloadTime + optimizationTime}ms`);
    console.log(
      `   Storage: ${sizes.large.includes("/images/") ? "Local (/public/images)" : "Cloudflare R2"}`,
    );

    return sizes;
  } catch (error) {
    console.error("\n❌ Image optimization failed:", error);

    // Return fallback: original URL for all sizes
    console.log("⚠️  Using original image URL as fallback for all sizes");
    return {
      large: imageUrl,
      medium: imageUrl,
      small: imageUrl,
      thumb: imageUrl,
    };
  }
}

/**
 * Validate image URL before processing
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.protocol === "http:" || urlObj.protocol === "https:") &&
      /\.(jpg|jpeg|png|webp|gif)$/i.test(urlObj.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Generate hash for cache busting
 */
export function generateImageHash(slug: string): string {
  return crypto
    .createHash("md5")
    .update(slug + Date.now())
    .digest("hex")
    .substring(0, 8);
}

/**
 * Estimate bandwidth savings from WebP conversion
 */
export function estimateBandwidthSavings(originalSizeKB: number): {
  optimizedSizeKB: number;
  savingsPercent: number;
  savingsKB: number;
} {
  // WebP typically achieves 75-80% reduction for photos
  const savingsPercent = 75;
  const optimizedSizeKB = originalSizeKB * (1 - savingsPercent / 100);
  const savingsKB = originalSizeKB - optimizedSizeKB;

  return {
    optimizedSizeKB: Math.round(optimizedSizeKB),
    savingsPercent,
    savingsKB: Math.round(savingsKB),
  };
}

/**
 * Clean up old images from local storage (optional maintenance function)
 */
export async function cleanupOldImages(daysOld: number = 30): Promise<number> {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    const files = await fs.readdir(imagesDir);
    let deletedCount = 0;

    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtimeMs < cutoffTime) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    console.log(`🗑️  Cleaned up ${deletedCount} old images (>${daysOld} days)`);
    return deletedCount;
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    return 0;
  }
}

export default {
  optimizeAndGenerateSizes,
  isValidImageUrl,
  generateImageHash,
  estimateBandwidthSavings,
  cleanupOldImages,
  IMAGE_SIZES,
};
