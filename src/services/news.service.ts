/**
 * News Service - Handles news scraping and fetching with RSS + Trend Analysis
 */

import axios from "axios";
import {
  fetchAllRSSFeeds,
  filterRecentArticles,
  type RSSItem,
} from "@/lib/rss";
import { rankArticlesByTrendTavily } from "@/lib/tavily";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source?: string;
  trendScore?: number;
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

    // If no recent items, use all items but limit to 50
    const itemsToAnalyze =
      recentItems.length > 0 ? recentItems : filteredItems.slice(0, 50);

    // Step 3: Analyze trends using Tavily Search API AND Google Trends
    console.log(
      `📊 ${itemsToAnalyze.length} haber için Trend (Tavily + Google) analizi...`,
    );

    // Fetch Google Trends (Parallel)
    const googleTrends = await import("@/lib/google-trends")
      .then((m) => m.fetchGoogleTrends())
      .catch(() => []);
    const { calculateGoogleTrendScore } = await import("@/lib/google-trends");

    const trendRankings = await rankArticlesByTrendTavily(
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

    // Fetch the page
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = response.data;

    // Simple content extraction (remove HTML tags)
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit content length
    content = content.substring(0, 5000);

    console.log(`✅ İçerik alındı: ${content.length} karakter`);
    return content;
  } catch (error) {
    console.error("❌ İçerik alma hatası:", error);
    // Return a fallback message
    return "Article content could not be fetched. Using title and description for rewriting.";
  }
}

export default {
  fetchAINews,
  fetchArticleContent,
};
