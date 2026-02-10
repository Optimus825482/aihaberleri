"use client";

import { useEffect, useRef } from "react";

/**
 * Bidvertiser Ad Components for Next.js
 *
 * These components inject Bidvertiser ad scripts directly into the main
 * document DOM (not iframes) so that:
 *   - Protocol detection sees https: (not about:srcdoc)
 *   - Referrer header is correct (not about:srcdoc)
 *   - No mixed content issues from protocol mismatch
 *
 * React DOM interference is avoided by using refs and only appending
 * to a container that React doesn't manage internally.
 */

interface BidvertiserBannerProps {
  className?: string;
  slot?: string;
  /** Include fid parameter (use false for the basic banner code) */
  withFid?: boolean;
}

/**
 * Bidvertiser Banner Ad — pid=941460, bid=2103678
 * Set withFid=true for the fid=2103678 variant.
 */
export function BidvertiserBanner({
  className = "",
  slot = "banner",
  withFid = false,
}: BidvertiserBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    // Bidvertiser banner uses document.write() internally.
    // We must use a same-origin iframe but with a real src to preserve
    // the correct protocol and referrer.
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "width:468px;height:60px;border:none;overflow:hidden;";
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("title", "Advertisement");
    containerRef.current.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (doc) {
      const src = withFid
        ? "//bdv.bidvertiser.com/BidVertiser.dbm?pid=941460&bid=2103678&fid=2103678"
        : "//bdv.bidvertiser.com/BidVertiser.dbm?pid=941460&bid=2103678";
      doc.open();
      doc.write(`<!DOCTYPE html><html><head>
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style>
</head><body>
<script data-cfasync="false" src="${src}" type="text/javascript"><\/script>
</body></html>`);
      doc.close();
    }
  }, [withFid]);

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
 * Injects the native widget into a same-origin iframe created via
 * document.write(). This preserves the parent page's https: protocol
 * and referrer, avoiding mixed content blocks.
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

  useEffect(() => {
    if (!containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = `width:100%;min-height:${rows * 200}px;border:none;overflow:hidden;`;
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("title", "Sponsored content");
    containerRef.current.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head>
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style>
</head><body>
<div id="ntv_2103678"></div>
<script type="text/javascript">
(function(d) {
  var params = {
    bvwidgetid: "ntv_2103678",
    bvlinksownid: 2103678,
    rows: ${rows},
    cols: ${cols},
    textpos: "left",
    imagewidth: ${imageWidth},
    mobilecols: ${mobileCols},
    cb: (new Date()).getTime()
  };
  params.bvwidgetid = "ntv_2103678" + params.cb;
  d.getElementById("ntv_2103678").id = params.bvwidgetid;
  var qs = Object.keys(params).reduce(function(a, k){
    a.push(k + '=' + encodeURIComponent(params[k]));
    return a;
  }, []).join(String.fromCharCode(38));
  var s = d.createElement('script');
  s.type = 'text/javascript';
  s.async = true;
  s.src = "https://cdn.hyperpromote.com/bidvertiser/tags/active/bdvws.js?" + qs;
  d.getElementById(params.bvwidgetid).appendChild(s);
})(document);
<\/script>
</body></html>`);
      doc.close();
    }
  }, [cols, rows, mobileCols, imageWidth]);

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
