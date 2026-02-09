import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/db";

export async function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-ai-surface-border bg-white/80 dark:bg-[#111518]/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <MainNav items={siteConfig.mainNav} />
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search Form - Desktop */}
          <form action="/search" method="get" className="relative hidden sm:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ai-text-secondary pointer-events-none">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              name="q"
              className="h-9 w-48 sm:w-64 rounded-lg bg-gray-100 dark:bg-ai-surface-border border-transparent text-sm text-slate-900 dark:text-white placeholder-ai-text-secondary focus:border-ai-primary focus:bg-white dark:focus:bg-ai-surface-card focus:ring-0 pl-10 pr-3 py-2 transition-all"
              placeholder="Haber ara..."
              type="search"
              minLength={2}
              required
            />
          </form>
          {/* Subscribe Button - Desktop (scroll to newsletter section) */}
          <Link
            href="/#newsletter"
            className="hidden sm:flex items-center justify-center rounded-lg bg-ai-primary px-4 py-2 text-sm font-bold text-white hover:bg-ai-primary/90 transition-colors"
          >
            Abone Ol
          </Link>
          {/* Language Toggle */}
          <Link
            href="/en"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            title="English"
          >
            <span className="font-bold text-xs">EN</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
