"use client";

import { useState, useEffect } from "react";
import { usePWA } from "@/context/PWAContext";

export function PWAInstallPrompt() {
  const { isInstallable, installApp } = usePWA();
  const [show, setShow] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  useEffect(() => {
    const neverAsk = localStorage.getItem("pwa-install-never-ask");

    if (neverAsk === "true" || !isInstallable) {
      setShow(false);
      return;
    }

    const asked = localStorage.getItem("pwa-install-asked");

    if (!asked) {
      const timer = window.setTimeout(() => {
        setShow(true);
      }, 10000);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    if (!isInstallable) return;

    if (neverShowAgain) {
      localStorage.setItem("pwa-install-never-ask", "true");
    } else {
      localStorage.setItem("pwa-install-asked", "true");
    }

    await installApp();
    setShow(false);
  };

  const handleLater = () => {
    if (neverShowAgain) {
      localStorage.setItem("pwa-install-never-ask", "true");
    } else {
      localStorage.setItem("pwa-install-asked", "true");
    }
    setShow(false);
  };

  if (!show || !isInstallable) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">📱</div>
          <h3 className="text-xl font-bold mb-2">Ana Ekrana Ekle</h3>
          <p className="text-muted-foreground text-sm">
            AI Haberleri'ni uygulama olarak yüklemek ister misiniz? Daha hızlı
            erişim ve daha iyi deneyim için ana ekranınıza ekleyin!
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Daha hızlı yükleme
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Offline erişim
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Uygulama gibi deneyim
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Push bildirimleri
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleInstall}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
          >
            Yükle
          </button>
          <button
            onClick={handleLater}
            className="w-full px-4 py-3 border rounded-md hover:bg-muted transition-colors"
          >
            Daha Sonra
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="pwa-dont-show-again"
            checked={neverShowAgain}
            onChange={(e) => setNeverShowAgain(e.target.checked)}
            className="rounded"
          />
          <label
            htmlFor="pwa-dont-show-again"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Bir daha gösterme
          </label>
        </div>
      </div>
    </div>
  );
}
