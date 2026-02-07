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
    <div className="mb-12 grid gap-6 md:grid-cols-2">
      {/* Newsletter Card */}
      <div className="flex items-center justify-between rounded-xl bg-ai-primary/10 border border-ai-primary/20 p-6 dark:bg-ai-primary/5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ai-primary/20 text-ai-primary">
            <span className="material-symbols-outlined">mail</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{t.weeklyNewsletter}</h3>
            <p className="text-sm text-slate-600 dark:text-ai-text-secondary">{t.newsletterDesc}</p>
          </div>
        </div>
        <Link
          href="#newsletter"
          className="shrink-0 rounded-lg bg-ai-primary px-4 py-2 text-sm font-semibold text-white hover:bg-ai-primary/90 transition-colors"
        >
          {t.subscribe}
        </Link>
      </div>

      {/* Notifications Card */}
      <div className="flex items-center justify-between rounded-xl bg-ai-surface-card border border-ai-surface-border p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ai-surface-border text-white">
            <span className="material-symbols-outlined">notifications_active</span>
          </div>
          <div>
            <h3 className="font-bold text-white">{t.instantNotifications}</h3>
            <p className="text-sm text-ai-text-secondary">{t.notificationsDesc}</p>
          </div>
        </div>
        <button className="shrink-0 rounded-lg border border-ai-surface-border bg-transparent px-4 py-2 text-sm font-semibold text-white hover:bg-ai-surface-border transition-colors">
          {t.activate}
        </button>
      </div>
    </div>
  );
}
