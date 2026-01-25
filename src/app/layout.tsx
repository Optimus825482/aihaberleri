import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClientProviders } from "@/components/ClientProviders";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const inter = Inter({ subsets: ["latin"] });

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
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/Icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/Icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/Icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/Icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/Icon-180.png",
        sizes: "180x180",
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
    url: process.env.NEXT_PUBLIC_SITE_URL,
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
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AI Haberleri" />
        <link rel="manifest" href="/manifest.json" />
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
        <GoogleAnalytics />
        {children}
        <ClientProviders />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
