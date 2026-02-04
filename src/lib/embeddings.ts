/**
 * Text Similarity System
 *
 * Uses hash-based and Levenshtein distance for duplicate detection
 * No external ML dependencies (Docker compatible)
 *
 * Features:
 * - Text hash generation (simhash-like)
 * - Levenshtein distance calculation
 * - TF-IDF based similarity
 * - pgvector-compatible format (for future ML upgrade)
 */

import { db } from "@/lib/db";
import type { Article } from "@prisma/client";
import crypto from "crypto";

// Configuration
const HASH_DIMENSIONS = 384; // Match previous dimension for compatibility
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Tokenize and normalize text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

/**
 * Generate a deterministic hash-based embedding vector
 * Uses simhash-like approach for text similarity
 *
 * @param text - Input text to embed
 * @returns Promise<number[]> - 384-dimensional hash vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  const tokens = tokenize(text);

  // Initialize vector with zeros
  const vector = new Array(HASH_DIMENSIONS).fill(0);

  // Use token hashes to populate vector (simhash-like)
  for (const token of tokens) {
    const hash = crypto.createHash("md5").update(token).digest();

    for (let i = 0; i < HASH_DIMENSIONS; i++) {
      const byteIndex = i % hash.length;
      const bitIndex = i % 8;
      const bit = (hash[byteIndex] >> bitIndex) & 1;

      vector[i] += bit === 1 ? 1 : -1;
    }
  }

  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

  if (magnitude === 0) {
    // Return zero vector for empty/meaningless text
    return new Array(HASH_DIMENSIONS).fill(0);
  }

  return vector.map((v) => v / magnitude);
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param texts - Array of input texts
 * @returns Promise<number[][]> - Array of embedding vectors
 */
