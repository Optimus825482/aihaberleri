import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { db } from "@/lib/db";

// Force dynamic rendering to avoid SSR issues
export const dynamic = "force-dynamic";

export async function Footer() {
  const currentYear = new Date().getFullYear();

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
    tumblr: "rss_feed",
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
                <h3 className="text-xl font-bold text-white">Bültenimize Abone Olun</h3>
              </div>
              <p className="text-ai-text-secondary text-sm">
                Haftalık AI haberlerini ve özel içerikleri kaçırmayın
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
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Logo size="md" showText={false} />
              <span className="text-xl font-bold text-white">AI Haberleri</span>
            </Link>
            <p className="text-sm text-ai-text-secondary mb-6 leading-relaxed">
              Türkiye'nin en kapsamlı yapay zeka haber platformu. Güncel AI haberleri,
              trendler ve analizlerle teknoloji dünyasına bakış açınızı genişletin.
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
                      <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                    </a>
                  <a
                    href="https://bsky.app/profile/aihaberleri.bsky.social"
                    target="_blank"
                    rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                      title="Bluesky"
                  >
                      <span className="material-symbols-outlined text-[20px]">cloud</span>
                    </a>
                  <a
                    href="https://mastodon.social/@aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer me"
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-ai-surface-card text-ai-text-secondary hover:text-ai-primary hover:bg-ai-surface-hover transition-colors"
                      title="Mastodon"
                  >
                      <span className="material-symbols-outlined text-[20px]">diversity_3</span>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-ai-primary text-[20px]">category</span>
              Kategoriler
            </h3>
            <ul className="space-y-2.5">
              {categories.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/category/${category.slug}`}
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
              <span className="material-symbols-outlined text-ai-primary text-[20px]">link</span>
              Hızlı Bağlantılar
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: "Ana Sayfa", icon: "home" },
                { href: "/haberler", label: "Son Haberler", icon: "newspaper" },
                { href: "/about", label: "Hakkımızda", icon: "info" },
                { href: "/contact", label: "İletişim", icon: "mail" },
                { href: "/sss", label: "SSS", icon: "help" },
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
              <span className="material-symbols-outlined text-ai-primary text-[20px]">gavel</span>
              Yasal
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/privacy", label: "Gizlilik Politikası", icon: "shield" },
                { href: "/terms", label: "Hizmet Şartları", icon: "description" },
                { href: "/cookies", label: "Çerez Politikası", icon: "cookie" },
                { href: "/kvkk", label: "KVKK Aydınlatma", icon: "verified_user" },
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
                <span className="material-symbols-outlined text-[18px]">mail</span>
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
              © {currentYear} AI Haberleri. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4 text-sm text-ai-text-muted">
              <Link href="/privacy" className="hover:text-ai-primary transition-colors">
                Gizlilik
              </Link>
              <span className="text-ai-surface-border">•</span>
              <Link href="/terms" className="hover:text-ai-primary transition-colors">
                Şartlar
              </Link>
              <span className="text-ai-surface-border">•</span>
              <Link href="/sitemap.xml" className="hover:text-ai-primary transition-colors">
                Site Haritası
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
