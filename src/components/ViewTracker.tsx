"use client";

import { useEffect, useRef } from "react";

interface ViewTrackerProps {
  articleId: string;
}

export function ViewTracker({ articleId }: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per component mount
    if (tracked.current) return;
    tracked.current = true;

    // Track immediately on page load — page view = read
    fetch(`/api/articles/${articleId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => { });
  }, [articleId]);

  return null; // This component doesn't render anything
}
