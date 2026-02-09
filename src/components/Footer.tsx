import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { db } from "@/lib/db";

// Force dynamic rendering to avoid SSR issues
export const dynamic = "force-dynamic";

interface FooterProps {
  locale?: "tr" | "en";
}

const translations = {
  tr: {
    subscribe: "Bültenimize Abone Olun",
    subscribeDesc: "Haftalık AI haberlerini ve özel içerikleri kaçırmayın",
    siteName: "AI Haberleri",
    siteDesc: "Türkiye'nin en kapsamlı yapay zeka haber platformu. Güncel AI haberleri, trendler ve analizlerle teknoloji dünyasına bakış açınızı genişletin.",
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
    newsPath: "/haberler",
    categoryPath: "/category",
  },
  en: {
    subscribe: "Subscribe to Our Newsletter",
    subscribeDesc: "Don't miss weekly AI news and exclusive content",
    siteName: "AI News",
    siteDesc: "The most comprehensive AI news platform. Expand your perspective on the technology world with the latest AI news, trends and analyses.",
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
  // Auto-detect locale from pathname if not provided
  let detectedLocale: "tr" | "en" = locale || "tr";

  if (!locale) {
    try {
      // Dynamic import to avoid static analysis issues in pages router
      const { headers } = await import("next/headers");
      const headersList = await headers();
      const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";
      if (pathname.startsWith("/en")) {
        detectedLocale = "en";
      }
    } catch {
      // Fallback to TR if headers not available
    }
  }

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
    } catch (error) {
      console.error("Error fetching footer data:", error);
    }
  }

  const socialIcons: Record<string, string> = {
    youtube: "smart_display",
    facebook: "facebook",
    instagram: "photo_camera",
    twitter: "alternate_email",
    bluesky: "cloud",
    mastodon: "diversity_3",
    linkedin: "work",
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
                <h3 className="text-xl font-bold text-white">
                  {t.subscribe}
                </h3>
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
            <Link href={basePath || "/"} className="flex items-center gap-3 mb-4">
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
                socialMedia.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                    title={social.platform}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {socialIcons[social.platform.toLowerCase()] || "link"}
                    </span>
                  </a>
                ))
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
                    <span className="material-symbols-outlined text-[20px]">
                      cloud
                    </span>
                  </a>
                  <a
                    href="https://mastodon.social/@aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                    title="Mastodon"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      diversity_3
                    </span>
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
                { href: `${basePath}/cookies`, label: t.cookies, icon: "cookie" },
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
