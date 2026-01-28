/**
 * English Layout
 * Wraps all /en/* pages with English-specific layout
 */

import { Metadata } from "next";
import Link from "next/link";

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
  return (
    <div className="min-h-screen flex flex-col" lang="en">
      {/* English Header */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/en" className="text-xl font-bold text-blue-600">
              AI News
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/en"
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300"
              >
                Home
              </Link>
              <Link
                href="/en/news"
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300"
              >
                News
              </Link>
              <Link
                href="/en/categories"
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300"
              >
                Categories
              </Link>
              <Link
                href="/en/contact"
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300"
              >
                Contact
              </Link>
            </nav>

            {/* Language Switcher */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-blue-600"
                title="Türkçe"
              >
                🇹🇷 TR
              </Link>
              <span className="text-sm font-semibold text-blue-600">🇬🇧 EN</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* English Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-semibold mb-4">AI News</h3>
              <p className="text-gray-400 text-sm">
                Latest news from artificial intelligence and technology world.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/en" className="hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/en/news" className="hover:text-white">
                    All News
                  </Link>
                </li>
                <li>
                  <Link href="/en/about" className="hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/en/contact" className="hover:text-white">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/en/privacy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/en/terms" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Language */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Language</h3>
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white flex items-center gap-2"
                >
                  🇹🇷 Türkçe
                </Link>
                <span className="text-white flex items-center gap-2">
                  🇬🇧 English
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            © 2026 AI News. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
