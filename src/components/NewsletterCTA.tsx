import Link from "next/link";

interface NewsletterCTAProps {
  locale?: "tr" | "en";
}

const texts = {
  tr: {
    weeklyNewsletter: "Haftalık Bülten",
    newsletterDesc: "En son AI gelişmelerini kaçırmayın.",
    subscribe: "Abone Ol",
    instantNotifications: "Anlık Bildirimler",
    notificationsDesc: "Son dakika haberleri cebinize gelsin.",
    activate: "Aktifleştir",
  },
  en: {
    weeklyNewsletter: "Weekly Newsletter",
    newsletterDesc: "Don't miss the latest AI developments.",
    subscribe: "Subscribe",
    instantNotifications: "Instant Notifications",
    notificationsDesc: "Get breaking news on your phone.",
    activate: "Activate",
  },
};

export function NewsletterCTA({ locale = "tr" }: NewsletterCTAProps) {
  const t = texts[locale];

  return (
    <div className="mb-8 sm:mb-10 lg:mb-12 grid gap-4 sm:gap-5 md:grid-cols-2">
      {/* Newsletter Card */}
      <div className="flex items-center justify-between gap-4 rounded-xl lg:rounded-2xl bg-gradient-to-r from-ai-primary/15 via-ai-primary/10 to-ai-primary/5 border border-ai-primary/20 p-5 sm:p-6 dark:from-ai-primary/10 dark:via-ai-primary/5 dark:to-ai-primary/0 dark:border-ai-primary/30 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ai-primary to-ai-primary-hover text-white shadow-lg shadow-ai-primary/30">
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">mail</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-0.5">{t.weeklyNewsletter}</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-ai-text-secondary line-clamp-1">{t.newsletterDesc}</p>
          </div>
        </div>
        <Link
          href="#newsletter"
          className="shrink-0 rounded-xl bg-gradient-to-r from-ai-primary to-ai-primary-hover px-4 py-2 text-xs sm:text-sm font-bold text-white hover:shadow-lg hover:shadow-ai-primary/30 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {t.subscribe}
        </Link>
      </div>

      {/* Notifications Card */}
      <div className="flex items-center justify-between gap-4 rounded-xl lg:rounded-2xl bg-white dark:bg-ai-surface-card border border-gray-100 dark:border-ai-surface-border p-5 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ai-surface-border to-ai-surface-hover text-white shadow-lg">
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">notifications_active</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-0.5">{t.instantNotifications}</h3>
            <p className="text-xs sm:text-sm text-ai-text-secondary line-clamp-1">{t.notificationsDesc}</p>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-xl border-2 border-ai-surface-border bg-transparent px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-white hover:bg-ai-surface-border hover:border-ai-primary/50 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {t.activate}
        </button>
      </div>
    </div>
  );
}
