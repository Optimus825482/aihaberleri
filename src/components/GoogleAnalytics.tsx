"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// GA4 property — loaded only if env var is explicitly set.
// GTM (GoogleTagManager component) already handles G-MH4761CLYD tracking.
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function GoogleAnalytics() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only load in production and only if GA_ID is explicitly configured
  if (process.env.NODE_ENV !== "production" || !GA_ID) {
    return null;
  }

  // Wait for client-side render (hydration fix)
  if (!isClient) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
