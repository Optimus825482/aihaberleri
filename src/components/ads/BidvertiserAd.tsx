"use client";

import { useEffect, useRef } from "react";

interface BidvertiserBannerProps {
  /** Additional CSS class */
  className?: string;
  /** Ad slot identifier for tracking */
  slot?: string;
}

/**
 * Bidvertiser Banner Ad Component
 * Loads the official Bidvertiser banner script (pid=941460, bid=2103678)
 */
export function BidvertiserBanner({
  className = "",
  slot = "banner",
}: BidvertiserBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return;
    loadedRef.current = true;

    const script = document.createElement("script");
    script.setAttribute("data-cfasync", "false");
    script.src = "//bdv.bidvertiser.com/BidVertiser.dbm?pid=941460&bid=2103678";
    script.type = "text/javascript";
    containerRef.current.appendChild(script);

    return () => {
      loadedRef.current = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`bidvertiser-banner flex items-center justify-center overflow-hidden ${className}`}
      data-ad-slot={slot}
      aria-label="Advertisement"
      role="complementary"
    />
  );
}

interface BidvertiserNativeProps {
  /** Additional CSS class */
  className?: string;
  /** Ad slot identifier */
  slot?: string;
  /** Number of columns (desktop) */
  cols?: number;
  /** Number of rows */
  rows?: number;
  /** Number of columns (mobile) */
  mobileCols?: number;
  /** Image width */
  imageWidth?: number;
}

/**
 * Bidvertiser Native Widget Component
 * Loads the official native ad widget (bvlinksownid=2103678)
 */
export function BidvertiserNative({
  className = "",
  slot = "native",
  cols = 1,
  rows = 1,
  mobileCols = 1,
  imageWidth = 150,
}: BidvertiserNativeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const uniqueId = useRef(
    `ntv_2103678_${Math.random().toString(36).slice(2, 8)}`,
  );

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return;
    loadedRef.current = true;

    const container = containerRef.current;
    const widgetId = uniqueId.current;

    // Create the native widget div
    const ntvDiv = document.createElement("div");
    ntvDiv.id = widgetId;
    container.appendChild(ntvDiv);

    // Create and execute the native widget script
    const params = {
      bvwidgetid: widgetId,
      bvlinksownid: 2103678,
      rows,
      cols,
      textpos: "below",
      imagewidth: imageWidth,
      mobilecols: mobileCols,
      cb: new Date().getTime(),
    };

    const newWidgetId = widgetId + params.cb;
    ntvDiv.id = newWidgetId;

    const qs = Object.keys(params)
      .reduce<string[]>((a, k) => {
        a.push(k + "=" + encodeURIComponent((params as any)[k]));
        return a;
      }, [])
      .join("&");

    const protocol = document.location.protocol === "https:" ? "https" : "http";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${protocol}://cdn.hyperpromote.com/bidvertiser/tags/active/bdvws.js?${qs}`;

    const targetEl = document.getElementById(newWidgetId);
    if (targetEl) {
      targetEl.appendChild(script);
    }

    return () => {
      loadedRef.current = false;
    };
  }, [cols, rows, mobileCols, imageWidth]);

  return (
    <div
      ref={containerRef}
      className={`bidvertiser-native flex items-center justify-center overflow-hidden ${className}`}
      data-ad-slot={slot}
      aria-label="Sponsored content"
      role="complementary"
    />
  );
}
