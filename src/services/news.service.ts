/**
 * News Service - Handles news scraping and fetching with RSS + Trend Analysis
 */

import axios from "axios";
import {
  fetchAllRSSFeeds,
  filterRecentArticles,
  type RSSItem,
} from "@/lib/rss";
import { rankArticlesByTrendBrave } from "@/lib/brave";
import { distance } from "fastest-levenshtein";
import { db } from "@/lib/db";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source?: string;
  trendScore?: number;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const dist = distance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - dist / maxLength;
}

/**
 * Check if a news article is duplicate based on title and content similarity
 * @param title - Article title
 * @param content - Article content (optional)
 * @param timeWindowHours - Time window to check for duplicates (default: 24 hours)
 * @returns true if duplicate found, false otherwise
 */
export async function isDuplicateNews(
  title: string,
  content?: string,
  timeWindowHours: number = 24,
): Promise<{
  isDuplicate: boolean;
  reason?: string;
  similarArticleId?: string;
}> {
  try {
    // Fetch recent articles within time window
    const recentArticles = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - timeWindowHours * 60 * 60 * 1000),
        },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        content: true,
        slug: true,
      },
    });

    console.log(
      `🔍 Checking for duplicates among ${recentArticles.length} recent articles...`,
    );

    for (const article of recentArticles) {
      // 1. Exact Title Match
      if (title.toLowerCase() === article.title.toLowerCase()) {
        console.log(
          `❌ DUPLICATE: Exact title match with article ${article.id}`,
        );
        return {
          isDuplicate: true,
          reason: "EXACT_TITLE_MATCH",
          similarArticleId: article.id,
        };
      }

      // 2. Title Similarity Check (80%+ similar)
      const titleSimilarity = calculateSimilarity(title, article.title);
      if (titleSimilarity > 0.8) {
        console.log(
          `❌ DUPLICATE: Title similarity ${(titleSimilarity * 100).toFixed(1)}% with article ${article.id}`,
        );
        console.log(`   New: "${title}"`);
        console.log(`   Existing: "${article.title}"`);
        return {
          isDuplicate: true,
          reason: `TITLE_SIMILARITY_${(titleSimilarity * 100).toFixed(0)}%`,
          similarArticleId: article.id,
        };
      }

      // 3. Slug Prefix Match (first 40 characters)
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 40);

      const existingSlugPrefix = article.slug.substring(0, 40);

      if (newSlug === existingSlugPrefix && newSlug.length > 20) {
        console.log(
          `❌ DUPLICATE: Slug prefix match with article ${article.id}`,
        );
        return {
          isDuplicate: true,
          reason: "SLUG_PREFIX_MATCH",
          similarArticleId: article.id,
        };
      }

      // 4. Content Similarity Check (if content provided)
      if (content && article.content) {
        // Compare first 300 characters of content
        const contentPreview1 = content.substring(0, 300).toLowerCase();
        const contentPreview2 = article.content.substring(0, 300).toLowerCase();

        const contentSimilarity = calculateSimilarity(
          contentPreview1,
          contentPreview2,
        );

        if (contentSimilarity > 0.7) {
          console.log(
            `❌ DUPLICATE: Content similarity ${(contentSimilarity * 100).toFixed(1)}% with article ${article.id}`,
          );
          return {
            isDuplicate: true,
            reason: `CONTENT_SIMILARITY_${(contentSimilarity * 100).toFixed(0)}%`,
            similarArticleId: article.id,
          };
        }
      }
    }

    console.log(`✅ No duplicates found for: "${title.substring(0, 60)}..."`);
    return { isDuplicate: false };
  } catch (error) {
    console.error("❌ Error checking for duplicates:", error);
    // On error, allow the article to be published (fail-open)
    return { isDuplicate: false };
  }
}

/**
 * Convert RSS items to NewsArticle format
 */
function convertRSSToNews(items: RSSItem[]): NewsArticle[] {
  return items.map((item) => ({
    title: item.title,
    description: item.description,
    url: item.link,
    publishedDate: item.pubDate,
    source: item.source,
    trendScore: (item as any).trendScore,
  }));
}

/**
 * Fetch AI news from RSS feeds with trend analysis
 */
