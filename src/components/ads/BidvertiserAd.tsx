"use client";

/**
 * Bidvertiser Ad Components for Next.js
 *
 * Problem: Bidvertiser scripts use document.write() and getElementById()
 * internally. In React/Next.js:
 *   - document.write() is blocked in dynamically injected scripts
 *   - getElementById() fails because React manages the DOM
 *
 * Solution: Use srcdoc iframes. The browser parses srcdoc as a fresh
 * HTML document where document.write() works naturally and getElementById()
 * always finds the correct element. Complete isolation from React's DOM.
 */

interface BidvertiserBannerProps {
  className?: string;
  slot?: string;
}

const BANNER_HTML = `<!DOCTYPE html>
<html><head>
<style>
  html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
</style>
</head><body>
<!-- Begin BidVertiser code -->
<SCRIPT data-cfasync="false" SRC="//bdv.bidvertiser.com/BidVertiser.dbm?pid=941460&bid=2103678&fid=2103678" TYPE="text/javascript"></SCRIPT>
<!-- End BidVertiser code -->
</body></html>`;

/**
 * Bidvertiser Banner Ad
 * Renders the official banner script inside an isolated srcdoc iframe.
 */
export function BidvertiserBanner({
  className = "",
  slot = "banner",
}: BidvertiserBannerProps) {
  return (
    <iframe
      srcDoc={BANNER_HTML}
      className={`bidvertiser-banner border-0 block ${className}`}
      style={{ width: 468, height: 60, overflow: "hidden" }}
      data-ad-slot={slot}
      title="Advertisement"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
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

function buildNativeHtml(
  cols: number,
  rows: number,
  mobileCols: number,
  imageWidth: number,
): string {
  return `<!DOCTYPE html>
<html><head>
<style>
  html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
</style>
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
  var p = 'https:' == document.location.protocol ? 'https' : 'http';
  s.src = p + "://cdn.hyperpromote.com/bidvertiser/tags/active/bdvws.js?" + qs;
  d.getElementById(params.bvwidgetid).appendChild(s);
})(document);
</script>
</body></html>`;
}

/**
 * Bidvertiser Native Widget
 * Renders the official native ad widget inside an isolated srcdoc iframe.
 */
export function BidvertiserNative({
  className = "",
  slot = "native",
  cols = 1,
  rows = 1,
  mobileCols = 1,
  imageWidth = 150,
}: BidvertiserNativeProps) {
  const html = buildNativeHtml(cols, rows, mobileCols, imageWidth);

  return (
    <iframe
      srcDoc={html}
      className={`bidvertiser-native border-0 block ${className}`}
      style={{ width: "100%", minHeight: rows * 200, overflow: "hidden" }}
      data-ad-slot={slot}
      title="Sponsored content"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
    />
  );
}
