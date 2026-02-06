import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { db } from "@/lib/db";
import { Youtube, Facebook, Instagram, Twitter } from "lucide-react";

// Custom icons for platforms not in lucide-react
const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const MastodonIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 00.023-.043v-1.809a.052.052 0 00-.02-.041.053.053 0 00-.046-.01 20.282 20.282 0 01-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 01-.319-1.433.053.053 0 01.066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.668 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
  </svg>
);

const TumblrIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.06 9.927 0 10.066 0h3.803v6.091h5.17v3.656h-5.193v7.389c.011 1.541.657 2.155 1.697 2.155.977 0 1.796-.383 2.227-.628l1.697 3.447c-.544.4-2.418 1.378-5.629 1.378z" />
  </svg>
);

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
      // Gracefully degrade - component will render with empty arrays
    }
  }

  const socialIcons: Record<string, React.ReactNode> = {
    youtube: <Youtube className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
    instagram: <Instagram className="h-5 w-5" />,
    twitter: <Twitter className="h-5 w-5" />,
    bluesky: <BlueskyIcon className="h-5 w-5" />,
    mastodon: <MastodonIcon className="h-5 w-5" />,
    tumblr: <TumblrIcon className="h-5 w-5" />,
  };

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Newsletter */}
          <div>
            <Logo size="sm" className="mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Yapay zeka dünyasındaki gelişmeleri yakından takip edin.
            </p>

            <NewsletterForm />
            <div className="mt-4">
              <PushNotificationButton />
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-lg mb-4">Kategoriler</h3>
            <ul className="space-y-2 text-sm">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Hızlı Bağlantılar</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Anasayfa
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Hizmet Şartları
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  İletişim
                </Link>
              </li>
              <li>
                <Link
                  href="/sss"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  SSS
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bold text-lg mb-4">Bizi Takip Edin</h3>
            <div className="flex flex-col space-y-3">
              {socialMedia.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {socialIcons[social.platform.toLowerCase()] ||
                    socialIcons.twitter}
                  <span className="text-sm capitalize">{social.platform}</span>
                </a>
              ))}
              {/* Fallback/Static Twitter Link if not in DB (Migrated from Navbar) */}
              {!socialMedia.some(
                (s) => s.platform.toLowerCase() === "twitter",
              ) && (
                  <a
                    href="https://twitter.com/aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                    <span className="text-sm capitalize">Twitter</span>
                  </a>
                )}
              {/* Static Bluesky Link */}
              {!socialMedia.some(
                (s) => s.platform.toLowerCase() === "bluesky",
              ) && (
                  <a
                    href="https://bsky.app/profile/aihaberleri.bsky.social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <BlueskyIcon className="h-5 w-5" />
                    <span className="text-sm capitalize">Bluesky</span>
                  </a>
                )}
              {/* Static Mastodon Link */}
              {!socialMedia.some(
                (s) => s.platform.toLowerCase() === "mastodon",
              ) && (
                  <a
                    href="https://mastodon.social/@aihaberleri"
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MastodonIcon className="h-5 w-5" />
                    <span className="text-sm capitalize">Mastodon</span>
                  </a>
                )}
              {/* Static Tumblr Link */}
              {!socialMedia.some(
                (s) => s.platform.toLowerCase() === "tumblr",
              ) && (
                  <a
                    href="https://aihaberleri-org.tumblr.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <TumblrIcon className="h-5 w-5" />
                    <span className="text-sm capitalize">Tumblr</span>
                  </a>
                )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {currentYear} AI Haberleri. Tüm hakları saklıdır.</p>
          <p className="mt-2">
            <Link
              href="/privacy"
              className="hover:text-primary transition-colors"
            >
              Gizlilik Politikası
            </Link>
            {" · "}
            <Link
              href="/terms"
              className="hover:text-primary transition-colors"
            >
              Hizmet Şartları
            </Link>
            {" · "}
            <Link
              href="/about"
              className="hover:text-primary transition-colors"
            >
              Hakkımızda
            </Link>
            {" · "}
            <a
              href="mailto:info@aihaberleri.org"
              className="hover:text-primary transition-colors"
            >
              İletişim
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
