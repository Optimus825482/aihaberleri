"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Calendar,
  Activity,
    MapPin,
    Flame,
    Globe,
    Zap,
} from "lucide-react";
import Link from "next/link";
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    BarChart,
    Bar,
    Cell,
} from "recharts";

interface ViewSummary {
  totalViews: number;
  todayViews: number;
  yesterdayViews: number;
  last7DaysViews: number;
  last30DaysViews: number;
  uniqueSessionsToday: number;
  viewChangePercent: string;
    activeUsers: number;
}

interface TopArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: string;
  category?: { name: string };
  todayViews?: number;
    trendScore?: number;
    isTrending?: boolean;
}

interface HourlyData {
  hour: number;
  views: number;
}

interface DailyData {
  date: string;
  views: number;
}

interface CategoryData {
  category: string;
  views: number;
}

interface LocationInfo {
    country?: string;
    countryCode?: string;
    city?: string;
    region?: string;
}

interface RecentView {
  id: string;
  articleId: string;
  sessionId: string;
  viewedAt: string;
  articleTitle: string;
  articleSlug: string;
    location?: LocationInfo | null;
}

interface RealtimeDataPoint {
    time: string;
    users: number;
}

interface LocationBreakdown {
    country: string;
    countryCode: string;
    count: number;
    cities: string[];
}

interface GeoEvent {
    city: string;
    country: string;
    countryCode: string;
    time: string;
}

interface ViewAnalytics {
  summary: ViewSummary;
  topArticlesAllTime: TopArticle[];
  topArticlesToday: TopArticle[];
  hourlyData: HourlyData[];
  dailyData: DailyData[];
  categoryData: CategoryData[];
  recentViews: RecentView[];
    realtimeData: RealtimeDataPoint[];
    locationBreakdown?: LocationBreakdown[];
    recentGeoEvents?: GeoEvent[];
}

// Country flag emoji helper
const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return "🌍";
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

