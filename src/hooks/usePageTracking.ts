"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * Comprehensive page tracking hook
 * Tracks: page views, duration, scroll depth, referrer, device info
 * Sends data on: page change, tab hide, unload
 * Minimal performance impact - uses sendBeacon for reliability
 */

export function usePageTracking(articleId?: string) {
  const pathname = usePathname();
  const startTime = useRef(Date.now());
  const maxScroll = useRef(0);
  const visitorId = useRef<string | null>(null);
  const currentPath = useRef<string>("");
  const sent = useRef(false);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const percent = Math.min(
          100,
          Math.round((scrollTop / docHeight) * 100),
        );
        if (percent > maxScroll.current) {
          maxScroll.current = percent;
        }
      }
    };

    // Throttled scroll listener
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => window.removeEventListener("scroll", throttledScroll);
  }, []);

  // Send update for current page (duration + scroll)
  const sendUpdate = useCallback(() => {
    if (!visitorId.current || !currentPath.current || sent.current) return;

    const duration = Math.floor((Date.now() - startTime.current) / 1000);
    if (duration < 2) return; // Skip very short visits

    const data = JSON.stringify({
      visitorId: visitorId.current,
      path: currentPath.current,
      duration,
      scrollDepth: maxScroll.current,
      exitPage: true,
      _update: true, // Flag for PATCH-like behavior via POST (sendBeacon only supports POST)
    });

    const blob = new Blob([data], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/pageview", blob);
    } else {
      fetch("/api/analytics/pageview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
    sent.current = true;
  }, []);

  // Record new page view
  const recordPageView = useCallback(
    async (path: string) => {
      try {
        const response = await fetch("/api/analytics/pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            referrer: document.referrer || null,
            articleId: articleId || null,
            screenWidth: window.innerWidth,
          }),
        });

        const result = await response.json();
        if (result.visitorId && result.visitorId !== "pending") {
          visitorId.current = result.visitorId;
        }
      } catch {
        // Silent fail
      }
    },
    [articleId],
  );

  // Track page changes
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (currentPath.current === pathname) return;

    // Send update for previous page before tracking new one
    if (currentPath.current) {
      sendUpdate();
    }

    // Reset for new page
    currentPath.current = pathname;
    startTime.current = Date.now();
    maxScroll.current = 0;
    sent.current = false;

    recordPageView(pathname);
  }, [pathname, recordPageView, sendUpdate]);

  // Send on visibility change and unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendUpdate();
      } else {
        // User came back - reset
        startTime.current = Date.now();
        sent.current = false;
      }
    };

    const handleBeforeUnload = () => sendUpdate();

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sendUpdate(); // Send on unmount
    };
  }, [sendUpdate]);
}
