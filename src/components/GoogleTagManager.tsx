"use client";

import Script from "next/script";

export function GoogleTagManager() {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-59TBBZLC";

  if (!GTM_ID) {
    return null;
  }

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');
      `}
      </Script>
      {/* 
        NoScript fallback is usually placed in body, but Next.js Script component is for head/scripts.
        For GTM noscript iframe, it needs to be a standard standard HTML element in layout body.
        We will export a separate component for that.
      */}
    </>
  );
}

export function GoogleTagManagerNoScript() {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-59TBBZLC";

  if (!GTM_ID) {
    return null;
  }

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
