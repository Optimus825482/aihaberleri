"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * VisitorTracker Component
 *
 * Tracks real-time visitor presence on the site.
 * - Registers visitor on mount
 * - Updates current page on navigation
 * - Sends heartbeats every 30 seconds to maintain "active" status
 * - IP detection is done server-side (no external API call needed)
 */

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPage = useRef<string>("");

  const trackVisitor = useCallback(async (currentPage: string) => {
    try {
      const userAgent =
        typeof window !== "undefined" ? window.navigator.userAgent : "";

      // IP is detected server-side from request headers — no need for external API
      await fetch("/api/visitors/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAgent, currentPage }),
      });
    } catch {
      // Silent fail — visitor tracking is non-critical
    }
  }, []);

  // Track on mount and pathname change
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    // Avoid duplicate tracking for same page
    if (lastTrackedPage.current === pathname) return;
    lastTrackedPage.current = pathname;

    trackVisitor(pathname);
  }, [pathname, trackVisitor]);

  // Heartbeat to maintain active status
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const interval = setInterval(() => {
      trackVisitor(pathname);
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [pathname, trackVisitor]);

  return null;
}
