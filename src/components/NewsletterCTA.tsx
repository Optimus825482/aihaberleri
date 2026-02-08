"use client";

import { useState, useEffect } from "react";

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
    subscribed: "Abone Olundu",
    activated: "Aktif",
    enterEmail: "E-posta adresiniz",
    subscribing: "Abone olunuyor...",
    activating: "Aktifleştiriliyor...",
  },
  en: {
    weeklyNewsletter: "Weekly Newsletter",
    newsletterDesc: "Don't miss the latest AI developments.",
    subscribe: "Subscribe",
    instantNotifications: "Instant Notifications",
    notificationsDesc: "Get breaking news on your phone.",
    activate: "Activate",
    subscribed: "Subscribed",
    activated: "Active",
    enterEmail: "Your email address",
    subscribing: "Subscribing...",
    activating: "Activating...",
  },
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  if (typeof window === "undefined") {
    return new Uint8Array(new ArrayBuffer(0));
  }

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NewsletterCTA({ locale = "tr" }: NewsletterCTAProps) {
  const t = texts[locale];
  const [showNewsletterForm, setShowNewsletterForm] = useState(false);
  const [email, setEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    setPushSupported(
      "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window,
    );

    // Check if already subscribed to push
    checkPushSubscription();
  }, []);

  const checkPushSubscription = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushSubscribed(!!subscription);
      } catch (error) {
        console.error("Check subscription error:", error);
      }
    }
  };

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterLoading(true);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setNewsletterSubscribed(true);
        setEmail("");
        setTimeout(() => setShowNewsletterForm(false), 2000);
      } else {
        alert(
          data.error ||
            (locale === "tr" ? "Bir hata oluştu" : "An error occurred"),
        );
      }
    } catch (error) {
      alert(
        locale === "tr"
          ? "Bir hata oluştu. Lütfen tekrar deneyin."
          : "An error occurred. Please try again.",
      );
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handlePushActivate = async () => {
    if (!pushSupported) {
      alert(
        locale === "tr"
          ? "Push bildirimleri bu tarayıcıda desteklenmiyor"
          : "Push notifications are not supported in this browser",
      );
      return;
    }

    setPushLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert(
          locale === "tr"
            ? "Bildirim izni reddedildi"
            : "Notification permission denied",
        );
        setPushLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      const applicationServerKey = vapidKey
        ? urlBase64ToUint8Array(vapidKey)
        : undefined;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      const data = await response.json();

      if (data.success) {
        setPushSubscribed(true);
        alert(
          locale === "tr"
            ? "✅ Bildirimler başarıyla aktif edildi!"
            : "✅ Notifications activated successfully!",
        );
      } else {
        alert(
          `❌ ${data.error || (locale === "tr" ? "Bir hata oluştu" : "An error occurred")}`,
        );
      }
    } catch (error) {
      console.error("Push subscription error:", error);
      alert(
        locale === "tr"
          ? "Bildirim aboneliği sırasında bir hata oluştu"
          : "An error occurred during notification subscription",
      );
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="mb-8 sm:mb-10 lg:mb-12 grid gap-4 sm:gap-5 md:grid-cols-2">
      {/* Newsletter Card */}
      <div className="flex items-center justify-between gap-4 rounded-xl lg:rounded-2xl bg-gradient-to-r from-ai-primary/15 via-ai-primary/10 to-ai-primary/5 border border-ai-primary/20 p-5 sm:p-6 dark:from-ai-primary/10 dark:via-ai-primary/5 dark:to-ai-primary/0 dark:border-ai-primary/30 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ai-primary to-ai-primary-hover text-white shadow-lg shadow-ai-primary/30">
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
              mail
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-0.5">
              {t.weeklyNewsletter}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-ai-text-secondary line-clamp-1">
              {t.newsletterDesc}
            </p>

            {showNewsletterForm && !newsletterSubscribed && (
              <form
                onSubmit={handleNewsletterSubscribe}
                className="mt-3 flex gap-2"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.enterEmail}
                  required
                  disabled={newsletterLoading}
                  className="flex-1 px-3 py-1.5 text-xs border border-ai-surface-border rounded-lg bg-white dark:bg-ai-surface-dark text-slate-900 dark:text-white disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="px-3 py-1.5 text-xs bg-ai-primary text-white rounded-lg hover:bg-ai-primary-hover transition-colors disabled:opacity-50"
                >
                  {newsletterLoading ? "..." : t.subscribe}
                </button>
              </form>
            )}
          </div>
        </div>
        {!showNewsletterForm && (
          <button
            type="button"
            onClick={() => setShowNewsletterForm(true)}
            disabled={newsletterSubscribed}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 ${
              newsletterSubscribed
                ? "bg-green-600 cursor-default"
                : "bg-gradient-to-r from-ai-primary to-ai-primary-hover hover:shadow-lg hover:shadow-ai-primary/30"
            }`}
          >
            {newsletterSubscribed ? "✓ " + t.subscribed : t.subscribe}
          </button>
        )}
      </div>

      {/* Notifications Card */}
      <div className="flex items-center justify-between gap-4 rounded-xl lg:rounded-2xl bg-white dark:bg-ai-surface-card border border-gray-100 dark:border-ai-surface-border p-5 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ai-surface-border to-ai-surface-hover text-white shadow-lg">
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
              notifications_active
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-0.5">
              {t.instantNotifications}
            </h3>
            <p className="text-xs sm:text-sm text-ai-text-secondary line-clamp-1">
              {t.notificationsDesc}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePushActivate}
          disabled={pushLoading || pushSubscribed || !pushSupported}
          className={`shrink-0 rounded-xl border-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            pushSubscribed
              ? "border-green-600 bg-green-600 text-white"
              : "border-ai-surface-border bg-transparent text-slate-700 dark:text-white hover:bg-ai-surface-border hover:border-ai-primary/50"
          }`}
        >
          {pushLoading
            ? t.activating
            : pushSubscribed
              ? "✓ " + t.activated
              : t.activate}
        </button>
      </div>
    </div>
  );
}
