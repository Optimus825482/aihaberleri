"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export function GoogleAnalytics() {
  const [isClient, setIsClient] = useState(false);
  const GA_MEASUREMENT_ID =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-VGSRP03RKW";

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Production'da değilse GA'yi yükleme
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  // Client-side render olana kadar bekleme (hydration fix)
  if (!isClient) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
