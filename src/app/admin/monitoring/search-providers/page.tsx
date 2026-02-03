"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import SearchProviderDashboard from "@/components/admin/monitoring/SearchProviderDashboard";

export default function SearchProvidersMonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const exportData = async (format: "json" | "csv") => {
    try {
      const response = await fetch(
        "/api/admin/monitoring/search-providers?range=24h",
      );
      if (!response.ok) throw new Error("Export failed");

      const result = await response.json();
      const data = result.data;

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `search-providers-${timestamp}.${format}`;

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
        // CSV export
        let csv =
          "Provider,Requests,Errors,Success Rate,Avg Response Time,Distribution\n";

        Object.entries(data.providers).forEach(
          ([provider, stats]: [string, any]) => {
            csv += `${provider},${stats.requests},${stats.errors},${stats.successRate}%,${stats.avgResponseTime}ms,${stats.distribution}%\n`;
          },
        );

        csv += `\nTotal,${data.totals.requests},${data.totals.errors},-,${data.totals.avgResponseTime}ms,-\n`;

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Dışa aktarma başarısız oldu");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-500" />
            Search Provider Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Arama sağlayıcı performans ve kullanım istatistikleri
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
            {autoRefresh ? "🔄 Otomatik Yenileme" : "⏸️ Durduruldu"}
          </button>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => exportData("json")}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => exportData("csv")}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <SearchProviderDashboard
        autoRefresh={autoRefresh}
        refreshInterval={10000}
      />
    </div>
  );
}
