/**
 * Tavily Map API Integration
 *
 * Discovers URLs without extracting content (faster and cheaper than crawl).
 * Use for site structure discovery before targeted extraction.
 *
 * Credit Cost: Cheaper than crawl (exact cost TBD)
 * Response Time: Fast
 */

import axios from "axios";

const TAVILY_API_URL = "https://api.tavily.com/map";

export interface MapResult {
  urls: string[];
  totalUrls: number;
}

export interface MapOptions {
  maxDepth?: number;
  instructions?: string;
  selectPaths?: string[];
  excludePaths?: string[];
}

/**
 * Map a website to discover URLs
 *
 * @param url - Starting URL to map
 * @param options - Map configuration options
 * @returns Discovered URLs
 *
 * @example
 * ```typescript
 * const result = await mapSite(
 *   "https://docs.example.com",
 *   {
 *     maxDepth: 2,
 *     instructions: "Find all API documentation pages",
 *     selectPaths: ["/docs/.*", "/api/.*"]
 *   }
 * );
 *
 * console.log(`Found ${result.totalUrls} URLs`);
 * ```
 */
export async function mapSite(
  url: string,
  options: MapOptions = {},
): Promise<MapResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const { maxDepth = 2, instructions, selectPaths, excludePaths } = options;

  console.log(`🗺️  Starting site map: ${url}`);
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
        select_paths: selectPaths,
        exclude_paths: excludePaths,
      },
      {
        timeout: 60000, // 1 minute
      },
    );

    const urls: string[] = response.data.results || [];

    console.log(`✅ Site map completed: ${urls.length} URLs discovered`);

    return {
      urls,
      totalUrls: urls.length,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Tavily Map API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    throw error;
  }
}

/**
 * Map documentation site for specific topics
 *
 * @param url - Documentation site URL
 * @param topic - Topic to search for
 * @param options - Additional map options
 * @returns Discovered URLs
 *
 * @example
 * ```typescript
 * const result = await mapDocumentation(
 *   "https://platform.openai.com/docs",
 *   "Find API endpoint documentation",
 *   { maxDepth: 2 }
 * );
 * ```
 */
export async function mapDocumentation(
  url: string,
  topic: string,
  options: Omit<MapOptions, "instructions"> = {},
): Promise<MapResult> {
  return mapSite(url, {
    ...options,
    instructions: topic,
    selectPaths: options.selectPaths || ["/docs/.*", "/api/.*", "/guide/.*"],
    excludePaths: options.excludePaths || ["/blog/.*", "/news/.*"],
  });
}

/**
 * Map multiple sites in parallel
 *
 * @param sites - Array of site configurations
 * @returns Array of map results
 *
 * @example
 * ```typescript
 * const sites = [
 *   { url: "https://platform.openai.com/docs", topic: "API endpoints" },
 *   { url: "https://docs.anthropic.com", topic: "Claude API" }
 * ];
 *
 * const results = await batchMap(sites);
 * ```
 */
export async function batchMap(
  sites: Array<{ url: string; topic: string; options?: MapOptions }>,
): Promise<MapResult[]> {
  console.log(`🗺️  Starting batch map: ${sites.length} sites`);

  const results = await Promise.allSettled(
    sites.map((site) =>
      mapDocumentation(site.url, site.topic, site.options || {}),
    ),
  );

  const successfulResults: MapResult[] = [];
  const failedSites: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successfulResults.push(result.value);
    } else {
      failedSites.push(sites[index].url);
      console.error(`❌ Map failed for: ${sites[index].url}`, result.reason);
    }
  });

  console.log(
    `✅ Batch map completed: ${successfulResults.length}/${sites.length} successful`,
  );
  if (failedSites.length > 0) {
    console.warn(`⚠️ Failed sites: ${failedSites.join(", ")}`);
  }

  return successfulResults;
}

/**
 * Map site and then extract content from discovered URLs
 *
 * @param url - Site URL to map
 * @param topic - Topic to search for
 * @param options - Map options
 * @returns Discovered URLs ready for extraction
 *
 * @example
 * ```typescript
 * import { batchExtract } from "./tavily-extract";
 *
 * // Step 1: Discover URLs
 * const mapResult = await mapAndPrepareExtract(
 *   "https://docs.example.com",
 *   "Find API documentation"
 * );
 *
 * // Step 2: Extract content from discovered URLs
 * const extracted = await batchExtract(mapResult.urls.slice(0, 20));
 * ```
 */
export async function mapAndPrepareExtract(
  url: string,
  topic: string,
  options: MapOptions = {},
): Promise<MapResult> {
  console.log(`🗺️  Map + Extract workflow: ${url}`);

  const mapResult = await mapDocumentation(url, topic, options);

  console.log(`✅ Discovered ${mapResult.totalUrls} URLs for extraction`);
  console.log(`💡 Use batchExtract() to extract content from these URLs`);

  return mapResult;
}

/**
 * Filter URLs by pattern
 *
 * @param urls - Array of URLs
 * @param includePatterns - Regex patterns to include
 * @param excludePatterns - Regex patterns to exclude
 * @returns Filtered URLs
 */
export function filterUrls(
  urls: string[],
  includePatterns?: RegExp[],
  excludePatterns?: RegExp[],
): string[] {
  let filtered = urls;

  if (includePatterns && includePatterns.length > 0) {
    filtered = filtered.filter((url) =>
      includePatterns.some((pattern) => pattern.test(url)),
    );
  }

  if (excludePatterns && excludePatterns.length > 0) {
    filtered = filtered.filter(
      (url) => !excludePatterns.some((pattern) => pattern.test(url)),
    );
  }

  return filtered;
}

/**
 * Group URLs by path prefix
 *
 * @param urls - Array of URLs
 * @returns Grouped URLs by path prefix
 */
export function groupUrlsByPath(urls: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const prefix = pathParts[0] || "root";

      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(url);
    } catch {
      // Invalid URL, skip
    }
  }

  return groups;
}

export default {
  mapSite,
  mapDocumentation,
  batchMap,
  mapAndPrepareExtract,
  filterUrls,
  groupUrlsByPath,
};
