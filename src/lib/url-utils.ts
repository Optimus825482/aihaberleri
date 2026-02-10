/**
 * URL Normalization Utilities
 *
 * Provides URL normalization for duplicate detection
 */

/**
 * Normalize URL for comparison
 * Removes query parameters and trailing slashes
 * EXCEPTION: YouTube URLs preserve ?v= param (it's the unique video identifier)
 *
 * @example
 * normalizeUrl("https://example.com/article?utm_source=twitter")
 * // => "https://example.com/article"
 * normalizeUrl("https://www.youtube.com/watch?v=abc123&t=30")
 * // => "https://www.youtube.com/watch?v=abc123"
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // YouTube: video ID is in ?v= query param — stripping it makes ALL URLs identical!
    if (
      urlObj.hostname.includes("youtube.com") &&
      urlObj.searchParams.has("v")
    ) {
      return `${urlObj.origin}${urlObj.pathname}?v=${urlObj.searchParams.get("v")}`;
    }
    // youtu.be short URLs: path IS the video ID
    if (urlObj.hostname === "youtu.be") {
      return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, "")}`;
    }
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
