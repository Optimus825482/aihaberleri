"use client";

import useSWR from "swr";

interface TrendingArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
  trendScore?: number | null;
}

interface TrendingResponse {
  articles: TrendingArticle[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTrendingArticles(period: string, limit = 5) {
  return useSWR<TrendingResponse>(
    `/api/most-read?period=${period}&limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // 1 min dedup — same period won't re-fetch
      keepPreviousData: true, // Show old data while loading new period
    },
  );
}
