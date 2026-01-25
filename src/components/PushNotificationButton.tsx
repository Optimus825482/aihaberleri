"use client";

import { useState, useEffect } from "react";

export function PushNotificationButton() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

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
      alert("Push bildirimleri bu tarayıcıda desteklenmiyor");
      return;
    }

    setLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== "granted") {
        alert("Bildirim izni reddedildi");
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
        alert("✅ Bildirimler başarıyla aktif edildi!");
      } else {
        alert(`❌ ${data.error || "Bir hata oluştu"}`);
      }
    } catch (error) {
      console.error("Push subscription error:", error);
      alert("Bildirim aboneliği sırasında bir hata oluştu");
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
        alert("✅ Bildirimler kapatıldı");
      }
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      alert("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (!("Notification" in window)) {
    return null;
  }

  if (permission === "denied") {
    return (
      <div className="text-xs text-muted-foreground">
        Bildirimler engellenmiş. Tarayıcı ayarlarından izin verebilirsiniz.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-sm mb-2">Push Bildirimleri</h4>
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
            ? "🔕 Bildirimleri Kapat"
            : "🔔 Bildirimleri Aç"}
      </button>
      <p className="text-xs text-muted-foreground mt-2">
        {subscribed
          ? "Yeni haberlerden anında haberdar oluyorsunuz"
          : "Yeni haberlerden anında haberdar olun"}
      </p>
    </div>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}
