"use client";

import { useReadingTime } from "@/hooks/useReadingTime";

export function AnalyticsTracker({ articleId }: { articleId: string }) {
  useReadingTime(articleId);
  return null; // This component renders nothing
}
