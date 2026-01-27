import { useEffect, useRef } from "react";

export function useReadingTime(articleId: string) {
  const startTime = useRef<number>(Date.now());
  const sent = useRef<boolean>(false);

  useEffect(() => {
    startTime.current = Date.now();
    sent.current = false;

    const sendAnalytics = () => {
      if (sent.current) return;
      
      const duration = Math.floor((Date.now() - startTime.current) / 1000);
      if (duration < 5) return; // Don't track very short visits (bounce)

      // Use navigator.sendBeacon for reliable sending on page unload
      const data = JSON.stringify({ articleId, duration });
      const blob = new Blob([data], { type: "application/json" });
      
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/track", blob);
      } else {
        // Fallback for older browsers
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(console.error);
      }
      sent.current = true;
    };

    // Track on visibility change (tab switch/close)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendAnalytics();
      } else {
        // Reset timer if user comes back
        startTime.current = Date.now();
        sent.current = false;
      }
    };

    // Track on unload
    window.addEventListener("beforeunload", sendAnalytics);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", sendAnalytics);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sendAnalytics(); // Send on component unmount
    };
  }, [articleId]);
}
