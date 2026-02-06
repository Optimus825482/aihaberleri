"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface Notification {
  status: "PENDING" | "SUBMITTED" | "FAILED";
  sentAt: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  category: string;
  notifications: {
    indexNow: Notification;
    google: Notification;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SEONotificationsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "sent">("all");
  const [platformFilter, setPlatformFilter] = useState<
    "all" | "indexnow" | "google"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
    new Set(),
  );
  const [processing, setProcessing] = useState(false);
  const [bulkGoogleProcessing, setBulkGoogleProcessing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Fetch articles
  const fetchArticles = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        status: filter,
        platform: platformFilter,
        search: searchQuery,
      });

      const response = await fetch(`/api/admin/seo-notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setArticles(data.data);
        setPagination(data.pagination);
        // Quota bilgisini güncelle
        if (data.quota?.daily) {
          setQuota(data.quota.daily);
        }
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchArticles(1);
    }, 300);

    return () => clearTimeout(debounce);
  }, [filter, platformFilter, searchQuery]);

  // Select/deselect article
  const toggleArticle = (id: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArticles(newSelected);
  };

  // Select all
  const selectAll = () => {
    if (selectedArticles.size === articles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(articles.map((a) => a.id)));
    }
  };

  // Resend notification
  const resendNotification = async (
    articleId: string,
    platform: "indexnow" | "google",
  ) => {
    setProcessing(true);
    try {
      const response = await fetch("/api/admin/seo-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `resend_${platform}`,
          articleIds: [articleId],
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${platform.toUpperCase()} bildirimi gönderildi!`);
        fetchArticles(pagination.page);
      } else {
        alert(`❌ Hata: ${data.error}`);
      }
    } catch (error) {
      alert("❌ Bildirim gönderilemedi");
    } finally {
      setProcessing(false);
    }
  };

  // Bulk send
  const bulkSend = async () => {
    if (selectedArticles.size === 0) {
      alert("Lütfen en az bir haber seçin");
      return;
    }

    if (
      !confirm(
        `${selectedArticles.size} haber için tüm platformlara bildirim gönderilecek. Onaylıyor musunuz?`,
      )
    ) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/seo-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend_all",
          articleIds: Array.from(selectedArticles),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `✅ Toplu bildirim tamamlandı!\n\nIndexNow: ${data.results.indexNow.success} başarılı, ${data.results.indexNow.failed} başarısız\nGoogle: ${data.results.google.success} başarılı, ${data.results.google.failed} başarısız`,
        );
        setSelectedArticles(new Set());
        fetchArticles(pagination.page);
      } else {
        alert(`❌ Hata: ${data.error}`);
      }
    } catch (error) {
      alert("❌ Toplu bildirim gönderilemedi");
    } finally {
      setProcessing(false);
    }
  };

  // Bulk Google Submit with Streaming Logs
  const bulkGoogleSubmit = async () => {
    const pendingGoogleArticles = articles.filter(
      (a) =>
        a.notifications.google.status === "PENDING" ||
        a.notifications.google.status === "FAILED",
    );

    if (pendingGoogleArticles.length === 0) {
      alert("Google'a gönderilmemiş haber bulunamadı");
      return;
    }

    if (
      !confirm(
        `${pendingGoogleArticles.length} haber Google Indexing API'ye gönderilecek. Onaylıyor musunuz?`,
      )
    ) {
      return;
    }

    setBulkGoogleProcessing(true);
    setShowLogs(true);
    setLogs([]);

    try {
      const response = await fetch("/api/admin/seo-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_google_submit",
          articleIds: pendingGoogleArticles.map((a) => a.id),
          streamLogs: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            setLogs((prev) => [...prev, data]);

            // Auto-scroll to bottom
            setTimeout(() => {
              const logContainer = document.getElementById("log-container");
              if (logContainer) {
                logContainer.scrollTop = logContainer.scrollHeight;
              }
            }, 100);
          }
        }
      }

      // Refresh articles after completion
      await fetchArticles(pagination.page);
    } catch (error) {
      console.error("Bulk Google submit error:", error);
      setLogs((prev) => [
        ...prev,
        {
          type: "fatal",
          message: `💥 Kritik hata: ${error}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setBulkGoogleProcessing(false);
    }
  };

  // Send pending only
  const sendPending = async () => {
    const pendingArticles = articles.filter(
      (a) =>
        a.notifications.indexNow.status === "PENDING" ||
        a.notifications.google.status === "PENDING",
    );

    if (pendingArticles.length === 0) {
      alert("Gönderilmemiş haber bulunamadı");
      return;
    }

    if (
      !confirm(
        `${pendingArticles.length} gönderilmemiş haber için bildirim gönderilecek. Onaylıyor musunuz?`,
      )
    ) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/seo-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_pending",
          articleIds: pendingArticles.map((a) => a.id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `✅ Gönderilmemiş haberler için bildirim tamamlandı!\n\nIndexNow: ${data.results.indexNow.success} başarılı\nGoogle: ${data.results.google.success} başarılı`,
        );
        fetchArticles(pagination.page);
      } else {
        alert(`❌ Hata: ${data.error}`);
      }
    } catch (error) {
      alert("❌ Bildirim gönderilemedi");
    } finally {
      setProcessing(false);
    }
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      PENDING:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      SUBMITTED:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    const labels = {
      PENDING: "Bekliyor",
      SUBMITTED: "Gönderildi",
      FAILED: "Başarısız",
    };

    const icons = {
      PENDING: <Clock className="h-3 w-3" />,
      SUBMITTED: <CheckCircle2 className="h-3 w-3" />,
      FAILED: <XCircle className="h-3 w-3" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}
      >
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // Filter articles by platform
  const filteredArticles = articles.filter((article) => {
    if (platformFilter === "all") return true;

    const notification =
      article.notifications[
      platformFilter as keyof typeof article.notifications
      ];
    return (
      notification.status === "PENDING" || notification.status === "FAILED"
    );
  });

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            SEO & Sosyal Medya Bildirimleri
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Haberlerin IndexNow ve Google Indexing API bildirim
            durumlarını yönetin
          </p>
        </div>

        {/* Filters & Search - Responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Haber başlığında ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters Row - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status Filter */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="status-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Durum Filtresi
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as "all" | "pending" | "sent")
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Tümü</option>
                <option value="pending">Gönderilmemiş</option>
                <option value="sent">Gönderilmiş</option>
              </select>
            </div>

            {/* Platform Filter */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="platform-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Platform Filtresi
              </label>
              <select
                id="platform-filter"
                value={platformFilter}
                onChange={(e) =>
                  setPlatformFilter(
                    e.target.value as
                    | "all"
                    | "indexnow"
                    | "google",
                  )
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Tüm Platformlar</option>
                <option value="indexnow">IndexNow</option>
                <option value="google">Google</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 opacity-0">
                Yenile
              </label>
              <button
                onClick={() => fetchArticles(pagination.page)}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Yenile</span>
              </button>
            </div>

            {/* Clear Filters */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 opacity-0">
                Temizle
              </label>
              <button
                onClick={() => {
                  setFilter("all");
                  setPlatformFilter("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>

          {/* Google Quota Info */}
          {quota && (
            <div className={`p-3 rounded-lg border ${quota.remaining === 0
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : quota.remaining < 50
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <span className="font-medium text-sm">Google Indexing API Günlük Quota</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Kullanılan: <strong>{quota.used}</strong>/{quota.limit}</span>
                  <span className={`font-bold ${quota.remaining === 0 ? 'text-red-600' : quota.remaining < 50 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                    Kalan: {quota.remaining}
                  </span>
                </div>
              </div>
              {quota.remaining === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  🔴 Günlük limit doldu! Yarın (UTC 00:00'da) sıfırlanacak.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={sendPending}
              disabled={processing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
              {processing ? "Gönderiliyor..." : "Gönderilmeyenleri Gönder"}
            </button>

            <button
              onClick={bulkGoogleSubmit}
              disabled={bulkGoogleProcessing || (quota?.remaining === 0)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
              {bulkGoogleProcessing
                ? "Google'a Gönderiliyor..."
                : quota?.remaining === 0
                  ? "Quota Doldu"
                  : "Hepsini Google'a Gönder"}
            </button>

            <button
              onClick={bulkSend}
              disabled={processing || selectedArticles.size === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
              {processing
                ? "Gönderiliyor..."
                : `Seçilenleri Gönder (${selectedArticles.size})`}
            </button>
          </div>
        </div>

        {/* Table - Desktop View */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Yükleniyor...
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Haber bulunamadı</p>
              <p className="text-sm mt-1">Farklı filtreler deneyin</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          aria-label="Tümünü seç"
                          title="Tümünü seç"
                          checked={
                            selectedArticles.size === filteredArticles.length &&
                            filteredArticles.length > 0
                          }
                          onChange={selectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Haber Başlığı
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Yayın Tarihi
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        IndexNow
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Google
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredArticles.map((article) => (
                      <tr
                        key={article.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`${article.title} seç`}
                            title={`${article.title} seç`}
                            checked={selectedArticles.has(article.id)}
                            onChange={() => toggleArticle(article.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <a
                              href={`/news/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                            >
                              {article.title}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {article.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {format(
                              new Date(article.publishedAt),
                              "dd MMM yyyy HH:mm",
                              { locale: tr },
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <StatusBadge
                              status={article.notifications.indexNow.status}
                            />
                            {article.notifications.indexNow.sentAt && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {format(
                                  new Date(
                                    article.notifications.indexNow.sentAt,
                                  ),
                                  "dd/MM HH:mm",
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <StatusBadge
                              status={article.notifications.google.status}
                            />
                            {article.notifications.google.sentAt && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {format(
                                  new Date(article.notifications.google.sentAt),
                                  "dd/MM HH:mm",
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                resendNotification(article.id, "indexnow")
                              }
                              disabled={processing}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded disabled:opacity-50 transition-colors"
                              title="IndexNow'a tekrar gönder"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                resendNotification(article.id, "google")
                              }
                              disabled={processing}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded disabled:opacity-50 transition-colors"
                              title="Google'a tekrar gönder"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Toplam {pagination.total} haber (Sayfa {pagination.page} /{" "}
                    {pagination.totalPages})
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchArticles(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => fetchArticles(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Yükleniyor...
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
              <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Haber bulunamadı</p>
              <p className="text-sm mt-1">Farklı filtreler deneyin</p>
            </div>
          ) : (
            <>
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-3"
                >
                  {/* Header with Checkbox */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`${article.title} seç`}
                      title={`${article.title} seç`}
                      checked={selectedArticles.has(article.id)}
                      onChange={() => toggleArticle(article.id)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/news/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                      >
                        {article.title}
                      </a>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{article.category}</span>
                        <span>•</span>
                        <span>
                          {format(
                            new Date(article.publishedAt),
                            "dd MMM HH:mm",
                            { locale: tr },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Platform Status Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* IndexNow */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        IndexNow
                      </div>
                      <StatusBadge
                        status={article.notifications.indexNow.status}
                      />
                      {article.notifications.indexNow.sentAt && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(
                            new Date(article.notifications.indexNow.sentAt),
                            "dd/MM HH:mm",
                          )}
                        </div>
                      )}
                    </div>

                    {/* Google */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Google
                      </div>
                      <StatusBadge
                        status={article.notifications.google.status}
                      />
                      {article.notifications.google.sentAt && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(
                            new Date(article.notifications.google.sentAt),
                            "dd/MM HH:mm",
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => resendNotification(article.id, "indexnow")}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      IndexNow
                    </button>
                    <button
                      onClick={() => resendNotification(article.id, "google")}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Google
                    </button>
                  </div>
                </div>
              ))}

              {/* Mobile Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="text-sm text-center text-gray-700 dark:text-gray-300 mb-3">
                    Sayfa {pagination.page} / {pagination.totalPages} (Toplam{" "}
                    {pagination.total} haber)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchArticles(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => fetchArticles(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Real-time Logs */}
        {showLogs && (
          <div className="mt-6 bg-gray-900 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <RefreshCw
                  className={`h-5 w-5 ${bulkGoogleProcessing ? "animate-spin" : ""}`}
                />
                Google Indexing API - Canlı Loglar
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Rate Limiting Info */}
            <div className="mb-3 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
              <div className="text-sm text-blue-300 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">⚡ Rate Limiting:</span>
                  <span>1 saniye/istek</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">📊 Günlük Limit:</span>
                  <span>200 URL (Google API)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">🎯 Strateji:</span>
                  <span>Sadece Google'a gönderim</span>
                </div>
              </div>
            </div>

            <div
              id="log-container"
              className="space-y-1 font-mono text-sm max-h-96 overflow-y-auto bg-black/30 rounded p-3"
            >
              {logs.length === 0 ? (
                <div className="text-gray-400 animate-pulse">
                  🔄 Loglar yükleniyor...
                </div>
              ) : (
                logs.map((log, index) => {
                  const logMessage =
                    typeof log === "string" ? log : log.message;
                  const logType = typeof log === "string" ? "" : log.type;

                  return (
                    <div
                      key={index}
                      className={`py-1 ${logType === "success" || logMessage.includes("✅")
                        ? "text-green-400"
                        : logType === "error" ||
                          logType === "fatal" ||
                          logMessage.includes("❌")
                          ? "text-red-400"
                          : logType === "warning" || logMessage.includes("⚠️")
                            ? "text-yellow-400"
                            : logType === "start" ||
                              logType === "complete" ||
                              logMessage.includes("🚀") ||
                              logMessage.includes("🎉")
                              ? "text-blue-400"
                              : logType === "progress"
                                ? "text-cyan-400"
                                : "text-gray-300"
                        }`}
                    >
                      {logMessage}
                    </div>
                  );
                })
              )}
            </div>

            {/* Progress Summary */}
            {bulkGoogleProcessing && logs.length > 0 && (
              <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>İşlem devam ediyor...</span>
                    <span className="text-blue-400 animate-pulse">●</span>
                  </div>
                </div>
              </div>
            )}

            {!bulkGoogleProcessing && logs.length > 0 && (
              <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                <div className="text-sm text-green-300">
                  ✅ İşlem tamamlandı! Detaylar için yukarıdaki logları
                  inceleyin.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Toplam Haber
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {pagination.total}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Seçili Haber
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {selectedArticles.size}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:col-span-2 lg:col-span-1">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Gönderilmemiş
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {
                articles.filter(
                  (a) =>
                    a.notifications.indexNow.status === "PENDING" ||
                    a.notifications.google.status === "PENDING",
                ).length
              }
            </div>
          </div>
        </div>
      </div>
    </AdminLayout >
  );
}
