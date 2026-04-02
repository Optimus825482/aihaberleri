import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClientProviders } from "@/components/ClientProviders";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ThemeProvider } from "@/components/theme-provider";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/GoogleTagManager";
import { YandexMetrika } from "@/components/YandexMetrika";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/Footer";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { AudioProvider } from "@/context/AudioContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HydrationErrorBoundary } from "@/components/HydrationErrorBoundary";
import { VisitorTracker } from "@/components/VisitorTracker";
import { AdSenseBootstrap } from "@/components/AdSenseBootstrap";
import { StickyBottomAd } from "@/components/StickyBottomAd";
import { Suspense } from "react";
import { PageLoadingIndicator } from "@/components/PageLoadingIndicator";

// Initialize scheduler (in-process fallback if worker not available)
import "@/lib/init-scheduler";

// Initialize cron jobs (visitor cleanup, etc.)
import "@/lib/init-cron";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "AI Haberleri - Yapay Zeka Dünyasından Güncel Haberler",
    template: "%s | AI Haberleri",
  },
  description:
    "Yapay zeka dünyasındaki gelişmeleri yakından takip edin. Güncel AI haberleri, makine öğrenimi, derin öğrenme ve teknoloji haberleri.",
  keywords: [
    "yapay zeka",
    "AI",
    "artificial intelligence",
    "makine öğrenimi",
    "machine learning",
    "derin öğrenme",
    "deep learning",
    "teknoloji haberleri",
    "AI haberleri",
  ],
  authors: [{ name: "AI Haberleri" }],
  creator: "AI Haberleri",
  publisher: "AI Haberleri",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org",
  ),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/Icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/Icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/Icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/Icon-180.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/icons/Icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Haberleri",
  },
  verification: {
    google: "6b655ec4-34d5-46c5-9331-0783527dca7b", // Google Search Console
    yandex: "43b39db24fc89b78",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "AI Haberleri",
    title: "AI Haberleri - Yapay Zeka Dünyasından Güncel Haberler",
    description:
      "Yapay zeka dünyasındaki gelişmeleri yakından takip edin. Güncel AI haberleri, makine öğrenimi ve teknoloji haberleri.",
    images: [
      {
        url: "/logos/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Haberleri",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Haberleri - Yapay Zeka Dünyasından Güncel Haberler",
    description:
      "Yapay zeka dünyasındaki gelişmeleri yakından takip edin. Güncel AI haberleri, makine öğrenimi ve teknoloji haberleri.",
    images: ["/logos/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <head>
        {/* iOS auto-linking prevention (hydration fix) */}
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />

        {/* Preconnect for LCP/FCP optimization */}
        <link rel="preconnect" href="https://images.aihaberleri.org" />
        <link
          rel="preconnect"
          href="https://image.pollinations.ai"
          crossOrigin="anonymous"
        />
        {/* Preconnect for Google Fonts (Material Symbols) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/*
          Material Symbols Outlined — preloaded with display=optional.
          Preconnect above ensures early connection; display=optional sets 0ms
          font-display block period so icons never block rendering.
          Moving from CSS @import → <link> allows parallel loading with other CSS.
        */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional"
          as="style"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional"
        />

        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* RSS Feed discovery — TR + EN */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="AI Haberleri RSS"
          href="/feed.xml"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="AI News RSS (English)"
          href="/en/feed.xml"
        />

        {/* WebSite + Organization Schema - Google Haberler için zorunlu (Mart 2025 yeni sistemi) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org"}/#website`,
                  name: "AI Haberleri",
                  url: process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org",
                  description: "Yapay zeka dünyasındaki gelişmeleri yakından takip edin",
                  inLanguage: "tr-TR",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org"}/search?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org"}/#organization`,
                  name: "AI Haberleri",
                  url: process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org",
                  // Google Haberler artık favicon'ı logo olarak kullanıyor (Mart 2025)
                  logo: {
                    "@type": "ImageObject",
                    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org"}/icons/Icon-512.png`,
                    width: 512,
                    height: 512,
                  },
                  sameAs: [
                    "https://twitter.com/aihaberleri",
                    "https://bsky.app/profile/aihaberleri.org",
                  ],
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "Customer Service",
                    email: "info@aihaberleri.org",
                    availableLanguage: "Turkish",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-background antialiased",
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <HydrationErrorBoundary>
            <ErrorBoundary>
              <AudioProvider>
                {/* Global Page Loading Indicator */}
                <Suspense fallback={null}>
                  <PageLoadingIndicator />
                </Suspense>
                <GoogleTagManagerNoScript />
                <GoogleAnalytics />
                <GoogleTagManager />
                <AdSenseBootstrap />
                <YandexMetrika />
                <VisitorTracker />
                <LayoutWrapper
                  header={<SiteHeader locale="tr" />}
                  headerEn={<SiteHeader locale="en" />}
                  footer={<Footer locale="tr" />}
                  footerEn={<Footer locale="en" />}
                >
                  {children}
                </LayoutWrapper>

                <StickyBottomAd />
                <ClientProviders />
                <ServiceWorkerRegistration />
                <TailwindIndicator />
              </AudioProvider>
            </ErrorBoundary>
          </HydrationErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