export default function ViewsPage() {
  const [data, setData] = useState<ViewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/views");
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

    const formatRealtimeTime = (timeStr: string) => {
        return new Date(timeStr).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-lg bg-red-500/10 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Tekrar Dene
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!data) return null;

  const isPositiveChange = !data.summary.viewChangePercent.startsWith("-");

    // Prepare hourly data for chart
    const hourlyChartData = data.hourlyData.map((item) => ({
        name: `${item.hour}:00`,
        views: item.views,
    }));

    // Prepare daily data for chart
    const dailyChartData = data.dailyData.map((item) => ({
        name: formatDate(item.date),
        views: item.views,
    }));

    // Prepare realtime data for chart
    const realtimeChartData = (data.realtimeData || []).map((item) => ({
        time: formatRealtimeTime(item.time),
        users: item.users,
    }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Okunma Takibi</h1>
            <p className="mt-1 text-sm text-gray-400">
              Haber görüntülenme istatistikleri ve analitik veriler
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

              {/* Real-time Active Users Card + Chart */}
              <div className="rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-600/5 p-6">
                  <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                              <Zap className="h-6 w-6 text-green-400" />
                          </div>
                          <div>
                              <h3 className="text-lg font-semibold text-white">Şu An Sitede</h3>
                              <p className="text-sm text-gray-400">Son 5 dakika aktif kullanıcılar</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-4xl font-bold text-green-400">
                              {data.summary.activeUsers || 0}
                          </p>
                          <p className="text-sm text-gray-400">aktif kullanıcı</p>
                      </div>
                  </div>

                  {/* Realtime Line Chart */}
                  {realtimeChartData.length > 0 && (
                      <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={realtimeChartData}>
                                  <defs>
                                      <linearGradient id="realtimeGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                  <XAxis
                                      dataKey="time"
                                      stroke="#6b7280"
                                      fontSize={10}
                                      tickLine={false}
                                  />
                                  <YAxis
                                      stroke="#6b7280"
                                      fontSize={10}
                                      tickLine={false}
                                      axisLine={false}
                                  />
                                  <Tooltip
                                      contentStyle={{
                                          backgroundColor: "#1f2937",
                                          border: "1px solid #374151",
                                          borderRadius: "8px",
                                          color: "#fff",
                                      }}
                                      labelStyle={{ color: "#9ca3af" }}
                                  />
                                  <Area
                                      type="monotone"
                                      dataKey="users"
                                      stroke="#22c55e"
                                      strokeWidth={2}
                                      fill="url(#realtimeGradient)"
                                      name="Kullanıcı"
                                  />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  )}
              </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Toplam</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatNumber(data.summary.totalViews)}
            </p>
            <p className="text-xs text-gray-400">Tüm zamanlar</p>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 p-4">
            <div className="flex items-center gap-2 text-green-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Bugün</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatNumber(data.summary.todayViews)}
            </p>
            <div className="flex items-center gap-1 text-xs">
              {isPositiveChange ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={isPositiveChange ? "text-green-400" : "text-red-400"}>
                {data.summary.viewChangePercent}%
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Dün</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatNumber(data.summary.yesterdayViews)}
            </p>
            <p className="text-xs text-gray-400">24 saat</p>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">Son 7 Gün</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatNumber(data.summary.last7DaysViews)}
            </p>
            <p className="text-xs text-gray-400">Haftalık</p>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 p-4">
            <div className="flex items-center gap-2 text-pink-400">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Son 30 Gün</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatNumber(data.summary.last30DaysViews)}
            </p>
            <p className="text-xs text-gray-400">Aylık</p>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 p-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Unique</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatNumber(data.summary.uniqueSessionsToday)}
            </p>
            <p className="text-xs text-gray-400">Bugün session</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
                  {/* Hourly Line Chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                          <Clock className="h-5 w-5 text-cyan-400" />
              Saatlik Görüntülenme (Son 24 Saat)
            </h3>
                      <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={hourlyChartData}>
                                  <defs>
                                      <linearGradient id="hourlyGradient" x1="0" y1="0" x2="1" y2="0">
                                          <stop offset="0%" stopColor="#06b6d4" />
                                          <stop offset="100%" stopColor="#3b82f6" />
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                  <XAxis
                                      dataKey="name"
                                      stroke="#6b7280"
                                      fontSize={10}
                                      tickLine={false}
                                      interval={3}
                                  />
                                  <YAxis
                                      stroke="#6b7280"
                                      fontSize={10}
                                      tickLine={false}
                                      axisLine={false}
                                  />
                                  <Tooltip
                                      contentStyle={{
                                          backgroundColor: "#1f2937",
                                          border: "1px solid #374151",
                                          borderRadius: "8px",
                                          color: "#fff",
                    }}
                                      labelStyle={{ color: "#9ca3af" }}
                  />
                                  <Line
                                      type="monotone"
                                      dataKey="views"
                                      stroke="url(#hourlyGradient)"
                                      strokeWidth={3}
                                      dot={{ fill: "#06b6d4", strokeWidth: 0, r: 3 }}
                                      activeDot={{ r: 6, fill: "#06b6d4" }}
                                      name="Görüntülenme"
                                  />
                              </LineChart>
                          </ResponsiveContainer>
            </div>
          </div>

                  {/* Daily Area Chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Calendar className="h-5 w-5 text-purple-400" />
              Günlük Görüntülenme (Son 7 Gün)
            </h3>
                      <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={dailyChartData}>
                                  <defs>
                                      <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                  <XAxis
                                      dataKey="name"
                                      stroke="#6b7280"
                                      fontSize={10}
                                      tickLine={false}
                                  />
                                  <YAxis
                                      stroke="#6b7280"
                                      fontSize={10}
                                      tickLine={false}
                                      axisLine={false}
                                  />
                                  <Tooltip
                                      contentStyle={{
                                          backgroundColor: "#1f2937",
                                          border: "1px solid #374151",
                                          borderRadius: "8px",
                                          color: "#fff",
                    }}
                                      labelStyle={{ color: "#9ca3af" }}
                  />
                                  <Area
                                      type="monotone"
                                      dataKey="views"
                                      stroke="#a855f7"
                                      strokeWidth={2}
                                      fill="url(#dailyGradient)"
                                      name="Görüntülenme"
                                  />
                              </AreaChart>
                          </ResponsiveContainer>
            </div>
          </div>
        </div>

              {/* Category Distribution - Horizontal Bar Chart */}
        {data.categoryData.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <BarChart3 className="h-5 w-5 text-green-400" />
              Kategorilere Göre (Son 7 Gün)
            </h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                  data={data.categoryData}
                                  layout="vertical"
                                  margin={{ left: 100, right: 20 }}
                              >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
                                  <XAxis type="number" stroke="#6b7280" fontSize={10} />
                                  <YAxis
                                      type="category"
                                      dataKey="category"
                                      stroke="#6b7280"
                                      fontSize={11}
                                      tickLine={false}
                                      axisLine={false}
                                      width={90}
                                  />
                                  <Tooltip
                                      contentStyle={{
                                          backgroundColor: "#1f2937",
                                          border: "1px solid #374151",
                                          borderRadius: "8px",
                                          color: "#fff",
                                      }}
                                      formatter={(value: number) => [formatNumber(value), "Görüntülenme"]}
                                  />
                                  <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                                      {data.categoryData.map((_, index) => (
                                          <Cell
                                              key={`cell-${index}`}
                                              fill={`hsl(${142 + index * 15}, 70%, ${50 - index * 3}%)`}
                                          />
                    ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top Articles */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Top */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Bugün En Çok Okunanlar
            </h3>
            <div className="space-y-3">
              {data.topArticlesToday.length === 0 ? (
                <p className="text-center text-gray-400">Henüz veri yok</p>
              ) : (
                data.topArticlesToday.map((article, index) => (
                  <div
                    key={article.id}
                    className="flex items-start gap-3 rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/articles?id=${article.id}`}
                        className="line-clamp-2 text-sm font-medium text-white hover:text-blue-400"
                      >
                        {article.title}
                      </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-green-400">
                          {article.todayViews} bugün
                        </span>
                        <span>{formatNumber(article.views || 0)} toplam</span>
                                {article.trendScore && article.trendScore > 0 && (
                                    <span className="flex items-center gap-1 rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-400">
                                        <Flame className="h-3 w-3" />
                                        {article.trendScore}
                                    </span>
                                )}
                                {article.isTrending && (
                                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">
                                        🔥 Trend
                                    </span>
                                )}
                      </div>
                    </div>
                    <Link
                      href={`/haberler/${article.slug}`}
                      target="_blank"
                      className="text-gray-400 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* All Time Top */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Eye className="h-5 w-5 text-blue-400" />
              Tüm Zamanların En Çok Okunanları
            </h3>
            <div className="space-y-3">
              {data.topArticlesAllTime.map((article, index) => (
                <div
                  key={article.id}
                  className="flex items-start gap-3 rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/articles?id=${article.id}`}
                      className="line-clamp-2 text-sm font-medium text-white hover:text-blue-400"
                    >
                      {article.title}
                    </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400">
                        {formatNumber(article.views)} görüntülenme
                      </span>
                      {article.category && <span>{article.category.name}</span>}
                              {article.trendScore && article.trendScore > 0 && (
                                  <span className="flex items-center gap-1 rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-400">
                                      <Flame className="h-3 w-3" />
                                      {article.trendScore}
                                  </span>
                              )}
                              {article.isTrending && (
                                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">
                                      🔥 Trend
                                  </span>
                              )}
                    </div>
                  </div>
                  <Link
                    href={`/haberler/${article.slug}`}
                    target="_blank"
                    className="text-gray-400 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

              {/* Live GEO Location Map - Anlık Konum Grafiği */}
              {data.locationBreakdown && data.locationBreakdown.length > 0 && (
                  <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-600/5 p-6">
                      <div className="mb-4 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                              <Globe className="h-5 w-5 text-cyan-400" />
                              Anlık Konum Dağılımı
                              <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                  🔴 CANLI
                              </span>
                          </h3>
                          <span className="text-xs text-gray-400">Son 5 dakika</span>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                          {/* Country Bar Chart */}
                          <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                      data={data.locationBreakdown}
                                      layout="vertical"
                                      margin={{ left: 0, right: 20 }}
                                  >
                                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                      <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                      <YAxis
                                          dataKey="country"
                                          type="category"
                                          stroke="#9ca3af"
                                          fontSize={11}
                                          width={100}
                                          tickFormatter={(value) => {
                                              const item = data.locationBreakdown?.find((l) => l.country === value);
                                              return `${getCountryFlag(item?.countryCode)} ${value.substring(0, 12)}`;
                                          }}
                                      />
                                      <Tooltip
                                          contentStyle={{
                                              backgroundColor: "#1f2937",
                                              border: "1px solid #374151",
                                              borderRadius: "8px",
                                          }}
                                          labelStyle={{ color: "#fff" }}
                                          formatter={(value: number) => [`${value} kullanıcı`, "Aktif"]}
                                      />
                                      <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                                          {data.locationBreakdown.map((entry, index) => (
                                              <Cell
                                                  key={`cell-${index}`}
                                                  fill={index === 0 ? "#22d3ee" : index === 1 ? "#06b6d4" : "#0891b2"}
                                              />
                                          ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>

                          {/* Recent GEO Events Feed */}
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                                  <MapPin className="h-4 w-4 text-cyan-400" />
                                  Son Konum Tespitleri
                              </h4>
                              {data.recentGeoEvents?.slice(0, 10).map((event, idx) => (
                                  <div
                                      key={idx}
                                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                                  >
                                      <div className="flex items-center gap-2">
                                          <span className="text-lg">{getCountryFlag(event.countryCode)}</span>
                                          <div>
                                              <span className="text-white">{event.city}</span>
                                              <span className="text-gray-500">, {event.country}</span>
                                          </div>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                          {formatTime(event.time)}
                                      </span>
                                  </div>
                              ))}
                              {(!data.recentGeoEvents || data.recentGeoEvents.length === 0) && (
                                  <div className="py-4 text-center text-sm text-gray-500">
                                      Henüz konum verisi yok
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-4 flex flex-wrap gap-4 border-t border-white/10 pt-4">
                          {data.locationBreakdown.slice(0, 5).map((loc, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                  <span className="text-lg">{getCountryFlag(loc.countryCode)}</span>
                                  <span className="text-white">{loc.count}</span>
                                  <span className="text-gray-500">{loc.country}</span>
                                  {loc.cities.length > 0 && (
                                      <span className="text-xs text-gray-600">
                                          ({loc.cities.slice(0, 2).join(", ")})
                                      </span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Recent Views with Location */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Activity className="h-5 w-5 text-yellow-400" />
            Son Görüntülemeler (Canlı)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-4">Haber</th>
                                  <th className="pb-2 pr-4">
                                      <div className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          Konum
                                      </div>
                                  </th>
                  <th className="pb-2 pr-4">Session</th>
                  <th className="pb-2">Zaman</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.recentViews.map((view) => (
                  <tr
                    key={view.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/haberler/${view.articleSlug}`}
                        target="_blank"
                        className="line-clamp-1 max-w-xs text-white hover:text-blue-400"
                      >
                        {view.articleTitle}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                            {view.location ? (
                                <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-base">
                                        {getCountryFlag(view.location.countryCode)}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-gray-300">
                                            {view.location.city || view.location.region || "—"}
                                        </span>
                                        <span className="text-gray-500">
                                            {view.location.country || "—"}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="flex items-center gap-1 text-gray-500">
                                    <Globe className="h-3 w-3" />
                                    Bilinmiyor
                                </span>
                            )}
                        </td>
                        <td className="py-2 pr-4">
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-gray-400">
                                {view.sessionId.substring(0, 16)}...
                      </code>
                    </td>
                    <td className="py-2 text-gray-400">
                      {formatTime(view.viewedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
          <h4 className="font-medium text-blue-400">📊 Okunma Takibi Nasıl Çalışır?</h4>
          <ul className="mt-2 space-y-1 text-sm text-gray-300">
            <li>• Kullanıcı haberi açtıktan 3 saniye sonra görüntülenme kaydedilir</li>
            <li>• Aynı session (IP + UserAgent) 5 dakika içinde tekrar sayılmaz</li>
            <li>• Veriler 30 saniyede bir otomatik yenilenir</li>
                      <li>• Konum bilgisi Visitor tablosundan alınır</li>
                      <li>• Trend puanı haberin popülerlik skorunu gösterir</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
