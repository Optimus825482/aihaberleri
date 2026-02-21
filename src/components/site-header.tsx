import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";

interface SiteHeaderProps {
  locale?: "tr" | "en";
}

const translations = {
  tr: {
    searchPlaceholder: "Haber ara...",
    subscribe: "Abone Ol",
    subscribeLink: "/#newsletter",
    langToggle: "EN",
    langToggleHref: "/en",
    langToggleTitle: "Switch to English",
    mainNav: [
      { title: "Ana Sayfa", href: "/" },
      { title: "Son Haberler", href: "/news" },
      { title: "Kategoriler", href: "/categories" },
      { title: "Hakkımızda", href: "/about" },
      { title: "İletişim", href: "/contact" },
    ],
  },
  en: {
    searchPlaceholder: "Search news...",
    subscribe: "Subscribe",
    subscribeLink: "/en#newsletter",
    langToggle: "TR",
    langToggleHref: "/",
    langToggleTitle: "Türkçe'ye geç",
    mainNav: [
      { title: "Home", href: "/en" },
      { title: "Latest News", href: "/en/news" },
      { title: "Categories", href: "/en/categories" },
      { title: "About", href: "/en/about" },
      { title: "Contact", href: "/en/contact" },
    ],
  },
};

export function SiteHeader({ locale = "tr" }: SiteHeaderProps) {
  const t = translations[locale];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-ai-surface-border bg-white/80 dark:bg-[#111518]/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <MainNav items={t.mainNav} locale={locale} />
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search Form - Desktop */}
          <form
            action={locale === "en" ? "/en/search" : "/search"}
            method="get"
            className="relative hidden sm:block"
          >
            <label htmlFor="site-search" className="sr-only">
              {t.searchPlaceholder}
            </label>
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ai-text-secondary pointer-events-none">
              <span className="material-symbols-outlined text-[20px]">
                search
              </span>
            </span>
            <input
              id="site-search"
              name="q"
              className="h-9 w-48 sm:w-64 rounded-lg bg-gray-100 dark:bg-ai-surface-border border-transparent text-sm text-slate-900 dark:text-white placeholder-ai-text-secondary focus:border-ai-primary focus:bg-white dark:focus:bg-ai-surface-card focus:ring-0 pl-10 pr-3 py-2 transition-all"
              placeholder={t.searchPlaceholder}
              type="search"
              aria-label={t.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              minLength={2}
              required
            />
          </form>
          {/* Subscribe Button - Desktop (scroll to newsletter section) */}
          <Link
            href={t.subscribeLink}
            className="hidden sm:flex items-center justify-center rounded-lg bg-ai-primary px-4 py-2 text-sm font-bold text-white hover:bg-ai-primary/90 transition-colors"
          >
            {t.subscribe}
          </Link>
          {/* Language Toggle */}
          <Link
            href={t.langToggleHref}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title={t.langToggleTitle}
          >
            <span className="font-bold text-xs">{t.langToggle}</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
