"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// İki GA4 property: ana hesap + yeni akış
const GA_PRIMARY =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-LXSS4L3D1Y";
const GA_SECONDARY = "G-MH4761CLYD";

export function GoogleAnalytics() {
  const [isClient, setIsClient] = useState(false);

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
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_PRIMARY}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_PRIMARY}', {
            page_path: window.location.pathname,
          });
          gtag('config', '${GA_SECONDARY}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
