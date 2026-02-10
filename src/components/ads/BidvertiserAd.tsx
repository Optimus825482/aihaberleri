"use client";

import { useEffect, useRef, useId } from "react";

interface BidvertiserBannerProps {
  className?: string;
  slot?: string;
}

/**
 * Bidvertiser Banner Ad — pid=941460, bid=2103678, fid=2103678
 * Injects the official Bidvertiser script directly into the DOM.
 */
export function BidvertiserBanner({
  className = "",
  slot = "banner",
}: BidvertiserBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    const script = document.createElement("script");
    script.setAttribute("data-cfasync", "false");
    script.type = "text/javascript";
    script.src =
      "//bdv.bidvertiser.com/BidVertiser.dbm?pid=941460&bid=2103678&fid=2103678";
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`bidvertiser-banner ${className}`}
      data-ad-slot={slot}
      aria-label="Advertisement"
      role="complementary"
    />
  );
}

interface BidvertiserNativeProps {
  className?: string;
  slot?: string;
  cols?: number;
  rows?: number;
  mobileCols?: number;
  imageWidth?: number;
}

/**
 * Bidvertiser Native Widget — bvlinksownid=2103678
 *
 * Key insight: bdvws.js uses document.getElementById to find the widget div,
 * then sets innerHTML on it in an XHR onload callback. The div MUST exist
 * in the real DOM with the correct ID at the time the callback fires.
 *
 * We use a stable unique ID per instance and ensure the div is in the DOM
 * before the script loads.
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
  const injectedRef = useRef(false);
  // Stable unique suffix per component instance
  const instanceId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    const container = containerRef.current;
    const baseId = `ntv_2103678_${instanceId}`;

    // 1. Create the target div that bdvws.js will look for
    const ntvDiv = document.createElement("div");
    ntvDiv.id = baseId;
    container.appendChild(ntvDiv);

    // 2. Build params exactly like Bidvertiser's original code
    const cb = new Date().getTime();
    const finalId = baseId + cb;

    // 3. Rename the div ID (Bidvertiser's code does this)
    ntvDiv.id = finalId;

    // 4. Build query string
    const params: Record<string, string | number> = {
      bvwidgetid: finalId,
      bvlinksownid: 2103678,
      rows,
      cols,
      textpos: "left",
      imagewidth: imageWidth,
      mobilecols: mobileCols,
      cb,
    };

    const qs = Object.keys(params)
      .map((k) => `${k}=${encodeURIComponent(params[k])}`)
      .join("&");

    // 5. Load bdvws.js — it will find the div by finalId in the real DOM
    const protocol = document.location.protocol === "https:" ? "https" : "http";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${protocol}://cdn.hyperpromote.com/bidvertiser/tags/active/bdvws.js?${qs}`;

    // Append script to the widget div (same as original code)
    ntvDiv.appendChild(script);
  }, [instanceId, cols, rows, mobileCols, imageWidth]);

  return (
    <div
      ref={containerRef}
      className={`bidvertiser-native ${className}`}
      data-ad-slot={slot}
      aria-label="Sponsored content"
      role="complementary"
    />
  );
}
