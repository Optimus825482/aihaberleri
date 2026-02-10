import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { db } from "@/lib/db";

interface FooterProps {
  locale?: "tr" | "en";
}

const translations = {
  tr: {
    subscribe: "Bültenimize Abone Olun",
    subscribeDesc: "Haftalık AI haberlerini ve özel içerikleri kaçırmayın",
    siteName: "AI Haberleri",
    siteDesc:
      "Türkiye'nin en kapsamlı yapay zeka haber platformu. Güncel AI haberleri, trendler ve analizlerle teknoloji dünyasına bakış açınızı genişletin.",
    categories: "Kategoriler",
    quickLinks: "Hızlı Bağlantılar",
    legal: "Yasal",
    home: "Ana Sayfa",
    latestNews: "Son Haberler",
    about: "Hakkımızda",
    contact: "İletişim",
    faq: "SSS",
    privacy: "Gizlilik Politikası",
    terms: "Hizmet Şartları",
    cookies: "Çerez Politikası",
    kvkk: "KVKK Aydınlatma",
    copyright: "AI Haberleri. Tüm hakları saklıdır.",
    privacyShort: "Gizlilik",
    termsShort: "Şartlar",
    sitemap: "Site Haritası",
    newsPath: "/news",
    categoryPath: "/category",
  },
  en: {
    subscribe: "Subscribe to Our Newsletter",
    subscribeDesc: "Don't miss weekly AI news and exclusive content",
    siteName: "AI News",
    siteDesc:
      "The most comprehensive AI news platform. Expand your perspective on the technology world with the latest AI news, trends and analyses.",
    categories: "Categories",
    quickLinks: "Quick Links",
    legal: "Legal",
    home: "Home",
    latestNews: "Latest News",
    about: "About Us",
    contact: "Contact",
    faq: "FAQ",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    cookies: "Cookie Policy",
    kvkk: "Data Protection",
    copyright: "AI News. All rights reserved.",
    privacyShort: "Privacy",
    termsShort: "Terms",
    sitemap: "Sitemap",
    newsPath: "/en/news",
    categoryPath: "/en/category",
  },
};

