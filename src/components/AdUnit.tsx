"use client";

import { useEffect, useRef } from "react";

interface AdUnitProps {
  slotId: string;
  format?: "auto" | "fluid" | "rectangle";
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Optimized AdUnit component with CLS protection
 * Prevents layout shifts by reserving space
 */
export function AdUnit({
  slotId,
  format = "auto",
  className = "",
  style = {},
}: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);

  // CLS Protection: Default min-heights based on format
  const minHeights = {
    auto: "280px", // Standard mrec height
    fluid: "90px", // Standard banner height
    rectangle: "250px",
  };

  useEffect(() => {
    try {
      // @ts-ignore
      if (typeof window !== "undefined" && window.adsbygoogle) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) {
    // Show placeholder in dev mode
    if (process.env.NODE_ENV === "development") {
      return (
        <div
          className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 ${className}`}
          style={{ minHeight: minHeights[format], ...style }}
        >
          AdUnit: {slotId} ({format})
        </div>
      );
    }
    return null;
  }

  return (
    <div
      ref={adRef}
      className={`ad-container my-8 ${className}`}
      style={{ minHeight: minHeights[format], ...style }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
