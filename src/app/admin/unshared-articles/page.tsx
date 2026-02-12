"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  RefreshCw,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Square,
  CheckSquare,
  Filter,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const platformConfig: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  FACEBOOK: { icon: "📘", color: "bg-blue-600", label: "Facebook TR" },
  FACEBOOK_EN: { icon: "📘", color: "bg-blue-500", label: "Facebook EN" },
  BLUESKY: { icon: "🦋", color: "bg-sky-500", label: "Bluesky TR" },
  BLUESKY_EN: { icon: "🦋", color: "bg-sky-400", label: "Bluesky EN" },
  MASTODON: { icon: "🐘", color: "bg-purple-600", label: "Mastodon TR" },
  MASTODON_EN: { icon: "🐘", color: "bg-purple-500", label: "Mastodon EN" },
};

interface UnsharedArticle {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  publishedAt: string;
  category: string;
  hasEN: boolean;
  missingPlatforms: string[];
  sharedPlatforms: string[];
}

interface Summary {
  totalPublished: number;
  totalUnshared: number;
  byPlatform: Record<string, number>;
}

export default function UnsharedArticlesPage() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<UnsharedArticle[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("");

  // Batch controls
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "BLUESKY",
    "BLUESKY_EN",
    "MASTODON",
    "MASTODON_EN",
  ]);
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  // Active batch tracking
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(filterPlatform && { platform: filterPlatform }),
      });
      const res = await fetch(`/api/admin/unshared-articles?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.articles) {
        setArticles(data.articles);
        setPagination(data.pagination);
        setSummary(data.summary);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, filterPlatform]);

  const fetchBatchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social-shares/batch", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.activeBatch) {
        setActiveBatch(data.activeBatch);
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => {
            fetchBatchStatus();
            fetchArticles();
          }, 3000);
        }
      } else {
        if (activeBatch) {
          fetchArticles();
          toast({ title: "Tamamlandı", description: "Paylaşım işlemi bitti" });
        }
        setActiveBatch(null);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (e) {
      console.error("Batch status error:", e);
    }
  }, [activeBatch, fetchArticles, toast]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);
  useEffect(() => {
    fetchBatchStatus();
  }, []);
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const toggleArticle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(articles.map((a) => a.id));
    }
    setSelectAll(!selectAll);
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const startBatch = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "En az bir platform seçin",
      });
      return;
    }
    setBatchLoading(true);
    try {
      const body: any = {
        platforms: selectedPlatforms,
        intervalSeconds,
      };
      // If specific articles selected, send their IDs; otherwise share all unshared
      if (selectedIds.length > 0) {
        body.articleIds = selectedIds;
      } else {
        body.batchSize = summary?.totalUnshared || 9999;
      }

      const res = await fetch("/api/admin/social-shares/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Başlatıldı", description: data.message });
        setShowStartModal(false);
        setSelectedIds([]);
        setSelectAll(false);
        fetchBatchStatus();
        fetchArticles();
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Batch başlatılamadı",
      });
    }
    setBatchLoading(false);
  };

  const cancelBatch = async () => {
    if (!activeBatch) return;
    setCancelConfirm(false);
    try {
      const res = await fetch(
        `/api/admin/social-shares/batch?batchId=${activeBatch.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "İptal Edildi", description: "Batch durduruldu" });
        setActiveBatch(null);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        fetchArticles();
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İptal edilemedi",
      });
    }
  };

  return (
    <AdminLayout>
      {/* Cancel Dialog */}
      <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batch İptal</AlertDialogTitle>
            <AlertDialogDescription>
              Aktif paylaşım işlemini iptal etmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
              Paylaşılmayan Haberler
            </h1>
            <p className="text-gray-400 mt-1">
              Sosyal medyada eksik paylaşımı olan haberler
              {summary && (
                <span className="text-amber-400 ml-2 font-medium">
                  ({summary.totalUnshared} / {summary.totalPublished} haber)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowStartModal(true)}
                disabled={!!activeBatch}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all text-white disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Seçilenleri Paylaş ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => setShowStartModal(true)}
              disabled={!!activeBatch}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-white disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Tümünü Paylaş
            </button>
          </div>
        </div>

        {/* Platform Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(platformConfig).map(([key, config]) => {
              const missing = summary.byPlatform[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() =>
                    setFilterPlatform(filterPlatform === key ? "" : key)
                  }
                  className={`rounded-xl p-3 border transition-all text-left ${
                    filterPlatform === key
                      ? "bg-purple-500/20 border-purple-500"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-xs font-medium text-white">
                      {config.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-amber-400">
                    {missing}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    eksik paylaşım
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Haber ara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          {filterPlatform && (
            <button
              onClick={() => setFilterPlatform("")}
              className="flex items-center gap-1 px-3 py-2 bg-purple-500/20 border border-purple-500 rounded-lg text-purple-300 text-sm"
            >
              <Filter className="w-3 h-3" />
              {platformConfig[filterPlatform]?.icon}{" "}
              {platformConfig[filterPlatform]?.label}
              <XCircle className="w-3 h-3 ml-1" />
            </button>
          )}
          <button
            onClick={() => {
              fetchArticles();
              fetchBatchStatus();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

        {/* Active Batch Progress */}
        {activeBatch && (
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl border border-purple-500/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                Paylaşım Devam Ediyor
              </h3>
              <button
                onClick={() => setCancelConfirm(true)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" /> İptal
              </button>
            </div>
            {activeBatch.progress?.progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">İlerleme:</span>
                  <span className="text-white">
                    {activeBatch.progress.progress.currentArticle || 0} /{" "}
                    {activeBatch.progress.progress.totalArticles || "?"} haber
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-400">
                    ✅ {activeBatch.progress.progress.processed || 0}
                  </span>
                  <span className="text-red-400">
                    ❌ {activeBatch.progress.progress.failed || 0}
                  </span>
                  <span className="text-yellow-400">
                    ⏭️ {activeBatch.progress.progress.skipped || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
                    style={{
                      width: `${
                        activeBatch.progress.progress.totalArticles > 0
                          ? (activeBatch.progress.progress.currentArticle /
                              activeBatch.progress.progress.totalArticles) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-purple-300">
                  Sayfa kapatılsa bile arka planda devam eder
                </p>
              </div>
            )}
          </div>
        )}

        {/* Articles Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-center px-2 py-3 text-sm font-medium text-gray-400">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1"
                      title="Tümünü seç"
                    >
                      {selectAll ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                    Haber
                  </th>
                  <th className="text-center px-2 py-3 text-sm font-medium text-gray-400">
                    Eksik Platformlar
                  </th>
                  <th className="text-center px-2 py-3 text-sm font-medium text-gray-400">
                    Paylaşılan
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Yükleniyor...
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      {summary?.totalUnshared === 0
                        ? "🎉 Tüm haberler tüm platformlarda paylaşılmış!"
                        : "Sonuç bulunamadı"}
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => (
                    <tr
                      key={article.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => toggleArticle(article.id)}
                          className="p-1"
                        >
                          {selectedIds.includes(article.id) ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-lg">
                          <p
                            className="text-white text-sm font-medium truncate"
                            title={article.title}
                          >
                            {article.title}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {article.category} •{" "}
                            {article.publishedAt
                              ? new Date(
                                  article.publishedAt,
                                ).toLocaleDateString("tr-TR")
                              : "-"}
                            {article.hasEN && (
                              <span className="ml-1 text-blue-400">[EN]</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {article.missingPlatforms.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400"
                            >
                              {platformConfig[p]?.icon}{" "}
                              {platformConfig[p]?.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {article.sharedPlatforms.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400"
                            >
                              {platformConfig[p]?.icon}
                            </span>
                          ))}
                          {article.sharedPlatforms.length === 0 && (
                            <span className="text-xs text-gray-600">
                              Hiçbiri
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden divide-y divide-white/5">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              </div>
            ) : articles.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                Sonuç yok
              </div>
            ) : (
              articles.map((article) => (
                <div key={article.id} className="p-4 hover:bg-white/5">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleArticle(article.id)}
                      className="mt-1"
                    >
                      {selectedIds.includes(article.id) ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium line-clamp-2">
                        {article.title}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {article.category} •{" "}
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString(
                              "tr-TR",
                            )
                          : "-"}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.missingPlatforms.map((p) => (
                          <span
                            key={p}
                            className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded"
                          >
                            {platformConfig[p]?.icon} {platformConfig[p]?.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <div className="text-sm text-gray-400">
              {summary?.totalUnshared || 0} eksik paylaşımlı haber
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                disabled={pagination.page <= 1}
                aria-label="Önceki sayfa"
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">
                {pagination.page} / {pagination.totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Sonraki sayfa"
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Start Batch Modal */}
        {showStartModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/20 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-400" />
                {selectedIds.length > 0
                  ? `${selectedIds.length} Haber Paylaş`
                  : `Tüm Eksik Haberleri Paylaş (${summary?.totalUnshared || 0})`}
              </h2>

              <div className="space-y-4">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Platformlar
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(platformConfig).map(([key, config]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          selectedPlatforms.includes(key)
                            ? "bg-purple-500/20 border-purple-500"
                            : "bg-white/5 border-white/10 hover:border-white/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(key)}
                          onChange={() => togglePlatform(key)}
                          className="sr-only"
                        />
                        <span className="text-lg">{config.icon}</span>
                        <span className="text-sm text-white">
                          {config.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Interval Selection */}
                <div>
                  <label
                    htmlFor="share-interval"
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Paylaşım Aralığı
                  </label>
                  <select
                    id="share-interval"
                    value={intervalSeconds}
                    onChange={(e) =>
                      setIntervalSeconds(parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value={10}>10 saniye</option>
                    <option value={15}>15 saniye</option>
                    <option value={30}>30 saniye</option>
                    <option value={60}>1 dakika</option>
                    <option value={120}>2 dakika</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Her haber arasında beklenecek süre
                  </p>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    Her haber için seçili platformlara paralel paylaşım yapılır.
                    Zaten paylaşılmış platformlar otomatik atlanır. İşlem arka
                    planda çalışır, sayfa kapatılsa bile devam eder.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:bg-white/20"
                >
                  İptal
                </button>
                <button
                  onClick={startBatch}
                  disabled={
                    batchLoading ||
                    selectedPlatforms.length === 0 ||
                    !!activeBatch
                  }
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {batchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Başlat
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