export async function Footer({ locale }: FooterProps) {
  // Locale is always "tr" when rendered from root layout (LayoutWrapper hides footer for /en)
  // For explicit usage, locale prop can be passed directly
  const detectedLocale: "tr" | "en" = locale || "tr";

  const t = translations[detectedLocale];
  const basePath = detectedLocale === "en" ? "/en" : "";
  // Static year to prevent hydration mismatch
  const currentYear = 2026;

  // Skip database queries during build or when DB is unavailable
  const isBuildTime =
    process.env.SKIP_ENV_VALIDATION === "1" ||
    process.env.NEXT_PHASE === "phase-production-build";

  let categories: Array<{
    id: string;
    name: string;
    slug: string;
    order: number;
  }> = [];
  let socialMedia: Array<{
    id: string;
    platform: string;
    url: string;
    enabled: boolean;
  }> = [];

  if (!isBuildTime) {
    try {
      // Fetch all categories
      categories = await db.category.findMany({
        orderBy: { order: "asc" },
      });

      // Fetch social media links
      socialMedia = await db.socialMedia.findMany({
        where: { enabled: true },
      });

      // Ensure Bluesky and Mastodon are always present
      const hasBsky = socialMedia.some(
        (s) => s.platform.toLowerCase() === "bluesky",
      );
      const hasMastodon = socialMedia.some(
        (s) => s.platform.toLowerCase() === "mastodon",
      );
      if (!hasBsky) {
        socialMedia.push({
          id: "fallback-bsky",
          platform: "bluesky",
          url: "https://bsky.app/profile/aihaberleri.bsky.social",
          enabled: true,
        });
      }
      if (!hasMastodon) {
        socialMedia.push({
          id: "fallback-mastodon",
          platform: "mastodon",
          url: "https://mastodon.social/@aihaberleri",
          enabled: true,
        });
      }
    } catch (error) {
      console.error("Error fetching footer data:", error);
    }
  }

  const socialIcons: Record<string, string> = {
    youtube: "smart_display",
    facebook: "facebook",
    instagram: "photo_camera",
    twitter: "alternate_email",
    linkedin: "work",
  };

  // Custom SVG icons for platforms without Material Symbols equivalents
  const customSvgIcons: Record<string, JSX.Element> = {
    bluesky: (
      <svg
        viewBox="0 0 568 501"
        className="w-5 h-5 fill-current"
        aria-hidden="true"
      >
        <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 57.9464C568 75.2916 558.055 203.659 552.222 224.501C531.947 296.954 458.067 315.434 392.347 304.249C507.222 323.8 536.444 388.56 473.333 453.32C353.473 576.312 301.061 422.461 287.631 383.039C285.169 375.812 284.017 372.431 284 375.306C283.983 372.431 282.831 375.812 280.369 383.039C266.939 422.461 214.527 576.312 94.6667 453.32C31.5556 388.56 60.7778 323.8 175.653 304.249C109.933 315.434 36.0533 296.954 15.7778 224.501C9.94525 203.659 0 75.2916 0 57.9464C0 -28.9064 76.1345 -1.61183 123.121 33.6637Z" />
      </svg>
    ),
    mastodon: (
      <svg
        viewBox="0 0 448 512"
        className="w-5 h-5 fill-current"
        aria-hidden="true"
      >
        <path d="M433 179.11c0-97.2-63.71-125.7-63.71-125.7-62.52-28.7-228.56-28.4-290.48 0 0 0-63.72 28.5-63.72 125.7 0 115.7-6.6 259.4 105.63 289.1 40.51 10.7 75.32 13 103.33 11.4 50.81-2.8 79.32-18.1 79.32-18.1l-1.7-36.9s-36.31 11.4-77.12 10.1c-40.41-1.4-83-4.4-89.63-54a102.54 102.54 0 0 1-.9-13.9c85.63 20.9 158.65 9.1 178.75 6.7 56.12-6.7 105-41.3 111.23-72.9 9.8-49.8 9-121.5 9-121.5zm-75.12 125.2h-46.63v-114.2c0-49.7-64-51.6-64 6.9v62.5h-46.33V197c0-58.5-64-56.6-64-6.9v114.2H90.19c0-122.1-5.2-147.9 18.41-175 25.9-28.9 79.82-30.8 103.83 6.1l11.6 19.5 11.6-19.5c24.11-37.1 78.12-34.8 103.83-6.1 23.71 27.3 18.4 53 18.4 175z" />
      </svg>
    ),
  };

  return (
    <footer className="border-t border-ai-surface-border bg-ai-background-dark">
      {/* Newsletter Section */}
      <div className="border-b border-ai-surface-border">
        <div className="container mx-auto px-4 py-10 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-ai-surface-card rounded-xl p-6 md:p-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="material-symbols-outlined text-ai-primary text-[28px]">
                  mail
                </span>
                <h3 className="text-xl font-bold text-white">{t.subscribe}</h3>
              </div>
              <p className="text-ai-text-secondary text-sm">
                {t.subscribeDesc}
              </p>
            </div>
            <div className="w-full md:w-auto">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href={basePath || "/"}
              className="flex items-center gap-3 mb-4"
            >
              <Logo size="md" showText={false} />
              <span className="text-xl font-bold text-white">{t.siteName}</span>
            </Link>
            <p className="text-sm text-ai-text-secondary mb-6 leading-relaxed">
              {t.siteDesc}
            </p>
            <div className="flex items-center gap-3 mb-4">
              <PushNotificationButton />
            </div>
            {/* Social Icons Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {socialMedia.length > 0 ? (
                socialMedia.map((social) => {
                  const key = social.platform.toLowerCase();
                  const svgIcon = customSvgIcons[key];
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel={
                        key === "mastodon"
                          ? "noopener noreferrer me"
                          : "noopener noreferrer"
                      }
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                      title={social.platform}
                    >
                      {svgIcon || (
                        <span className="material-symbols-outlined text-[20px]">
                          {socialIcons[key] || "link"}
                        </span>
                      )}
                    </a>
                  );
                })
              ) : (
                <>
                  <a
                    href="https://twitter.com/aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                    title="Twitter"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      alternate_email
                    </span>
                  </a>
                  <a
                    href="https://bsky.app/profile/aihaberleri.bsky.social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                    title="Bluesky"
                  >
                    {customSvgIcons.bluesky}
                  </a>
                  <a
                    href="https://mastodon.social/@aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                    title="Mastodon"
                  >
                    {customSvgIcons.mastodon}
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-ai-primary text-[20px]">
                category
              </span>
              {t.categories}
            </h3>
            <ul className="space-y-2.5">
              {categories.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`${t.categoryPath}/${category.slug}`}
                    className="text-sm text-ai-text-secondary hover:text-ai-primary transition-colors flex items-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform">
                      {category.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-ai-primary text-[20px]">
                link
              </span>
              {t.quickLinks}
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: basePath || "/", label: t.home, icon: "home" },
                { href: t.newsPath, label: t.latestNews, icon: "newspaper" },
                { href: `${basePath}/about`, label: t.about, icon: "info" },
                { href: `${basePath}/contact`, label: t.contact, icon: "mail" },
                { href: `${basePath}/sss`, label: t.faq, icon: "help" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ai-text-secondary hover:text-ai-primary transition-colors flex items-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-ai-primary text-[20px]">
                gavel
              </span>
              {t.legal}
            </h3>
            <ul className="space-y-2.5">
              {[
                {
                  href: `${basePath}/privacy`,
                  label: t.privacy,
                  icon: "shield",
                },
                {
                  href: `${basePath}/terms`,
                  label: t.terms,
                  icon: "description",
                },
                {
                  href: `${basePath}/cookies`,
                  label: t.cookies,
                  icon: "cookie",
                },
                {
                  href: `${basePath}/kvkk`,
                  label: t.kvkk,
                  icon: "verified_user",
                },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ai-text-secondary hover:text-ai-primary transition-colors flex items-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Contact Info */}
            <div className="mt-6 pt-4 border-t border-ai-surface-border">
              <a
                href="mailto:info@aihaberleri.org"
                className="flex items-center gap-2 text-sm text-ai-text-secondary hover:text-ai-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  mail
                </span>
                info@aihaberleri.org
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-ai-surface-border bg-ai-surface-dark">
        <div className="container mx-auto px-4 py-5 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-ai-text-muted text-center sm:text-left">
              © {currentYear} {t.copyright}
            </p>
            <div className="flex items-center gap-4 text-sm text-ai-text-muted">
              <Link
                href={`${basePath}/privacy`}
                className="hover:text-ai-primary transition-colors"
              >
                {t.privacyShort}
              </Link>
              <span className="text-ai-surface-border">•</span>
              <Link
                href={`${basePath}/terms`}
                className="hover:text-ai-primary transition-colors"
              >
                {t.termsShort}
              </Link>
              <span className="text-ai-surface-border">•</span>
              <Link
                href="/sitemap.xml"
                className="hover:text-ai-primary transition-colors"
              >
                {t.sitemap}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
