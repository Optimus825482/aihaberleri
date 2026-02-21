"use client";

import { useState, useEffect } from "react";

type CookiePreferences = {
  essential: true;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string;
};

const COOKIE_CONSENT_KEY = "cookie-consent";

const buildPreferences = (
  analytics: boolean,
  advertising: boolean,
): CookiePreferences => ({
  essential: true,
  analytics,
  advertising,
  updatedAt: new Date().toISOString(),
});

const savePreferences = (preferences: CookiePreferences) => {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences));
};

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [advertising, setAdvertising] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setShow(true);
      return;
    }

    if (consent === "accepted") {
      setAnalytics(true);
      setAdvertising(true);
      return;
    }

    if (consent === "rejected") {
      setAnalytics(false);
      setAdvertising(false);
      return;
    }

    try {
      const parsed = JSON.parse(consent) as Partial<CookiePreferences>;
      setAnalytics(Boolean(parsed.analytics));
      setAdvertising(Boolean(parsed.advertising));
    } catch {
      setShow(true);
    }
  }, []);

  const handleAcceptAll = () => {
    savePreferences(buildPreferences(true, true));
    setShow(false);
  };

  const handleEssentialOnly = () => {
    savePreferences(buildPreferences(false, false));
    setShow(false);
  };

  const handleSavePreferences = () => {
    savePreferences(buildPreferences(analytics, advertising));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t shadow-lg">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              🍪 Bu site zorunlu, analitik ve reklam çerezleri kullanabilir.
              Tercihlerinizi yönetebilir veya yalnızca zorunlu çerezlerle devam
              edebilirsiniz.{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Gizlilik Politikası
              </a>
            </p>
          </div>

          {showPreferences && (
            <div className="rounded-lg border border-ai-surface-border bg-ai-surface-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Zorunlu Çerezler</p>
                  <p className="text-xs text-ai-text-secondary">Güvenlik ve temel işlevler için gereklidir.</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-ai-primary/20 text-ai-primary">Her zaman açık</span>
              </div>

              <label className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Analitik Çerezler</p>
                  <p className="text-xs text-ai-text-secondary">Site performansını ve içerik kalitesini ölçmek için kullanılır.</p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Reklam Çerezleri</p>
                  <p className="text-xs text-ai-text-secondary">Google AdSense dahil reklam kişiselleştirmesi için kullanılabilir.</p>
                </div>
                <input
                  type="checkbox"
                  checked={advertising}
                  onChange={(event) => setAdvertising(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!showPreferences && (
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Tercihleri Yönet
              </button>
            )}

            <button
              onClick={handleEssentialOnly}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              Sadece Zorunlu
            </button>

            {showPreferences && (
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Tercihleri Kaydet
              </button>
            )}

            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Tümünü Kabul Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
