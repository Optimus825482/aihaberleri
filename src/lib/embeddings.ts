/**
 * Vector Embeddings System
 *
 * Uses @xenova/transformers for browser-compatible embeddings
 * Model: all-MiniLM-L6-v2 (384 dimensions)
 *
 * Features:
 * - Singleton model caching
 * - Batch embedding support
 * - Cosine similarity calculation
 * - pgvector integration for semantic search
 */

import { pipeline, env } from "@xenova/transformers";
import { db } from "@/lib/db";
import type { Article } from "@prisma/client";

// Configure transformers.js for server-side usage
env.useBrowserCache = false;
env.allowLocalModels = false;

// Model configuration
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

// Singleton model instance - use 'any' to avoid type conflicts with transformers.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelLoadingPromise: Promise<any> | null = null;

/**
 * Get or initialize the embedding model (singleton pattern)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEmbeddingModel(): Promise<any> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // Prevent multiple concurrent model loads
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    console.log("[Embeddings] Loading model:", MODEL_NAME);
    const startTime = Date.now();

    embeddingPipeline = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true, // Use quantized model for faster inference
    });

    const loadTime = Date.now() - startTime;
    console.log(`[Embeddings] Model loaded in ${loadTime}ms`);

    return embeddingPipeline;
  })();

  return modelLoadingPromise;
}

/**
 * Generate embedding for a single text
 *
 * @param text - Input text to embed
 * @returns Promise<number[]> - 384-dimensional embedding vector
 *
 * @example
 * const embedding = await generateEmbedding("AI revolutionizes healthcare");
 * console.log(embedding.length); // 384
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  const model = await getEmbeddingModel();

  // Truncate text to prevent token overflow (max ~512 tokens)
  const truncatedText = text.slice(0, 2000);

  const output = await model(truncatedText, {
    pooling: "mean",
    normalize: true,
  });

  // Convert Float32Array to regular array
  const embedding = Array.from(output.data as Float32Array);

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding dimension: ${embedding.length} (expected ${EMBEDDING_DIMENSIONS})`,
    );
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param texts - Array of input texts
 * @returns Promise<number[][]> - Array of 384-dimensional embedding vectors
 *
 * @example
 * const embeddings = await generateBatchEmbeddings([
 *   "OpenAI releases GPT-5",
 *   "Google announces Gemini 2"
 * ]);
 */
export async function generateBatchEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const model = await getEmbeddingModel();
  const embeddings: number[][] = [];

  // Process in batches of 32 for memory efficiency
  const batchSize = 32;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Process batch concurrently
    const batchEmbeddings = await Promise.all(
      batch.map(async (text) => {
        if (!text || text.trim().length === 0) {
          // Return zero vector for empty texts
          return new Array(EMBEDDING_DIMENSIONS).fill(0);
        }

        const truncatedText = text.slice(0, 2000);
        const output = await model(truncatedText, {
          pooling: "mean",
          normalize: true,
        });

        return Array.from(output.data as Float32Array);
      }),
    );

    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns number - Similarity score between -1 and 1 (1 = identical)
 *
 * @example
 * const similarity = cosineSimilarity(embedding1, embedding2);
 * if (similarity > 0.9) console.log("Very similar!");
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
 * Find similar articles using pgvector similarity search
 *
 * @param embedding - Query embedding vector
 * @param threshold - Minimum similarity threshold (default: 0.85)
 * @param limit - Maximum number of results (default: 10)
 * @param hoursWindow - Only search articles from last N hours (default: 72)
 * @returns Promise<Article[]> - Similar articles sorted by similarity
 *
 * @example
 * const embedding = await generateEmbedding("OpenAI GPT-5 announcement");
 * const similar = await findSimilarArticles(embedding, 0.9);
 */
export async function findSimilarArticles(
  embedding: number[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  limit: number = 10,
  hoursWindow: number = 72,
): Promise<(Article & { similarity: number })[]> {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding dimension: ${embedding.length} (expected ${EMBEDDING_DIMENSIONS})`,
    );
  }

  const cutoffDate = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  // Use raw SQL for pgvector similarity search
  const vectorString = `[${embedding.join(",")}]`;

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
    // Combine title and excerpt for better semantic matching
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
    modelName: MODEL_NAME,
    dimensions: EMBEDDING_DIMENSIONS,
    isLoaded: embeddingPipeline !== null,
    defaultThreshold: DEFAULT_SIMILARITY_THRESHOLD,
  };
}

/**
 * Preload the model (call during app initialization)
 */
export async function preloadModel(): Promise<void> {
  await getEmbeddingModel();
}

// Export constants
export { EMBEDDING_DIMENSIONS, DEFAULT_SIMILARITY_THRESHOLD };