export async function fetchAINews(
  categoryFilter?: string,
): Promise<NewsArticle[]> {
  console.log(
    `📰 AI haberleri toplanıyor (RSS + Trend Analizi)${categoryFilter ? ` - Kategori: ${categoryFilter}` : ""}...`,
  );

  try {
    // Step 1: Fetch all RSS feeds
    const rssItems = await fetchAllRSSFeeds();

    if (rssItems.length === 0) {
      console.log("⚠️  RSS'den haber alınamadı");
      return [];
    }

    // Step 1.5: Filter by category keywords if specified
    let filteredItems = rssItems;
    if (categoryFilter) {
      const categoryKeywords = getCategoryKeywords(categoryFilter);
      console.log(
        `🔍 "${categoryFilter}" kategorisi için filtreleme yapılıyor...`,
      );
      console.log(`📝 Anahtar kelimeler: ${categoryKeywords.join(", ")}`);

      filteredItems = rssItems.filter((item) => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        return categoryKeywords.some((keyword) => text.includes(keyword));
      });

      console.log(
        `✅ ${filteredItems.length}/${rssItems.length} haber kategoriye uygun`,
      );

      if (filteredItems.length === 0) {
        console.log(
          "⚠️  Kategoriye uygun haber bulunamadı, tüm haberler kullanılacak",
        );
        filteredItems = rssItems;
      }
    }

    // Step 2: Filter recent articles (last 48 hours)
    const recentItems = filterRecentArticles(filteredItems, 48);
    console.log(`📅 Son 48 saatte ${recentItems.length} haber`);

    // SMART SAMPLING: Prioritize recent + diverse sources
    let itemsToAnalyze = recentItems.length > 0 ? recentItems : filteredItems;

    // If too many articles, sample intelligently
    const MAX_ARTICLES_TO_ANALYZE = 100;
    if (itemsToAnalyze.length > MAX_ARTICLES_TO_ANALYZE) {
      console.log(
        `⚡ Smart Sampling: ${itemsToAnalyze.length} haber → ${MAX_ARTICLES_TO_ANALYZE} habere düşürülüyor`,
      );

      // Sort by date (most recent first) and take top 100
      itemsToAnalyze = itemsToAnalyze
        .sort(
          (a, b) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
        )
        .slice(0, MAX_ARTICLES_TO_ANALYZE);

      console.log(`✅ En güncel ${MAX_ARTICLES_TO_ANALYZE} haber seçildi`);
    }

    // Step 3: Analyze trends using Brave Search API AND Google Trends
    console.log(
      `📊 ${itemsToAnalyze.length} haber için Trend (Brave + Google) analizi...`,
    );

    // Fetch Google Trends (Parallel)
    const googleTrends = await import("@/lib/google-trends")
      .then((m) => m.fetchGoogleTrends())
      .catch(() => []);
    const { calculateGoogleTrendScore } = await import("@/lib/google-trends");

    const trendRankings = await rankArticlesByTrendBrave(
      itemsToAnalyze.map((item) => ({
        title: item.title,
        description: item.description,
      })),
    );

    // Step 4: Sort by trend score and take top articles
    const topArticles = trendRankings
      .slice(0, 20) // Top 20 trending (initially)
      .map((ranking) => {
        const item = itemsToAnalyze[ranking.index];

        // Add Google Trend Boost
        const googleScore = calculateGoogleTrendScore(item.title, googleTrends);
        const finalScore = ranking.score + googleScore;

        if (googleScore > 0) {
          console.log(
            `🔥 HOT TOPIC DETECTED: ${item.title} (Boost: +${googleScore})`,
          );
        }

        return {
          ...item,
          trendScore: finalScore,
        };
      })
      .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0)); // Re-sort after Google Boost

    console.log(`✅ ${topArticles.length} trend haber seçildi`);
    console.log(
      "Top 5 Trend Haberler:",
      topArticles
        .slice(0, 5)
        .map(
          (a, i) =>
            `\n  ${i + 1}. ${a.title.substring(0, 60)}... (skor: ${Math.round(a.trendScore || 0)})`,
        )
        .join(""),
    );

    return convertRSSToNews(topArticles);
  } catch (error) {
    console.error("❌ Haber toplama hatası:", error);
    throw error;
  }
}

