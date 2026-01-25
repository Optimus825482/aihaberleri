"use client";

import { useState, useEffect } from "react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t shadow-lg">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              🍪 Bu site, deneyiminizi iyileştirmek için çerezler kullanır.
              Siteyi kullanmaya devam ederek çerez kullanımını kabul etmiş
              olursunuz.{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Gizlilik Politikası
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              Reddet
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Kabul Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
