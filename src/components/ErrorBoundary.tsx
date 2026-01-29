"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React component errors and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // sendErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black">
                    Bir Hata Oluştu
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Üzgünüz, beklenmeyen bir hata meydana geldi
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Message */}
              {this.state.error && (
                <div className="p-4 bg-card rounded-lg border border-destructive/20">
                  <p className="text-sm font-mono text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Error Stack (Development Only) */}
              {process.env.NODE_ENV === "development" &&
                this.state.errorInfo && (
                  <details className="p-4 bg-card rounded-lg border">
                    <summary className="cursor-pointer text-sm font-semibold mb-2">
                      Teknik Detaylar (Geliştirici Modu)
                    </summary>
                    <pre className="text-xs overflow-auto max-h-64 text-muted-foreground font-mono">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 gap-2"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tekrar Dene
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                  variant="outline"
                >
                  Sayfayı Yenile
                </Button>
                <Button
                  onClick={() => (window.location.href = "/admin")}
                  className="flex-1"
                  variant="outline"
                >
                  Ana Sayfaya Dön
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                <p>
                  Sorun devam ederse, lütfen sistem yöneticisiyle iletişime
                  geçin.
                </p>
                <p className="mt-1">
                  Hata ID:{" "}
                  <code className="font-mono bg-muted px-1 py-0.5 rounded">
                    {Date.now().toString(36)}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier usage
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
