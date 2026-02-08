/**
 * URL Normalization Utilities
 *
 * Provides URL normalization for duplicate detection
 */

/**
 * Normalize URL for comparison
 * Removes query parameters and trailing slashes
 *
 * @example
 * normalizeUrl("https://example.com/article?utm_source=twitter")
 * // => "https://example.com/article"
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query parameters and trailing slash
    return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, "")}`;
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Extract domain from URL
 *
 * @example
 * extractDomain("https://techcrunch.com/2024/article")
 * // => "techcrunch.com"
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
