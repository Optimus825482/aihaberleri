"use client";

import { AlertTriangle, XCircle, Zap, CheckCircle } from "lucide-react";

interface ProviderStats {
  available: boolean;
  requests: number;
  errors: number;
  usagePercent: number;
}

interface ProviderAlertsProps {
  data: {
    searxng: ProviderStats;
    brave: ProviderStats;
    tavily: ProviderStats;
  };
}

interface Alert {
  id: string;
  severity: "warning" | "error" | "critical";
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: Date;
}

export default function ProviderAlerts({ data }: ProviderAlertsProps) {
  const alerts: Alert[] = [];

  // Check SearXNG usage
  if (data.searxng.usagePercent < 80) {
    alerts.push({
      id: "searxng-usage",
      severity: "warning",
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "SearXNG Kullanım Oranı Düşük",
      description: `SearXNG kullanım oranı %${data.searxng.usagePercent.toFixed(1)} seviyesinde. Hedef %80'in üzerinde olmalıdır.`,
      timestamp: new Date(),
    });
  }

  // Check provider availability
  const unavailableProviders = [];
  if (!data.searxng.available) unavailableProviders.push("SearXNG");
  if (!data.brave.available) unavailableProviders.push("Brave");
  if (!data.tavily.available) unavailableProviders.push("Tavily");

  if (unavailableProviders.length > 0) {
    alerts.push({
      id: "provider-unavailable",
      severity: "error",
      icon: <XCircle className="w-5 h-5" />,
      title: "Sağlayıcı Kullanılamıyor",
      description: `${unavailableProviders.join(", ")} şu anda kullanılamıyor. Lütfen bağlantıyı kontrol edin.`,
      timestamp: new Date(),
    });
  }

  // Check error rates
  const highErrorProviders: Array<{ name: string; rate: number }> = [];
  const checkErrorRate = (name: string, stats: ProviderStats) => {
    if (stats.requests > 0) {
      const errorRate = (stats.errors / stats.requests) * 100;
      if (errorRate > 10) {
        highErrorProviders.push({ name, rate: errorRate });
      }
    }
  };

  checkErrorRate("SearXNG", data.searxng);
  checkErrorRate("Brave", data.brave);
  checkErrorRate("Tavily", data.tavily);

  if (highErrorProviders.length > 0) {
    alerts.push({
      id: "high-error-rate",
      severity: "critical",
      icon: <Zap className="w-5 h-5" />,
      title: "Yüksek Hata Oranı",
      description: `${highErrorProviders.map((p) => `${p.name} (%${p.rate.toFixed(1)})`).join(", ")} yüksek hata oranına sahip. Eşik değer %10'dur.`,
      timestamp: new Date(),
    });
  }

  const getSeverityStyles = (severity: Alert["severity"]) => {
    const styles = {
      warning: {
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        border: "border-yellow-200 dark:border-yellow-800",
        icon: "text-yellow-600 dark:text-yellow-400",
        text: "text-yellow-800 dark:text-yellow-300",
        badge:
          "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
      },
      error: {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        icon: "text-red-600 dark:text-red-400",
        text: "text-red-800 dark:text-red-300",
        badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      },
      critical: {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        border: "border-orange-200 dark:border-orange-800",
        icon: "text-orange-600 dark:text-orange-400",
        text: "text-orange-800 dark:text-orange-300",
        badge:
          "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
      },
    };

    return styles[severity];
  };

  const getSeverityLabel = (severity: Alert["severity"]) => {
    const labels = {
      warning: "Uyarı",
      error: "Hata",
      critical: "Kritik",
    };
    return labels[severity];
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl rounded-2xl p-6 border border-green-200 dark:border-green-800 shadow-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Tüm Sistemler Normal
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Arama sağlayıcıları sorunsuz çalışıyor. Herhangi bir uyarı
              bulunmuyor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Aktif Uyarılar ({alerts.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alerts.map((alert) => {
          const styles = getSeverityStyles(alert.severity);

          return (
            <div
              key={alert.id}
              className={`${styles.bg} backdrop-blur-xl rounded-xl p-5 border ${styles.border} shadow-md transition-all hover:shadow-lg`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`${styles.icon} mt-0.5`}>{alert.icon}</div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-base font-bold ${styles.text}`}>
                      {alert.title}
                    </h4>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles.badge}`}
                    >
                      {getSeverityLabel(alert.severity)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {alert.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {alert.timestamp.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
