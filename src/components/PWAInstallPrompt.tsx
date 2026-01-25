"use client";

import { useState, useEffect } from "react";

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  useEffect(() => {
    // Check if already asked or user selected never ask
    const asked = localStorage.getItem("pwa-install-asked");
    const neverAsk = localStorage.getItem("pwa-install-never-ask");

    if (neverAsk === "true") return;

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after 10 seconds only if not asked before
      if (!asked) {
        setTimeout(() => {
          setShow(true);
        }, 10000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    if (neverShowAgain) {
      localStorage.setItem("pwa-install-never-ask", "true");
    } else {
      localStorage.setItem("pwa-install-asked", "true");
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to install prompt: ${outcome}`);

    setDeferredPrompt(null);
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

  if (!show || !deferredPrompt) return null;

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
