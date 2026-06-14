"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * HydrationErrorBoundary — only handles NON-hydration errors.
 *
 * MANTIK:
 * - Hydration errors (#418/#423 vs.) browser extension'ların DOM'a müdahalesiyle
 *   oluşur ve React kendiliğinden recovery dener. Error boundary'in araya girip
 *   fallback UI göstermesi gereksiz flash'a yol açar.
 * - Bu nedenle hydration error'ları SADECE loglanır, fallback UI gösterilmez.
 * - Gerçek hatalar (runtime crash vs.) için normal hata yönetimi uygulanır.
 */
export class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errMsg = error?.message || "";

    // React Error #418 = Hydration mismatch (unrecoverable)
    // React Error #423 = Hydration mismatch but React recovered
    const isHydrationError =
      errMsg.includes("Minified React error #418") ||
      errMsg.includes("Minified React error #423") ||
      errMsg.includes("Hydration") ||
      errMsg.includes("Text content did not match");

    if (isHydrationError) {
      // Hydration hatalarını sessizce logla, fallback UI GÖSTERME.
      // React #423'te kendi recovery yapar, #418'de de ekranda bir şey bozulmaz.
      // Error boundary'in fallback'i sadece gereksiz re-render ve flash yaratır.
      console.warn(
        "[Hydration] Extension kaynaklı hydration farkı (önemsiz, görmezden gelindi)",
      );

      // Sentry'e hydration hata bildirimi (opsiyonel)
      if (typeof window !== "undefined" && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          tags: {
            errorType: "hydration",
            handled: "silent",
          },
          level: "info",
        });
      }

      // Fallback göstermeden children'ı render etmeye devam et
      this.setState({ hasError: false });
      return;
    }

    // Gerçek hatalar için normal error handling
    console.error("❌ Component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Bir Hata Oluştu
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sayfa yüklenirken sorun yaşandı
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Bu genellikle tarayıcı cache'i veya eklentilerden kaynaklanır.
              Sayfayı yenilemek sorunu çözebilir.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={() => {
                  if ("caches" in window) {
                    caches.keys().then((names) => {
                      names.forEach((name) => caches.delete(name));
                    });
                  }
                  window.location.reload();
                }}
                className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cache Temizle
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
