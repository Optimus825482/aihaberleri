/**
 * English Layout
 * Wraps all /en/* pages with English-specific metadata
 * Header and Footer are provided by root layout and auto-detect locale
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | AI News",
    default: "AI News - Artificial Intelligence & Technology News",
  },
  description:
    "Latest news from artificial intelligence, machine learning, and technology world.",
  metadataBase: new URL("https://aihaberleri.org"),
  alternates: {
    canonical: "/en",
    languages: {
      tr: "/",
      en: "/en",
    },
  },
  openGraph: {
    locale: "en_US",
    alternateLocale: ["tr_TR"],
  },
};

export default function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Just render children - header and footer are provided by root layout
  // Footer auto-detects locale from pathname
  return <>{children}</>;
}
