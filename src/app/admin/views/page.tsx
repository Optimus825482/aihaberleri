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
} from "lucide-react";
import Link from "next/link";

interface ViewSummary {
  totalViews: number;
  todayViews: number;
  yesterdayViews: number;
  last7DaysViews: number;
  last30DaysViews: number;
  uniqueSessionsToday: number;
  viewChangePercent: string;
}

interface TopArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: string;
  category?: { name: string };
  todayViews?: number;
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

interface RecentView {
  id: string;
  articleId: string;
  sessionId: string;
  viewedAt: string;
  articleTitle: string;
  articleSlug: string;
}

interface ViewAnalytics {
  summary: ViewSummary;
  topArticlesAllTime: TopArticle[];
  topArticlesToday: TopArticle[];
  hourlyData: HourlyData[];
  dailyData: DailyData[];
  categoryData: CategoryData[];
  recentViews: RecentView[];
}

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

  const maxHourlyViews = Math.max(...data.hourlyData.map((d) => d.views), 1);
  const maxDailyViews = Math.max(...data.dailyData.map((d) => d.views), 1);
  const maxCategoryViews = Math.max(...data.categoryData.map((d) => d.views), 1);

  const isPositiveChange = !data.summary.viewChangePercent.startsWith("-");

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
          {/* Hourly Chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Clock className="h-5 w-5 text-blue-400" />
              Saatlik Görüntülenme (Son 24 Saat)
            </h3>
            <div className="flex h-40 items-end gap-1">
              {data.hourlyData.map((item) => (
                <div
                  key={item.hour}
                  className="group relative flex-1"
                  title={`${item.hour}:00 - ${item.views} görüntülenme`}
                >
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-blue-500 to-blue-400 transition-all hover:from-blue-400 hover:to-blue-300"
                    style={{
                      height: `${(item.views / maxHourlyViews) * 100}%`,
                      minHeight: item.views > 0 ? "4px" : "0",
                    }}
                  />
                  <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                    {item.views}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Calendar className="h-5 w-5 text-purple-400" />
              Günlük Görüntülenme (Son 7 Gün)
            </h3>
            <div className="flex h-40 items-end gap-2">
              {data.dailyData.map((item, index) => (
                <div
                  key={index}
                  className="group relative flex-1"
                  title={`${formatDate(item.date)} - ${item.views} görüntülenme`}
                >
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-purple-500 to-purple-400 transition-all hover:from-purple-400 hover:to-purple-300"
                    style={{
                      height: `${(item.views / maxDailyViews) * 100}%`,
                      minHeight: item.views > 0 ? "4px" : "0",
                    }}
                  />
                  <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                    {item.views}
                  </div>
                  <div className="mt-1 text-center text-xs text-gray-500">
                    {formatDate(item.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        {data.categoryData.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <BarChart3 className="h-5 w-5 text-green-400" />
              Kategorilere Göre (Son 7 Gün)
            </h3>
            <div className="space-y-3">
              {data.categoryData.map((item, index) => (
                <div key={index} className="group">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-300">{item.category}</span>
                    <span className="text-gray-400">{formatNumber(item.views)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                      style={{ width: `${(item.views / maxCategoryViews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
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
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-green-400">
                          {article.todayViews} bugün
                        </span>
                        <span>{formatNumber(article.views || 0)} toplam</span>
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
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400">
                        {formatNumber(article.views)} görüntülenme
                      </span>
                      {article.category && <span>{article.category.name}</span>}
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

        {/* Recent Views */}
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
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-gray-400">
                        {view.sessionId.substring(0, 20)}...
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
            <li>• Tüm görüntülemeler ArticleView tablosunda saklanır</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
