import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { db } from "@/lib/db";
import { Youtube, Facebook, Instagram, Twitter } from "lucide-react";

export async function Footer() {
  const currentYear = new Date().getFullYear();

  // Fetch all categories
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
  });

  // Fetch social media links
  const socialMedia = await db.socialMedia.findMany({
    where: { enabled: true },
  });

  const socialIcons: Record<string, React.ReactNode> = {
    youtube: <Youtube className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
    instagram: <Instagram className="h-5 w-5" />,
    twitter: <Twitter className="h-5 w-5" />,
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
                  href="/admin"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Yönetim Paneli
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
                  {socialIcons[social.platform]}
                  <span className="text-sm capitalize">{social.platform}</span>
                </a>
              ))}
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
              href="/about"
              className="hover:text-primary transition-colors"
            >
              Hakkımızda
            </Link>
            {" · "}
            <a
              href="mailto:info@aihaberleriorg.com"
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
