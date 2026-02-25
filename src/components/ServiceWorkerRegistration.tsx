"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Bell, Download, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { usePWA } from "@/context/PWAContext";

export function ServiceWorkerRegistration() {
  const pathname = usePathname();
  const locale: "tr" | "en" = pathname?.startsWith("/en") ? "en" : "tr";
  const t = {
    tr: {
      grantedTitle: "Bildirimler aktif!",
      grantedBody: "Sıcak gelişmeler cebinizde.",
      enabledTitle: "Bildirimler açıldı!",
      enabledBody: "Tarayıcı bildirimleri aktif.",
      incognitoError:
        "Gizli Sekme'de (Incognito) bildirimler çalışmaz! Lütfen normal sekmeye geçin.",
      subscribeError: "Bildirim kaydı başarısız oldu.",
      deniedError: "Bildirim izni reddedildi.",
      installTitle: "Uygulamayı Yükle",
      installDesc: "Hızlı erişim için ekle",
      installAction: "Yükle",
      closeInstall: "Yükleme bildirimini kapat",
      notifyTitle: "Bildirimleri Aç",
      notifyDesc: "Haberleri kaçırma",
      notifyAction: "Aç",
      closeNotify: "Bildirim kartını kapat",
    },
    en: {
      grantedTitle: "Notifications enabled!",
      grantedBody: "Breaking updates are now in your pocket.",
      enabledTitle: "Notifications turned on!",
      enabledBody: "Browser notifications are active.",
      incognitoError:
        "Notifications do not work in Incognito mode. Please switch to a normal tab.",
      subscribeError: "Notification subscription failed.",
      deniedError: "Notification permission denied.",
      installTitle: "Install App",
      installDesc: "Add it for quick access",
      installAction: "Install",
      closeInstall: "Close install prompt",
      notifyTitle: "Enable Notifications",
      notifyDesc: "Don't miss important news",
      notifyAction: "Enable",
      closeNotify: "Close notification prompt",
    },
  }[locale];

  const { isInstallable, installApp } = usePWA();
  const [showInstall, setShowInstall] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Service Worker Registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered");

          // Service Worker'ı güncelle (hydration fix için)
          registration.update();
        })
        .catch((err) => console.log("SW fail", err));
    }

    // Sync local UI state with global availability
    if (isInstallable) {
      setShowInstall(true);
    }

    // Notification Permission logic
    if (
      "Notification" in window &&
      Notification.permission === "default" &&
      !localStorage.getItem("notifications-dismissed")
    ) {
      setTimeout(() => setShowNotification(true), 3000);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    await installApp();
    setShowInstall(false);
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleNotification = async () => {
    if (!("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        setShowNotification(false);

        // Process Registration
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (vapidKey) {
          try {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });

            // Send to backend
            await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(subscription),
            });

            new Notification(t.grantedTitle, {
              body: t.grantedBody,
              icon: "/icons/icon-192x192.png",
            });
          } catch (err: any) {
            console.error("Subscription failed:", err);
            if (
              err.name === "AbortError" ||
              (err.message && err.message.includes("denied"))
            ) {
              toast.error(t.incognitoError, { duration: 5000 });
            } else {
              toast.error(t.subscribeError);
            }
          }
        } else {
          // Fallback if no VAPID key yet (just browser permission)
          new Notification(t.enabledTitle, {
            body: t.enabledBody,
            icon: "/icons/icon-192x192.png",
          });
        }
      }
    } catch (error: any) {
      console.error("Notification permission error:", error);
      toast.error(t.deniedError);
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
    localStorage.setItem("notifications-dismissed", "true");
  };

  if (!showInstall && !showNotification) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 md:left-auto md:right-4 md:w-80 safe-area-bottom">
      {showInstall && (
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-xl shadow-2xl border flex items-center justify-between animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2.5 rounded-full">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">{t.installTitle}</h4>
              <p className="text-xs text-muted-foreground">{t.installDesc}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={handleInstall} className="h-8 px-3 text-xs">
              {t.installAction}
            </Button>
            <button
              onClick={() => setShowInstall(false)}
              type="button"
              title={t.closeInstall}
              aria-label={t.closeInstall}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showNotification && (
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-xl shadow-2xl border flex items-center justify-between animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/50 p-2.5 rounded-full">
              <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">{t.notifyTitle}</h4>
              <p className="text-xs text-muted-foreground">{t.notifyDesc}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={handleNotification}
              className="h-8 px-3 text-xs bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            >
              {t.notifyAction}
            </Button>
            <button
              onClick={dismissNotification}
              type="button"
              title={t.closeNotify}
              aria-label={t.closeNotify}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
