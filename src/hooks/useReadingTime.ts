import { useEffect, useRef } from "react";

/**
 * Enhanced reading time tracker for articles
 * Tracks: duration, scroll depth, device info, referrer
 * Sends via sendBeacon on page exit for reliability
 * Minimum 5 seconds to count as a real read (filters bots/bounces)
 */
export function useReadingTime(articleId: string) {
  const startTime = useRef<number>(Date.now());
  const sent = useRef<boolean>(false);
  const maxScroll = useRef<number>(0);

  // Track scroll depth
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop =
            window.scrollY || document.documentElement.scrollTop;
          const docHeight =
            document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            const percent = Math.min(
              100,
              Math.round((scrollTop / docHeight) * 100),
            );
            if (percent > maxScroll.current) maxScroll.current = percent;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    startTime.current = Date.now();
    sent.current = false;
    maxScroll.current = 0;

    const sendAnalytics = () => {
      if (sent.current) return;

      const duration = Math.floor((Date.now() - startTime.current) / 1000);
      if (duration < 5) return;

      const data = JSON.stringify({
        articleId,
        duration,
        scrollDepth: maxScroll.current,
        referrer: document.referrer || null,
        screenWidth: window.innerWidth,
      });

      const blob = new Blob([data], { type: "application/json" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/track", blob);
      } else {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
      sent.current = true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendAnalytics();
      } else {
        startTime.current = Date.now();
        sent.current = false;
      }
    };

    window.addEventListener("beforeunload", sendAnalytics);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", sendAnalytics);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sendAnalytics();
    };
  }, [articleId]);
}
