"use client";

import useSWR from "swr";

interface TrendingArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  imageUrl?: string | null;
  views: number;
  trendScore?: number | null;
  publishedAt?: string | null;
  category?: { name: string; slug: string } | null;
}

interface TrendingResponse {
  articles: TrendingArticle[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTrendingArticles(
  period: string,
  limit = 5,
  sort: "views" | "trend" = "trend",
) {
  return useSWR<TrendingResponse>(
    `/api/most-read?period=${period}&limit=${limit}&sort=${sort}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    },
  );
}
