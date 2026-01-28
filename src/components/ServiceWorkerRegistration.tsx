import { useEffect, useState } from "react";
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
      // Delay prompt slightly
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

  const handleNotification = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setShowNotification(false);
      try {
        new Notification("Bildirimler açıldı!", {
          body: "Artık son dakika haberlerini alacaksınız.",
          icon: "/icons/icon-192x192.png",
        });
      } catch (e) {
        // Ignore error usually caused by mobile restrictions
      }
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
