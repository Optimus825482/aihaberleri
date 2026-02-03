"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Database,
  Zap,
  Clock,
  Download,
} from "lucide-react";
import SystemHealthCard from "@/components/admin/monitoring/SystemHealthCard";
import ErrorRateChart from "@/components/admin/monitoring/ErrorRateChart";
import ApiResponseChart from "@/components/admin/monitoring/ApiResponseChart";
import DatabasePerformanceCard from "@/components/admin/monitoring/DatabasePerformanceCard";
import CacheHitRateCard from "@/components/admin/monitoring/CacheHitRateCard";
import WorkerStatusTimeline from "@/components/admin/monitoring/WorkerStatusTimeline";

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

interface MonitoringData {
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
  };
  errorRate: Array<{ timestamp: string; count: number; type: string }>;
  apiResponse: Array<{
    timestamp: string;
    avgTime: number;
    p95: number;
    p99: number;
  }>;
  database: {
    activeConnections: number;
    slowQueries: number;
    avgQueryTime: number;
    poolUtilization: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
    memoryUsage: number;
  };
  workers: Array<{
    id: string;
    name: string;
    status: "active" | "idle" | "error";
    lastRun: string;
    jobsProcessed: number;
  }>;
}

export default function MonitoringPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch(`/api/admin/monitoring?range=${timeRange}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
        } else {
          console.error("API returned error:", result.error || result.details);
          setData(null);
        }
      } else {
        console.error(
          "API request failed:",
          response.status,
          response.statusText,
        );
        setData(null);
      }
    } catch (error) {
      console.error("Monitoring data fetch error:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMonitoringData();
    }, 5000); // 5 saniyede bir güncelle

    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const exportData = (format: "csv" | "json") => {
    if (!data) return;

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `monitoring-${timestamp}.${format}`;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export için basit implementation
      const csv = convertToCSV(data);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const convertToCSV = (data: MonitoringData): string => {
    // Basit CSV dönüşümü
    let csv = "Metric,Value,Timestamp\n";
    csv += `CPU,${data.systemHealth.cpu},${new Date().toISOString()}\n`;
    csv += `Memory,${data.systemHealth.memory},${new Date().toISOString()}\n`;
    csv += `Disk,${data.systemHealth.disk},${new Date().toISOString()}\n`;
    csv += `Cache Hit Rate,${data.cache.hitRate},${new Date().toISOString()}\n`;
    return csv;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Monitoring Verileri Yüklenemedi
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Lütfen konsolu kontrol edin veya sayfayı yenileyin.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              fetchMonitoringData();
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Sistem İzleme
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerçek zamanlı sistem performans metrikleri
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              autoRefresh
                ? "bg-green-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            {autoRefresh
              ? "Otomatik Yenileme Açık"
              : "Otomatik Yenileme Kapalı"}
          </button>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => exportData("json")}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-2" />
              JSON
            </button>
            <button
              onClick={() => exportData("csv")}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-2" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
        {(["1h", "6h", "24h", "7d", "30d"] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeRange === range
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {range === "1h" && "Son 1 Saat"}
            {range === "6h" && "Son 6 Saat"}
            {range === "24h" && "Son 24 Saat"}
            {range === "7d" && "Son 7 Gün"}
            {range === "30d" && "Son 30 Gün"}
          </button>
        ))}
      </div>

      {/* System Health Overview */}
      {data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealthCard data={data.systemHealth} />
            <DatabasePerformanceCard data={data.database} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorRateChart data={data.errorRate} timeRange={timeRange} />
            <ApiResponseChart data={data.apiResponse} timeRange={timeRange} />
          </div>

          {/* Cache & Workers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CacheHitRateCard data={data.cache} />
            <WorkerStatusTimeline workers={data.workers} />
          </div>

          {/* Quick Links to Other Monitoring Pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Link href="/admin/monitoring/search-providers">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                      <Activity className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Search Provider Monitoring
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Arama sağlayıcı istatistikleri
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl group-hover:translate-x-1 transition-transform">
                    →
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      SearXNG
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      ~90%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Brave
                    </p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ~5%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tavily
                    </p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      ~5%
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-lg opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Zap className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Agent Performance
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Yakında...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Summary */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Aktif Uyarılar
              </h3>
            </div>
            <div className="space-y-2">
              {data.systemHealth.cpu > 80 && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>CPU kullanımı yüksek: %{data.systemHealth.cpu}</span>
                </div>
              )}
              {data.systemHealth.memory > 85 && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>
                    Bellek kullanımı kritik: %{data.systemHealth.memory}
                  </span>
                </div>
              )}
              {data.database.slowQueries > 10 && (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>
                    Yavaş sorgu sayısı yüksek: {data.database.slowQueries}
                  </span>
                </div>
              )}
              {data.cache.hitRate < 70 && (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>Cache hit rate düşük: %{data.cache.hitRate}</span>
                </div>
              )}
              {data.workers.filter((w) => w.status === "error").length > 0 && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>
                    {data.workers.filter((w) => w.status === "error").length}{" "}
                    worker hata durumunda
                  </span>
                </div>
              )}
              {data.systemHealth.cpu <= 80 &&
                data.systemHealth.memory <= 85 &&
                data.database.slowQueries <= 10 &&
                data.cache.hitRate >= 70 &&
                data.workers.filter((w) => w.status === "error").length ===
                  0 && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Tüm sistemler normal çalışıyor</span>
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
