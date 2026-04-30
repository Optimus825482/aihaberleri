"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCount: number;
}

export class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errMsg = error?.message || "";

    // React Error #418 = Hydration mismatch (server HTML ≠ client render)
    // React Error #423 = Hydration error occurred but React recovered
    // These areminified strings — check for partial match on both variants
    const isHydrationError =
      errMsg.includes("Minified React error #418") ||
      errMsg.includes("Minified React error #423") ||
      errMsg.includes("418") ||
      errMsg.includes("423") ||
      errMsg.includes("Hydration") ||
      errMsg.includes("Text content did not match");

    if (isHydrationError) {
      console.error("Hydration error detected:", {
        error: errMsg,
        componentStack: errorInfo?.componentStack,
      });

      // Sentry veya başka bir error tracking servisine gönder
      if (typeof window !== "undefined" && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          tags: {
            errorType: "hydration",
          },
        });
      }

      // Otomatik recovery (sadece 1 kere)
      if (this.state.errorCount === 0) {
        console.log("🔄 Attempting automatic recovery...");
        this.setState({ errorCount: 1 });

        // 100ms sonra state'i reset et (React'in re-render yapmasını sağla)
        setTimeout(() => {
          this.setState({ hasError: false });
        }, 100);
      }
    } else {
      // Diğer hatalar için normal error handling
      console.error("❌ Component error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.errorCount > 0) {
      // Recovery başarısız olduysa fallback UI göster
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
                  // Cache'i temizle ve yenile
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

            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Teknik Detaylar
              </summary>
              <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                <p>Error Count: {this.state.errorCount}</p>
                <p>Browser: {navigator.userAgent}</p>
                <p>
                  Service Worker:{" "}
                  {"serviceWorker" in navigator ? "Supported" : "Not Supported"}
                </p>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
