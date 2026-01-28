"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Bell, Download, X } from "lucide-react";

export function ServiceWorkerRegistration() {
  const [showInstall, setShowInstall] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Service Worker Registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW registered"))
        .catch((err) => console.log("SW fail", err));
    }

    // PWA Install Prompt logic
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Notification Permission logic
    if (
      "Notification" in window &&
      Notification.permission === "default" &&
      !localStorage.getItem("notifications-dismissed")
    ) {
      setTimeout(() => setShowNotification(true), 3000);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
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

            new Notification("Bildirimler aktif!", {
              body: "Sıcak gelişmeler cebinizde.",
              icon: "/icons/icon-192x192.png",
            });
          } catch (err: any) {
            console.error("Subscription failed:", err);
            if (
              err.name === "AbortError" ||
              (err.message && err.message.includes("denied"))
            ) {
              toast.error(
                "Gizli Sekme'de (Incognito) bildirimler çalışmaz! Lütfen normal sekmeye geçin.",
                { duration: 5000 },
              );
            } else {
              toast.error("Bildirim kaydı başarısız oldu.");
            }
          }
        } else {
          // Fallback if no VAPID key yet (just browser permission)
          new Notification("Bildirimler açıldı!", {
            body: "Tarayıcı bildirimleri aktif.",
            icon: "/icons/icon-192x192.png",
          });
        }
      }
    } catch (error: any) {
      console.error("Notification permission error:", error);
      toast.error("Bildirim izni reddedildi.");
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
              <h4 className="font-semibold text-sm">Uygulamayı Yükle</h4>
              <p className="text-xs text-muted-foreground">
                Hızlı erişim için ekle
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={handleInstall} className="h-8 px-3 text-xs">
              Yükle
            </Button>
            <button
              onClick={() => setShowInstall(false)}
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
              <h4 className="font-semibold text-sm">Bildirimleri Aç</h4>
              <p className="text-xs text-muted-foreground">Haberleri kaçırma</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={handleNotification}
              className="h-8 px-3 text-xs bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            >
              Aç
            </Button>
            <button
              onClick={dismissNotification}
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
