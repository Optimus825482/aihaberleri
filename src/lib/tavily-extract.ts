/**
 * Tavily Extract API Integration
 *
 * Extracts content from specific URLs with semantic chunking.
 * Use for RSS feed processing and targeted content extraction.
 *
 * Credit Cost: 1 credit per URL
 * Response Time: 2-5 seconds
 * Max URLs per request: 20
 */

import axios from "axios";

const TAVILY_API_URL = "https://api.tavily.com/extract";
const MAX_URLS_PER_BATCH = 20;

export interface ExtractResult {
  url: string;
  content: string;
  rawContent: string;
  failed: boolean;
  error?: string;
  chunks?: string[];
}

export interface ExtractOptions {
  query?: string;
  chunksPerSource?: number;
  extractDepth?: "basic" | "advanced";
  includeRawContent?: boolean;
}

/**
 * Extract content from a single URL
 *
 * @param url - URL to extract content from
 * @param options - Extraction configuration options
 * @returns Extracted content result
 *
 * @example
 * ```typescript
 * const result = await extractUrl(
 *   "https://example.com/article",
 *   { query: "AI news", chunksPerSource: 3 }
 * );
 * console.log(result.content);
 * ```
 */
export async function extractUrl(
  url: string,
  options: ExtractOptions = {},
): Promise<ExtractResult> {
  const results = await batchExtract([url], options);
  return results[0];
}

/**
 * Extract content from multiple URLs in batch
 *
 * @param urls - Array of URLs to extract (max 20 per batch)
 * @param options - Extraction configuration options
 * @returns Array of extraction results
 *
 * @example
 * ```typescript
 * const urls = [
 *   "https://example.com/article1",
 *   "https://example.com/article2",
 * ];
 *
 * const results = await batchExtract(urls, {
 *   query: "AI breakthroughs",
 *   chunksPerSource: 3,
 *   extractDepth: "basic"
 * });
 *
 * const successful = results.filter(r => !r.failed);
 * ```
 */
export async function batchExtract(
  urls: string[],
  options: ExtractOptions = {},
): Promise<ExtractResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const {
    query,
    chunksPerSource = 3,
    extractDepth = "basic",
    includeRawContent = true,
  } = options;

  // Split into batches of 20 (API limit)
  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_BATCH) {
    batches.push(urls.slice(i, i + MAX_URLS_PER_BATCH));
  }

  console.log(
    `📦 Extracting ${urls.length} URLs in ${batches.length} batch(es)`,
  );

  const allResults: ExtractResult[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(
      `📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} URLs)`,
    );

    try {
      const response = await axios.post(
        TAVILY_API_URL,
        {
          api_key: apiKey,
          urls: batch,
          query,
          chunks_per_source: chunksPerSource,
          extract_depth: extractDepth,
          include_raw_content: includeRawContent,
        },
        {
          timeout: 30000, // 30 seconds
        },
      );

      // Process successful results
      const successfulResults = response.data.results || [];
      for (const result of successfulResults) {
        allResults.push({
          url: result.url,
          content: result.content || "",
          rawContent: result.raw_content || "",
          failed: false,
          chunks: result.chunks || [],
        });
      }

      // Process failed results
      const failedResults = response.data.failed_results || [];
      for (const failed of failedResults) {
        allResults.push({
          url: failed.url,
          content: "",
          rawContent: "",
          failed: true,
          error: failed.error || "Unknown error",
        });
      }

      console.log(
        `✅ Batch ${batchIndex + 1}: ${successfulResults.length} successful, ${failedResults.length} failed`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });

        // Mark all URLs in this batch as failed
        for (const url of batch) {
          allResults.push({
            url,
            content: "",
            rawContent: "",
            failed: true,
            error: error.message,
          });
        }
      } else {
        throw error;
      }
    }

    // Rate limiting: wait 1 second between batches
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const successCount = allResults.filter((r) => !r.failed).length;
  const failCount = allResults.filter((r) => r.failed).length;

  console.log(
    `✅ Extraction completed: ${successCount} successful, ${failCount} failed`,
  );

  return allResults;
}

/**
 * Extract content with priority-based routing
 * Uses Tavily for high-priority articles, falls back to alternative for low-priority
 *
 * @param urls - URLs to extract
 * @param priority - Priority level (0-100)
 * @param options - Extraction options
 * @returns Extraction results
 */
export async function priorityExtract(
  urls: string[],
  priority: number,
  options: ExtractOptions = {},
): Promise<ExtractResult[]> {
  const PRIORITY_THRESHOLD = 80;

  if (priority >= PRIORITY_THRESHOLD) {
    console.log(`🔥 High priority (${priority}): Using Tavily extract`);
    return batchExtract(urls, options);
  } else {
    console.log(
      `📊 Low priority (${priority}): Skipping Tavily (use Google News fallback)`,
    );
    // Return empty results to signal fallback needed
    return urls.map((url) => ({
      url,
      content: "",
      rawContent: "",
      failed: true,
      error: "Low priority - use fallback",
    }));
  }
}

/**
 * Calculate estimated credit cost for extraction
 *
 * @param urlCount - Number of URLs to extract
 * @returns Estimated credit cost
 */
export function estimateExtractCost(urlCount: number): number {
  return urlCount; // 1 credit per URL
}

/**
 * Filter extraction results by content quality
 *
 * @param results - Extraction results
 * @param minContentLength - Minimum content length (default: 100)
 * @returns Filtered results
 */
export function filterQualityResults(
  results: ExtractResult[],
  minContentLength: number = 100,
): ExtractResult[] {
  return results.filter(
    (result) =>
      !result.failed &&
      result.content &&
      result.content.length >= minContentLength,
  );
}

export default {
  extractUrl,
  batchExtract,
  priorityExtract,
  estimateExtractCost,
  filterQualityResults,
};
