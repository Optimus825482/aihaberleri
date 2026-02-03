"use client";

import {
  CheckCircle,
  XCircle,
  Activity,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface ProviderStats {
  available: boolean;
  requests: number;
  errors: number;
  avgResponseTime: number;
  usagePercent: number;
}

interface ProviderStatusCardsProps {
  data: {
    searxng: ProviderStats;
    brave: ProviderStats;
    tavily: ProviderStats;
  };
}

export default function ProviderStatusCards({
  data,
}: ProviderStatusCardsProps) {
  const providers = [
    {
      name: "SearXNG",
      key: "searxng" as const,
      color: "green",
      icon: "🔍",
      description: "Açık kaynak meta arama motoru",
    },
    {
      name: "Brave Search",
      key: "brave" as const,
      color: "blue",
      icon: "🦁",
      description: "Gizlilik odaklı arama API",
    },
    {
      name: "Tavily",
      key: "tavily" as const,
      color: "purple",
      icon: "🤖",
      description: "AI-powered arama API",
    },
  ];

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) {
      return {
        gradient:
          "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30",
        border: "border-red-200 dark:border-red-800",
        icon: "text-red-500",
        progress: "bg-red-500",
      };
    }

    const colors = {
      green: {
        gradient:
          "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
        border: "border-green-200 dark:border-green-800",
        icon: "text-green-500",
        progress: "bg-green-500",
      },
      blue: {
        gradient:
          "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-500",
        progress: "bg-blue-500",
      },
      purple: {
        gradient:
          "from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20",
        border: "border-purple-200 dark:border-purple-800",
        icon: "text-purple-500",
        progress: "bg-purple-500",
      },
    };

    return colors[color as keyof typeof colors];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {providers.map((provider) => {
        const stats = data[provider.key];
        const colors = getColorClasses(provider.color, stats.available);
        const errorRate =
          stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0;

        return (
          <div
            key={provider.key}
            className={`bg-gradient-to-br ${colors.gradient} backdrop-blur-xl rounded-2xl p-6 border ${colors.border} shadow-lg transition-all hover:shadow-xl`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{provider.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {provider.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {provider.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Availability Badge */}
            <div className="mb-4">
              {stats.available ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Aktif
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full w-fit">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Kullanılamıyor
                  </span>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="space-y-3">
              {/* Request Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 ${colors.icon}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    İstekler
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.requests.toLocaleString("tr-TR")}
                </span>
              </div>

              {/* Error Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 ${errorRate > 10 ? "text-red-500" : "text-gray-400"}`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Hatalar
                  </span>
                </div>
                <span
                  className={`text-lg font-bold ${errorRate > 10 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}
                >
                  {stats.errors}
                  <span className="text-xs ml-1 text-gray-500">
                    (%{errorRate.toFixed(1)})
                  </span>
                </span>
              </div>

              {/* Response Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${colors.icon}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Yanıt Süresi
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.avgResponseTime.toFixed(0)}
                  <span className="text-xs ml-1 text-gray-500">ms</span>
                </span>
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kullanım Oranı
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  %{stats.usagePercent.toFixed(1)}
                </span>
              </div>
              <div className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${colors.progress} transition-all duration-500 ease-out rounded-full`}
                  style={{ width: `${Math.min(stats.usagePercent, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