/**
 * Get category-specific keywords for filtering
 */
function getCategoryKeywords(categorySlug: string): string[] {
  const keywordMap: Record<string, string[]> = {
    "makine-ogrenmesi": [
      "machine learning",
      "ml",
      "deep learning",
      "neural network",
      "training",
      "model",
      "dataset",
      "supervised",
      "unsupervised",
      "reinforcement",
      "tensorflow",
      "pytorch",
      "scikit",
    ],
    "dogal-dil-isleme": [
      "nlp",
      "natural language",
      "language model",
      "llm",
      "gpt",
      "bert",
      "transformer",
      "chatbot",
      "text",
      "translation",
      "sentiment",
    ],
    "bilgisayarli-goru": [
      "computer vision",
      "image",
      "video",
      "object detection",
      "face recognition",
      "segmentation",
      "opencv",
      "yolo",
      "cnn",
      "visual",
    ],
    robotik: [
      "robot",
      "robotics",
      "autonomous",
      "drone",
      "automation",
      "sensor",
      "actuator",
      "ros",
      "manipulation",
    ],
    "yapay-zeka-etigi": [
      "ethics",
      "bias",
      "fairness",
      "privacy",
      "regulation",
      "responsible ai",
      "explainable",
      "transparency",
      "safety",
    ],
    "yapay-zeka-araclari": [
      "tool",
      "framework",
      "library",
      "api",
      "platform",
      "sdk",
      "service",
      "cloud",
      "openai",
      "anthropic",
      "google ai",
    ],
    "sektor-haberleri": [
      "company",
      "startup",
      "funding",
      "acquisition",
      "partnership",
      "market",
      "industry",
      "business",
      "investment",
    ],
    arastirma: [
      "research",
      "paper",
      "study",
      "arxiv",
      "conference",
      "breakthrough",
      "discovery",
      "experiment",
      "academic",
    ],
  };

  return keywordMap[categorySlug] || [];
}

/**
 * Fetch article content from URL
 */
export async function fetchArticleContent(url: string): Promise<string> {
  try {
    console.log(`📄 Makale içeriği alınıyor: ${url}`);

    // Randomize User-Agent to avoid detection
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];
    const randomUserAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];

    // Fetch the page with browser-like headers
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": randomUserAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
        "Accept-Encoding": "gzip, deflate, br", // Axios handles decompression automatically
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
        Referer: "https://www.google.com/",
        Connection: "keep-alive",
        "Sec-Ch-Ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
      },
    });

    const html = response.data;

    // Use JSDOM or Cheerio if available, otherwise simple regex
    // For now, keeping the regex but making it slightly robust
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ") // Remove nav
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ") // Remove footer
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ") // Remove header
      .replace(/<[^>]+>/g, " ") // Remove all tags
      .replace(/\s+/g, " ") // Collapse whitespace
      .trim();

    // Limit content length
    content = content.substring(0, 10000); // Increased limit for better context

    if (content.length < 200) {
      throw new Error("Content too short, likely blocked or empty");
    }

    console.log(`✅ İçerik alındı: ${content.length} karakter`);
    return content;
  } catch (error: any) {
    console.error(
      `❌ İçerik alma hatası (${url}):`,
      error.message || error.code,
    );

    // Fallback: Try Jina Reader (AI-friendly reader) if direct access fails
    try {
      console.log("🔄 Jina Reader ile tekrar deneniyor...");
      const jinaUrl = `https://r.jina.ai/${url}`;
      const jinaResponse = await axios.get(jinaUrl, { timeout: 15000 });
      let jinaContent = jinaResponse.data;

      // Clean up Jina output (markdown links etc)
      jinaContent = jinaContent.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1"); // Remove links

      console.log(
        `✅ Jina ile içerik kurtarıldı: ${jinaContent.length} karakter`,
      );
      return jinaContent.substring(0, 10000);
    } catch (jinaError) {
      console.error("❌ Jina Reader da başarısız oldu.");
    }

    // Ultimate Fallback: Return a meaningful error string to allow processing based on title
    return "Article content could not be fetched due to access restrictions. The AI will rewrite based on the title and description.";
  }
}

export default {
  fetchAINews,
  fetchArticleContent,
};
