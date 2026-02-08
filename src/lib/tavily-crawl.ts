/**
 * Tavily Crawl API Integration
 *
 * Crawls entire websites with semantic instructions.
 * Use for documentation sites and comprehensive content collection.
 *
 * Credit Cost: 1 credit per page
 * Response Time: Varies by depth
 */

import axios from "axios";

const TAVILY_API_URL = "https://api.tavily.com/crawl";

export interface CrawlResult {
  url: string;
  content: string;
  rawContent: string;
  title?: string;
  chunks?: string[];
}

export interface CrawlResponse {
  results: CrawlResult[];
  totalPages: number;
  failedPages: number;
}

export interface CrawlOptions {
  maxDepth?: number;
  instructions?: string;
  chunksPerSource?: number;
  selectPaths?: string[];
  excludePaths?: string[];
  includeRawContent?: boolean;
}

/**
 * Crawl a website with semantic instructions
 *
 * @param url - Starting URL to crawl
 * @param options - Crawl configuration options
 * @returns Crawl results with extracted content
 *
 * @example
 * ```typescript
 * const results = await crawlWebsite(
 *   "https://platform.openai.com/docs",
 *   {
 *     maxDepth: 2,
 *     instructions: "Find new API features and updates",
 *     selectPaths: ["/docs/.*", "/api/.*"],
 *     excludePaths: ["/blog/.*"]
 *   }
 * );
 * ```
 */
export async function crawlWebsite(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const {
    maxDepth = 2,
    instructions,
    chunksPerSource = 3,
    selectPaths,
    excludePaths,
    includeRawContent = true,
  } = options;

  console.log(`🕷️  Starting crawl: ${url}`);
  console.log(`   Max depth: ${maxDepth}`);
  console.log(`   Instructions: ${instructions || "None"}`);
  if (selectPaths) console.log(`   Select paths: ${selectPaths.join(", ")}`);
  if (excludePaths) console.log(`   Exclude paths: ${excludePaths.join(", ")}`);

  try {
    const response = await axios.post(
      TAVILY_API_URL,
      {
        api_key: apiKey,
        url,
        max_depth: maxDepth,
        instructions,
        chunks_per_source: chunksPerSource,
        select_paths: selectPaths,
        exclude_paths: excludePaths,
        include_raw_content: includeRawContent,
      },
      {
        timeout: 120000, // 2 minutes for crawling
      },
    );

    const results: CrawlResult[] = (response.data.results || []).map(
      (result: any) => ({
        url: result.url,
        content: result.content || "",
        rawContent: result.raw_content || "",
        title: result.title,
        chunks: result.chunks || [],
      }),
    );

    const failedPages = response.data.failed_results?.length || 0;

    console.log(
      `✅ Crawl completed: ${results.length} pages, ${failedPages} failed`,
    );

    return {
      results,
      totalPages: results.length,
      failedPages,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Tavily Crawl API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    throw error;
  }
}

/**
 * Crawl documentation site for specific topics
 *
 * @param url - Documentation site URL
 * @param topic - Topic to search for
 * @param options - Additional crawl options
 * @returns Crawl results filtered by topic
 *
 * @example
 * ```typescript
 * const docs = await crawlDocumentation(
 *   "https://platform.openai.com/docs",
 *   "Find new API features and updates",
 *   { maxDepth: 2 }
 * );
 * ```
 */
export async function crawlDocumentation(
  url: string,
  topic: string,
  options: Omit<CrawlOptions, "instructions"> = {},
): Promise<CrawlResponse> {
  return crawlWebsite(url, {
    ...options,
    instructions: topic,
    selectPaths: options.selectPaths || ["/docs/.*", "/api/.*", "/guide/.*"],
    excludePaths: options.excludePaths || ["/blog/.*", "/news/.*"],
  });
}

/**
 * Crawl multiple documentation sites in parallel
 *
 * @param sites - Array of site configurations
 * @returns Array of crawl responses
 *
 * @example
 * ```typescript
 * const sites = [
 *   { url: "https://platform.openai.com/docs", topic: "New API features" },
 *   { url: "https://docs.anthropic.com", topic: "Claude updates" }
 * ];
 *
 * const results = await batchCrawl(sites);
 * ```
 */
export async function batchCrawl(
  sites: Array<{ url: string; topic: string; options?: CrawlOptions }>,
): Promise<CrawlResponse[]> {
  console.log(`🕷️  Starting batch crawl: ${sites.length} sites`);

  const results = await Promise.allSettled(
    sites.map((site) =>
      crawlDocumentation(site.url, site.topic, site.options || {}),
    ),
  );

  const successfulResults: CrawlResponse[] = [];
  const failedSites: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successfulResults.push(result.value);
    } else {
      failedSites.push(sites[index].url);
      console.error(`❌ Crawl failed for: ${sites[index].url}`, result.reason);
    }
  });

  console.log(
    `✅ Batch crawl completed: ${successfulResults.length}/${sites.length} successful`,
  );
  if (failedSites.length > 0) {
    console.warn(`⚠️ Failed sites: ${failedSites.join(", ")}`);
  }

  return successfulResults;
}

/**
 * Calculate estimated credit cost for crawling
 *
 * @param estimatedPages - Estimated number of pages to crawl
 * @returns Estimated credit cost
 */
export function estimateCrawlCost(estimatedPages: number): number {
  return estimatedPages; // 1 credit per page
}

/**
 * Filter crawl results by content quality
 *
 * @param results - Crawl results
 * @param minContentLength - Minimum content length (default: 200)
 * @returns Filtered results
 */
export function filterQualityCrawlResults(
  results: CrawlResult[],
  minContentLength: number = 200,
): CrawlResult[] {
  return results.filter(
    (result) => result.content && result.content.length >= minContentLength,
  );
}

export default {
  crawlWebsite,
  crawlDocumentation,
  batchCrawl,
  estimateCrawlCost,
  filterQualityCrawlResults,
};
