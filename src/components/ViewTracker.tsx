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

    // Track after 3 seconds (user actually reading)
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/articles/${articleId}/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        tracked.current = true;
      } catch (error) {
        console.error("View tracking failed:", error);
      }
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [articleId]);

  return null; // This component doesn't render anything
}
