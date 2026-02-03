"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";

interface ProviderData {
  available: boolean;
  requests: number;
  errors: number;
  successRate: number;
  avgResponseTime: number;
  lastError: Date | null;
  distribution: number;
}

interface SearchProviderData {
  providers: {
    searxng: ProviderData;
    brave: ProviderData;
    tavily: ProviderData;
  };
  totals: {
    requests: number;
    errors: number;
    avgResponseTime: number;
  };
  timeline: Array<{
    timestamp: string;
    searxng: number;
    brave: number;
    tavily: number;
  }>;
  alerts: Array<{
    level: "warning" | "error" | "critical";
    message: string;
    provider: string;
  }>;
}

interface SearchProviderDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function SearchProviderDashboard({
  autoRefresh = true,
  refreshInterval = 10000,
}: SearchProviderDashboardProps) {
  const [data, setData] = useState<SearchProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("24h");

  const fetchData = async () => {
    try {
      const response = await fetch(
        `/api/admin/monitoring/search-providers?range=${timeRange}`,
      );
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Search provider data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, timeRange, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Veri yüklenemedi</p>
      </div>
    );
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "searxng":
        return "green";
      case "brave":
        return "blue";
      case "tavily":
        return "purple";
      default:
        return "gray";
    }
  };

  const getProviderIcon = (available: boolean) => {
    return available ? "✅" : "🚫";
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800";
      case "error":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800";
      case "warning":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search className="w-8 h-8 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Search Provider Monitoring
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gerçek zamanlı arama sağlayıcı istatistikleri
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm font-medium outline-none focus:ring-2 ring-blue-500/50 cursor-pointer"
        >
          <option value="1h">Son 1 Saat</option>
          <option value="6h">Son 6 Saat</option>
          <option value="24h">Son 24 Saat</option>
          <option value="7d">Son 7 Gün</option>
        </select>
      </div>

      {/* Provider Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.providers &&
          Object.entries(data.providers).map(([provider, stats]) => {
            const color = getProviderColor(provider);
            return (
              <div
                key={provider}
                className={`bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-900/10 backdrop-blur-xl rounded-2xl p-6 border border-${color}-200 dark:border-${color}-800 shadow-lg`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                    {provider === "searxng" ? "SearXNG" : provider}
                  </h3>
                  <span className="text-2xl">
                    {getProviderIcon(stats.available)}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Distribution */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Kullanım Oranı
                    </span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      %{stats.distribution}
                    </span>
                  </div>

                  {/* Requests */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      İstek Sayısı
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {stats.requests.toLocaleString("tr-TR")}
                    </span>
                  </div>

                  {/* Errors */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Hata Sayısı
                    </span>
                    <span
                      className={`text-lg font-semibold ${stats.errors > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                    >
                      {stats.errors}
                    </span>
                  </div>

                  {/* Success Rate */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Başarı Oranı
                    </span>
                    <span
                      className={`text-lg font-semibold ${stats.successRate >= 90 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}
                    >
                      %{stats.successRate}
                    </span>
                  </div>

                  {/* Response Time */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Yanıt Süresi
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {stats.avgResponseTime}ms
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                    <div
                      className={`absolute top-0 left-0 h-full bg-${color}-500 transition-all duration-500`}
                      style={{ width: `${stats.successRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Totals Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 backdrop-blur-xl rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-indigo-500" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Genel İstatistikler
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Toplam İstek
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.totals.requests.toLocaleString("tr-TR")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Toplam Hata
            </p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {data.totals.errors}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Ortalama Yanıt Süresi
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.totals.avgResponseTime}ms
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            İstek Zaman Çizelgesi
          </h3>
        </div>

        <div className="space-y-4">
          {data.timeline.slice(-10).map((point, index) => {
            const total = point.searxng + point.brave + point.tavily;
            const searxngPercent = (point.searxng / total) * 100;
            const bravePercent = (point.brave / total) * 100;
            const tavilyPercent = (point.tavily / total) * 100;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(point.timestamp).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-gray-900 dark:text-white font-semibold">
                    {total} istek
                  </span>
                </div>
                <div className="flex h-4 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500"
                    style={{ width: `${searxngPercent}%` }}
                    title={`SearXNG: ${point.searxng}`}
                  ></div>
                  <div
                    className="bg-blue-500"
                    style={{ width: `${bravePercent}%` }}
                    title={`Brave: ${point.brave}`}
                  ></div>
                  <div
                    className="bg-purple-500"
                    style={{ width: `${tavilyPercent}%` }}
                    title={`Tavily: ${point.tavily}`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              SearXNG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Brave
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Tavily
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Aktif Uyarılar
            </h3>
          </div>

          <div className="space-y-3">
            {data.alerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg border ${getAlertColor(alert.level)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {alert.level === "critical" && "🔴"}
                  {alert.level === "error" && "🟠"}
                  {alert.level === "warning" && "🟡"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold capitalize">{alert.provider}</p>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts */}
      {data.alerts.length === 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl rounded-2xl p-6 border border-green-200 dark:border-green-800 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Tüm Sistemler Normal
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hiçbir uyarı veya hata bulunmuyor
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto Refresh Indicator */}
      {autoRefresh && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Otomatik yenileme aktif ({refreshInterval / 1000} saniye)</span>
        </div>
      )}
    </div>
  );
}
