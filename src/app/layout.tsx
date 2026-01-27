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
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/Footer";
import { AudioProvider } from "@/context/AudioContext";

// Initialize scheduler (in-process fallback if worker not available)
import "@/lib/init-scheduler";

const inter = Inter({ subsets: ["latin"], display: "swap" });

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
    icon: [{ url: "/logos/brand/ai-logo-dark.png", type: "image/png" }],
    apple: [
      {
        url: "/logos/brand/ai-logo-dark.png",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Haberleri",
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
    <html lang="tr" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-background antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AudioProvider>
            <GoogleTagManagerNoScript />
            <GoogleAnalytics />
            <GoogleTagManager />
            <SiteHeader />
            {children}
            <Footer />
            <ClientProviders />
            <ServiceWorkerRegistration />
            <TailwindIndicator />
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
