"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface PushNotificationButtonProps {
  locale?: "tr" | "en";
}

const texts = {
  tr: {
    unsupported: "Push bildirimleri bu tarayıcıda desteklenmiyor",
    denied: "Bildirim izni reddedildi",
    subscribeSuccess: "✅ Bildirimler başarıyla aktif edildi!",
    genericError: "Bir hata oluştu",
    subscribeError: "Bildirim aboneliği sırasında bir hata oluştu",
    unsubscribeSuccess: "✅ Bildirimler kapatıldı",
    blocked:
      "Bildirimler engellenmiş. Tarayıcı ayarlarından izin verebilirsiniz.",
    title: "Push Bildirimleri",
    turnOff: "🔕 Bildirimleri Kapat",
    turnOn: "🔔 Bildirimleri Aç",
    subscribedHint: "Yeni haberlerden anında haberdar oluyorsunuz",
    unsubscribedHint: "Yeni haberlerden anında haberdar olun",
  },
  en: {
    unsupported: "Push notifications are not supported in this browser",
    denied: "Notification permission denied",
    subscribeSuccess: "✅ Notifications enabled successfully!",
    genericError: "An error occurred",
    subscribeError: "An error occurred while subscribing to notifications",
    unsubscribeSuccess: "✅ Notifications disabled",
    blocked: "Notifications are blocked. You can allow them in browser settings.",
    title: "Push Notifications",
    turnOff: "🔕 Disable Notifications",
    turnOn: "🔔 Enable Notifications",
    subscribedHint: "You are receiving instant updates for new articles",
    unsubscribedHint: "Get instant updates for new articles",
  },
};

export function PushNotificationButton({ locale }: PushNotificationButtonProps) {
  const pathname = usePathname();
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const resolvedLocale: "tr" | "en" =
    locale || (pathname?.startsWith("/en") ? "en" : "tr");
  const t = texts[resolvedLocale];

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(!!subscription);
      } catch (error) {
        console.error("Check subscription error:", error);
      }
    }
  };

  const subscribeToPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert(t.unsupported);
      return;
    }

    setLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== "granted") {
        alert(t.denied);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      // Note: You need to add your VAPID public key here
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
        setSubscribed(true);
        alert(t.subscribeSuccess);
      } else {
        alert(`❌ ${data.error || t.genericError}`);
      }
    } catch (error) {
      console.error("Push subscription error:", error);
      alert(t.subscribeError);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        setSubscribed(false);
        alert(t.unsubscribeSuccess);
      }
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      alert(t.genericError);
    } finally {
      setLoading(false);
    }
  };

  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("Notification" in window);
  }, []);

  if (!isSupported) {
    return null;
  }

  if (permission === "denied") {
    return (
      <div className="text-xs text-muted-foreground">
        {t.blocked}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-sm mb-2">{t.title}</h4>
      <button
        onClick={subscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className={`w-full px-4 py-2 text-sm rounded-md transition-colors disabled:opacity-50 ${
          subscribed
            ? "bg-muted text-muted-foreground hover:bg-muted/80"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {loading
          ? "..."
          : subscribed
            ? t.turnOff
            : t.turnOn}
      </button>
      <p className="text-xs text-muted-foreground mt-2">
        {subscribed
          ? t.subscribedHint
          : t.unsubscribedHint}
      </p>
    </div>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  // Safe check for window
  if (typeof window === "undefined") {
    return new Uint8Array(0);
  }

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}