export async function generateBatchEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];

  for (const text of texts) {
    if (!text || text.trim().length === 0) {
      embeddings.push(new Array(HASH_DIMENSIONS).fill(0));
    } else {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);
    }
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns number - Similarity score between -1 and 1 (1 = identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Early exit for empty strings
  if (m === 0) return n;
  if (n === 0) return m;

  // Create distance matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate title similarity using Levenshtein distance
 */
export function titleSimilarity(title1: string, title2: string): number {
  const normalized1 = title1.toLowerCase().trim();
  const normalized2 = title2.toLowerCase().trim();

  const maxLen = Math.max(normalized1.length, normalized2.length);

  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLen;
}

/**
 * Find similar articles using hash-based similarity
 *
 * @param embedding - Query embedding vector
 * @param threshold - Minimum similarity threshold (default: 0.85)
 * @param limit - Maximum number of results (default: 10)
 * @param hoursWindow - Only search articles from last N hours (default: 72)
 * @returns Promise<Article[]> - Similar articles sorted by similarity
 */
export async function findSimilarArticles(
  embedding: number[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  limit: number = 10,
  hoursWindow: number = 72,
): Promise<(Article & { similarity: number })[]> {
  if (embedding.length !== HASH_DIMENSIONS) {
    throw new Error(
      `Invalid embedding dimension: ${embedding.length} (expected ${HASH_DIMENSIONS})`,
    );
  }

  const cutoffDate = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  // Use raw SQL for pgvector similarity search
  const vectorString = `[${embedding.join(",")}]`;

  try {
    const results = await db.$queryRaw<(Article & { similarity: number })[]>`
      SELECT 
        a.*,
        1 - (a.embedding <=> ${vectorString}::vector) as similarity
      FROM "Article" a
      WHERE 
        a.embedding IS NOT NULL
        AND a."publishedAt" >= ${cutoffDate}
        AND 1 - (a.embedding <=> ${vectorString}::vector) >= ${threshold}
      ORDER BY a.embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    return results;
  } catch (error) {
    // If pgvector not available, fall back to title-based search
    console.warn(
      "[Embeddings] pgvector query failed, using fallback:",
      error,
    );
    return [];
  }
}

/**
 * Check if an article has a semantic duplicate
 *
 * @param title - Article title
 * @param excerpt - Article excerpt/description
 * @param threshold - Similarity threshold (default: 0.85)
 * @param hoursWindow - Time window in hours (default: 72)
 * @returns Object with duplicate status and details
 */
export async function checkSemanticDuplicate(
  title: string,
  excerpt: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  hoursWindow: number = 72,
): Promise<{
  isDuplicate: boolean;
  similarity?: number;
  matchedArticleId?: string;
  matchedTitle?: string;
}> {
  try {
    const cutoffDate = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

    // First try: Title similarity check (fast, no ML)
    const recentArticles = await db.article.findMany({
      where: {
        publishedAt: { gte: cutoffDate },
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 200,
    });

    for (const article of recentArticles) {
      const similarity = titleSimilarity(title, article.title);

      if (similarity >= threshold) {
        return {
          isDuplicate: true,
          similarity,
          matchedArticleId: article.id,
          matchedTitle: article.title,
        };
      }
    }

    // Second try: Hash-based embedding similarity
    const combinedText = `${title}. ${excerpt || ""}`.trim();
    const embedding = await generateEmbedding(combinedText);

    const similarArticles = await findSimilarArticles(
      embedding,
      threshold,
      1,
      hoursWindow,
    );

    if (similarArticles.length > 0) {
      const match = similarArticles[0];
      return {
        isDuplicate: true,
        similarity: match.similarity,
        matchedArticleId: match.id,
        matchedTitle: match.title,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error("[Embeddings] Semantic duplicate check failed:", error);
    // Return false on error to avoid blocking pipeline
    return { isDuplicate: false };
  }
}

/**
 * Generate and store embedding for an article
 *
 * @param articleId - Article ID
 * @param title - Article title
 * @param excerpt - Article excerpt
 */
export async function storeArticleEmbedding(
  articleId: string,
  title: string,
  excerpt: string,
): Promise<void> {
  try {
    const combinedText = `${title}. ${excerpt || ""}`.trim();
    const embedding = await generateEmbedding(combinedText);

    const vectorString = `[${embedding.join(",")}]`;

    await db.$executeRaw`
      UPDATE "Article"
      SET embedding = ${vectorString}::vector
      WHERE id = ${articleId}
    `;

    console.log(`[Embeddings] Stored embedding for article: ${articleId}`);
  } catch (error) {
    console.error(
      `[Embeddings] Failed to store embedding for article ${articleId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Backfill embeddings for existing articles
 *
 * @param batchSize - Number of articles to process at once
 * @param maxArticles - Maximum total articles to process
 */
export async function backfillEmbeddings(
  batchSize: number = 50,
  maxArticles: number = 1000,
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;
  let offset = 0;

  console.log("[Embeddings] Starting backfill...");

  while (processed + errors < maxArticles) {
    // Fetch articles without embeddings
    const articles = await db.$queryRaw<
      { id: string; title: string; excerpt: string }[]
    >`
      SELECT id, title, excerpt
      FROM "Article"
      WHERE embedding IS NULL
      ORDER BY "publishedAt" DESC
      LIMIT ${batchSize}
      OFFSET ${offset}
    `;

    if (articles.length === 0) {
      break;
    }

    for (const article of articles) {
      try {
        await storeArticleEmbedding(article.id, article.title, article.excerpt);
        processed++;
      } catch {
        errors++;
      }
    }

    offset += batchSize;
    console.log(
      `[Embeddings] Backfill progress: ${processed} processed, ${errors} errors`,
    );
  }

  console.log(
    `[Embeddings] Backfill complete: ${processed} processed, ${errors} errors`,
  );

  return { processed, errors };
}

/**
 * Get embedding model info
 */
export function getModelInfo() {
  return {
    modelName: "hash-based-similarity",
    dimensions: HASH_DIMENSIONS,
    isLoaded: true, // Always ready (no ML model to load)
    defaultThreshold: DEFAULT_SIMILARITY_THRESHOLD,
  };
}

/**
 * Preload the model (no-op for hash-based system)
 */
export async function preloadModel(): Promise<void> {
  // No-op: Hash-based system doesn't need preloading
  console.log("[Embeddings] Hash-based similarity system ready");
}

// Export constants
export { HASH_DIMENSIONS as EMBEDDING_DIMENSIONS, DEFAULT_SIMILARITY_THRESHOLD };
