/**
 * Social Media Shares Admin Page
 * Central dashboard for tracking and managing social media shares
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  RefreshCw,
  Play,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Settings,
  Loader2,
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
import { usePageVisibility } from "@/hooks/usePageVisibility";
import {
  platformConfig,
  platformRateProfiles,
  normalizePlatformKey,
  getRecommendedMinInterval,
  ALL_PLATFORMS,
  type SocialPlatformKey,
} from "@/config/social-platforms";

function isSocialPlatformKey(value: string): value is SocialPlatformKey {
  return value in platformConfig;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { icon: React.ReactNode; color: string; text: string }
  > = {
    SHARED: {
      icon: <CheckCircle className="w-3 h-3" />,
      color: "bg-green-500/20 text-green-400",
      text: "Paylaşıldı",
    },
    PENDING: {
      icon: <Clock className="w-3 h-3" />,
      color: "bg-yellow-500/20 text-yellow-400",
      text: "Bekliyor",
    },
    SCHEDULED: {
      icon: <Clock className="w-3 h-3" />,
      color: "bg-blue-500/20 text-blue-400",
      text: "Planlandı",
    },
    PROCESSING: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      color: "bg-purple-500/20 text-purple-400",
      text: "İşleniyor",
    },
    FAILED: {
      icon: <XCircle className="w-3 h-3" />,
      color: "bg-red-500/20 text-red-400",
      text: "Başarısız",
    },
    NOT_CREATED: {
      icon: <AlertCircle className="w-3 h-3" />,
      color: "bg-gray-500/20 text-gray-400",
      text: "Yok",
    },
  };

  const c = config[status] || config.NOT_CREATED;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${c.color}`}
    >
      {c.icon}
      {c.text}
    </span>
  );
}

interface RetryComboSummary {
  key: string;
  platform: string;
  language: string;
  label: string;
  icon: string;
  missingCount: number;
  articleCount: number;
}

interface UnsharedSummary {
  totalPublished: number;
  totalUnshared: number;
  byPlatform: Record<string, number>;
}

type VisibilityFilter = "all" | "shared" | "unshared" | "pending" | "failed";
type BatchTargetMode = "auto-unshared" | "selected" | "filtered";

export default function SocialSharesPage() {
  const isPageVisible = usePageVisibility();
  const { toast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [batches, setBatches] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  // Selective sharing - NEW FEATURE
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Batch settings
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "FACEBOOK",
    "FACEBOOK_EN",
    "BLUESKY",
    "BLUESKY_EN",
    "MASTODON",
    "MASTODON_EN",
  ]);
  const [batchSize, setBatchSize] = useState(50);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [batchTargetMode, setBatchTargetMode] =
    useState<BatchTargetMode>("auto-unshared");

  // Active batch tracking
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const activeBatchRef = useRef<any>(null);
  const progressPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Unified social insights (from old separate pages)
  const [retryCombos, setRetryCombos] = useState<RetryComboSummary[]>([]);
  const [selectedRetryCombos, setSelectedRetryCombos] = useState<string[]>([]);
  const [unsharedSummary, setUnsharedSummary] =
    useState<UnsharedSummary | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  // Cancel confirmation dialog
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Fetch articles
  const isStatusMatch = useCallback(
    (article: any) => {
      if (visibilityFilter === "all") return true;

      const statuses: string[] = selectedPlatform
        ? [article.shares?.[selectedPlatform]?.status || "NOT_CREATED"]
        : Object.keys(platformConfig).map(
          (platform) => article.shares?.[platform]?.status || "NOT_CREATED",
        );

      if (visibilityFilter === "shared") {
        return statuses.some((status) => status === "SHARED");
      }

      if (visibilityFilter === "unshared") {
        return statuses.some((status) => status === "NOT_CREATED");
      }

      if (visibilityFilter === "pending") {
        return statuses.some((status) =>
          ["PENDING", "SCHEDULED", "PROCESSING"].includes(status),
        );
      }

      if (visibilityFilter === "failed") {
        return statuses.some((status) => status === "FAILED");
      }

      return true;
    },
    [selectedPlatform, visibilityFilter],
  );

  const buildArticleParams = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(selectedPlatform && { platform: selectedPlatform }),
      });

      if (languageFilter !== "all") {
        params.set("language", languageFilter);
      }

      if (visibilityFilter !== "all") {
        params.set("visibility", visibilityFilter);
      }

      // When platform is selected, also send status for precise server-side filter
      if (
        selectedPlatform &&
        ["shared", "failed", "pending"].includes(visibilityFilter)
      ) {
        const apiStatusMap: Record<string, string> = {
          shared: "SHARED",
          failed: "FAILED",
          pending: "PENDING",
        };
        params.set("status", apiStatusMap[visibilityFilter]);
      }

      return params;
    },
    [languageFilter, search, selectedPlatform, visibilityFilter],
  );

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildArticleParams(pagination.page, pagination.limit);

      const res = await fetch(`/api/admin/social-shares?${params}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.articles) {
        setArticles(data.articles);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
    setLoading(false);
  }, [
    buildArticleParams,
    pagination.page,
    pagination.limit,
  ]);

  const fetchFilteredArticleIds = useCallback(async (maxItems = 500) => {
    const selectedIds = new Set<string>();
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && selectedIds.size < maxItems) {
      const params = buildArticleParams(page, 100);
      const res = await fetch(`/api/admin/social-shares?${params}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) break;

      for (const article of (data.articles || [])) {
        selectedIds.add(article.id);
        if (selectedIds.size >= maxItems) break;
      }

      totalPages = data.pagination?.totalPages || page;
      page += 1;
    }

    return Array.from(selectedIds);
  }, [buildArticleParams]);

  // Fetch batch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social-shares/batch", {
        credentials: "include",
      });
      const data = await res.json();

      if (data.stats) setStats(data.stats);
      if (data.batches) setBatches(data.batches);
      if (data.activeBatch) {
        activeBatchRef.current = data.activeBatch;
        setActiveBatch(data.activeBatch);
      } else {
        // Batch completed or stopped
        if (activeBatchRef.current) {
          // Was active, now stopped - refresh articles one more time
          fetchArticles();
          toast({
            title: "Batch Tamamlandı",
            description: "Paylaşım işlemi tamamlandı",
          });
        }
        activeBatchRef.current = null;
        setActiveBatch(null);
        // Stop polling if no active batch
        if (progressPollingRef.current) {
          clearInterval(progressPollingRef.current);
          progressPollingRef.current = null;
        }
      }
    } catch (error) {
      console.error("Stats fetch error:", error);
    }
  }, [fetchArticles, toast]);

  useEffect(() => {
    if (progressPollingRef.current) {
      clearInterval(progressPollingRef.current);
      progressPollingRef.current = null;
    }

    if (!activeBatch || !isPageVisible) {
      return undefined;
    }

    progressPollingRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStats();
        fetchArticles();
      }
    }, 5000);

    return () => {
      if (progressPollingRef.current) {
        clearInterval(progressPollingRef.current);
        progressPollingRef.current = null;
      }
    };
  }, [activeBatch, fetchArticles, fetchStats, isPageVisible]);

  useEffect(() => {
    if (activeBatch && isPageVisible) {
      fetchStats();
    }
  }, [activeBatch, fetchStats, isPageVisible]);

  const fetchSocialInsights = useCallback(async () => {
    try {
      const [retryRes, unsharedRes] = await Promise.all([
        fetch("/api/admin/retry-shares", { credentials: "include" }),
        fetch("/api/admin/unshared-articles?page=1&limit=1", {
          credentials: "include",
        }),
      ]);

      const [retryData, unsharedData] = await Promise.all([
        retryRes.json(),
        unsharedRes.json(),
      ]);

      if (Array.isArray(retryData.summary)) {
        setRetryCombos(retryData.summary);
      }

      if (unsharedData.summary) {
        setUnsharedSummary(unsharedData.summary);
      }
    } catch (error) {
      console.error("Social insights fetch error:", error);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSocialInsights();
  }, [fetchSocialInsights]);

  // Start batch
  const startBatch = async (mode?: BatchTargetMode) => {
    const effectiveMode = mode || batchTargetMode;

    if (selectedPlatforms.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "En az bir platform seçmelisiniz",
      });
      return;
    }

    if (effectiveMode === "selected" && selectedArticleIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Seçili mod için en az bir haber seçin",
      });
      return;
    }

    setBatchLoading(true);
    try {
      const safeIntervalSeconds = Math.max(
        intervalSeconds,
        getRecommendedMinInterval(selectedPlatforms),
      );

      let articleIds: string[] | undefined;

      if (effectiveMode === "selected") {
        articleIds = selectedArticleIds;
      } else if (effectiveMode === "filtered") {
        articleIds = await fetchFilteredArticleIds(500);
        if (articleIds.length === 0) {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Filtreye uygun haber bulunamadı",
          });
          setBatchLoading(false);
          return;
        }
      }

      const res = await fetch("/api/admin/social-shares/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          ...(articleIds ? { articleIds } : { batchSize }),
          intervalSeconds: safeIntervalSeconds,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (safeIntervalSeconds !== intervalSeconds) {
          setIntervalSeconds(safeIntervalSeconds);
          toast({
            title: "Rate-limit koruması uygulandı",
            description: `Aralık ${safeIntervalSeconds} saniye olarak güncellendi.`,
          });
        }

        toast({
          title: "Başarılı",
          description: data.message,
        });
        setSelectedArticleIds([]);
        setSelectAll(false);
        setShowBatchModal(false);
        fetchArticles();
        fetchStats();
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error || "Batch başlatılamadı",
        });
      }
    } catch (error) {
      console.error("Batch error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Batch başlatılırken hata oluştu",
      });
    }
    setBatchLoading(false);
  };

  // Toggle platform selection
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  // Toggle article selection - NEW FEATURE
  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticleIds((prev) =>
      prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId],
    );
  };

  // Toggle select all articles - NEW FEATURE
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedArticleIds([]);
    } else {
      setSelectedArticleIds(articles.map((a) => a.id));
    }
    setSelectAll(!selectAll);
  };

  // Start selective batch - NEW FEATURE
  const startSelectiveBatch = async () => {
    if (selectedArticleIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen en az bir haber seçin",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen en az bir platform seçin",
      });
      return;
    }

    await startBatch("selected");
  };

  const startRetryBatch = async () => {
    if (selectedRetryCombos.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "En az bir retry kombinasyonu seçin",
      });
      return;
    }

    setRetryLoading(true);
    try {
      const retryPlatforms = retryCombos
        .filter((combo) => selectedRetryCombos.includes(combo.key))
        .map((combo) => combo.platform);
      const safeIntervalSeconds = Math.max(
        intervalSeconds,
        getRecommendedMinInterval(retryPlatforms),
      );

      const res = await fetch("/api/admin/retry-shares", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          combos: selectedRetryCombos,
          intervalSeconds: safeIntervalSeconds,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (safeIntervalSeconds !== intervalSeconds) {
          setIntervalSeconds(safeIntervalSeconds);
          toast({
            title: "Rate-limit koruması uygulandı",
            description: `Retry aralığı ${safeIntervalSeconds} saniyeye çıkarıldı.`,
          });
        }

        toast({ title: "Başlatıldı", description: data.message });
        setSelectedRetryCombos([]);
        fetchStats();
        fetchArticles();
        fetchSocialInsights();
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error || "Retry başlatılamadı",
        });
      }
    } catch (error) {
      console.error("Retry start error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Retry başlatılırken hata oluştu",
      });
    }
    setRetryLoading(false);
  };

  const toggleRetryCombo = (comboKey: string) => {
    setSelectedRetryCombos((prev) =>
      prev.includes(comboKey)
        ? prev.filter((item) => item !== comboKey)
        : [...prev, comboKey],
    );
  };

  const selectedRetryMissingTotal = retryCombos
    .filter((combo) => selectedRetryCombos.includes(combo.key))
    .reduce((sum, combo) => sum + combo.missingCount, 0);

  const recommendedMinIntervalSeconds = getRecommendedMinInterval(
    selectedPlatforms,
  );

  const rateLimitRiskLevel =
    intervalSeconds < recommendedMinIntervalSeconds
      ? "Yüksek"
      : intervalSeconds < Math.ceil(recommendedMinIntervalSeconds * 1.5)
        ? "Orta"
        : "Düşük";

  const rateLimitRiskClass =
    rateLimitRiskLevel === "Yüksek"
      ? "text-red-400"
      : rateLimitRiskLevel === "Orta"
        ? "text-yellow-400"
        : "text-green-400";

  // Request cancel batch (show confirmation dialog)
  const requestCancelBatch = () => {
    if (!activeBatch) return;
    setCancelConfirm(true);
  };

  // Cancel batch (actual execution)
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
        toast({
          title: "Başarılı",
          description: "Batch iptal edildi",
        });
        setActiveBatch(null);
        if (progressPollingRef.current) {
          clearInterval(progressPollingRef.current);
          progressPollingRef.current = null;
        }
        fetchStats();
        fetchArticles();
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error || "Batch iptal edilemedi",
        });
      }
    } catch (error) {
      console.error("Cancel batch error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Batch iptal edilirken hata oluştu",
      });
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (progressPollingRef.current) {
        clearInterval(progressPollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (intervalSeconds < recommendedMinIntervalSeconds) {
      setIntervalSeconds(recommendedMinIntervalSeconds);
      toast({
        title: "Rate-limit koruması",
        description: `Seçili platformlara göre aralık ${recommendedMinIntervalSeconds} saniyeye yükseltildi.`,
      });
    }
  }, [intervalSeconds, recommendedMinIntervalSeconds, toast]);

  return (
    <AdminLayout>
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batch'i İptal Et</AlertDialogTitle>
            <AlertDialogDescription>
              Aktif paylaşım batch'ini iptal etmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Evet, İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Share2 className="w-7 h-7" />
              Sosyal Medya Paylaşımları
            </h1>
            <p className="text-gray-400 mt-1">
              Tüm platformlar için merkezi paylaşım takibi
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedArticleIds.length > 0 && (
              <button
                onClick={startSelectiveBatch}
                disabled={batchLoading || !!activeBatch}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Seçilenleri Paylaş ({selectedArticleIds.length})
              </button>
            )}
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              <Play className="w-4 h-4" />
              Toplu Paylaşım Başlat
            </button>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(platformConfig).map(([platform, config]) => {
            const stat = stats[platform] || {
              shared: 0,
              pending: 0,
              failed: 0,
              unshared: 0,
            };
            return (
              <div
                key={platform}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{config.icon}</span>
                  <span className="text-sm font-medium text-white">
                    {config.label}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-green-400">Paylaşıldı:</span>
                    <span className="text-white">{stat.shared || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">Bekliyor:</span>
                    <span className="text-white">{stat.pending || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paylaşılmadı:</span>
                    <span className="text-white">{stat.unshared || "-"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unified Missing Share Summary */}
        {unsharedSummary && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Eksik Paylaşım Özeti
              </h3>
              <span className="text-sm text-gray-300">
                {unsharedSummary.totalUnshared} / {unsharedSummary.totalPublished}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.entries(platformConfig).map(([platformKey, config]) => (
                <div
                  key={platformKey}
                  className="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="text-xs text-gray-400">{config.label}</div>
                  <div className="text-lg font-semibold text-amber-400">
                    {unsharedSummary.byPlatform[platformKey] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retry Combo Manager (merged from retry-shares page) */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-cyan-400" />
              Retry Kombinasyonları
            </h3>
            <span className="text-xs text-gray-400">
              Platform + Dil bazlı eksik paylaşım
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {retryCombos.map((combo) => {
              const selected = selectedRetryCombos.includes(combo.key);
              const disabled = combo.missingCount === 0 || !!activeBatch;

              return (
                <button
                  key={combo.key}
                  onClick={() => !disabled && toggleRetryCombo(combo.key)}
                  disabled={disabled}
                  className={`text-left rounded-lg border p-3 transition-all ${selected
                    ? "bg-cyan-500/20 border-cyan-500"
                    : disabled
                      ? "bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed"
                      : "bg-white/5 border-white/10 hover:border-cyan-500/50"
                    }`}
                >
                  <div className="text-sm text-white font-medium">
                    {combo.icon} {combo.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Eksik: {combo.missingCount}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Retry paylaşım aralığı"
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(parseInt(e.target.value))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
            >
              <option value={5}>5 saniye</option>
              <option value={10}>10 saniye</option>
              <option value={15}>15 saniye</option>
              <option value={30}>30 saniye</option>
              <option value={60}>60 saniye</option>
            </select>

            <button
              onClick={startRetryBatch}
              disabled={
                retryLoading || selectedRetryCombos.length === 0 || !!activeBatch
              }
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-white disabled:opacity-50"
            >
              {retryLoading ? "Başlatılıyor..." : "Retry Batch Başlat"}
            </button>

            <span className="text-sm text-gray-300">
              Seçili eksik toplam: {selectedRetryMissingTotal}
            </span>
            <span className={`text-sm font-medium ${rateLimitRiskClass}`}>
              Rate-limit riski: {rateLimitRiskLevel}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Haber ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={selectedPlatform || ""}
            onChange={(e) => setSelectedPlatform(e.target.value || null)}
            aria-label="Platform seçimi"
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tüm Platformlar</option>
            {Object.entries(platformConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            aria-label="Dil seçimi"
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Tüm Diller</option>
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
            aria-label="Paylaşım durumu seçimi"
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Tümü</option>
            <option value="shared">Paylaşılan</option>
            <option value="unshared">Paylaşılmayan</option>
            <option value="pending">Bekleyen</option>
            <option value="failed">Hatalı</option>
          </select>

          <button
            onClick={async () => {
              const ids = await fetchFilteredArticleIds(500);
              setSelectedArticleIds(ids);
              setSelectAll(false);
              toast({
                title: "Seçim güncellendi",
                description: `${ids.length} haber filtreye göre seçildi (max 500)`,
              });
            }}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-600/20 border border-cyan-500/30 rounded-lg text-cyan-200 hover:bg-cyan-600/30 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtredekileri Seç
          </button>

          <button
            onClick={() => {
              setSelectedArticleIds([]);
              setSelectAll(false);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
          >
            Seçimi Temizle
          </button>

          <button
            onClick={() => {
              fetchArticles();
              fetchStats();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

        {/* Articles Table - Desktop */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-center px-2 py-3 text-sm font-medium text-gray-400">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                      title="Tümünü seç"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                    Haber
                  </th>
                  {Object.entries(platformConfig).map(([key, config]) => (
                    <th
                      key={key}
                      className="text-center px-2 py-3 text-sm font-medium text-gray-400"
                    >
                      <span title={config.label}>{config.icon}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Yükleniyor...
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      Haber bulunamadı
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => (
                    <tr
                      key={article.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label="Haberi seç"
                          title="Haberi seç"
                          checked={selectedArticleIds.includes(article.id)}
                          onChange={() => toggleArticleSelection(article.id)}
                          className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p
                            className="text-white text-sm font-medium truncate"
                            title={article.title}
                          >
                            {article.title}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {article.category?.name} •{" "}
                            {article.publishedAt
                              ? new Date(
                                  article.publishedAt,
                                ).toLocaleDateString("tr-TR")
                              : "-"}
                          </p>
                        </div>
                      </td>
                      {Object.keys(platformConfig).map((platform) => (
                        <td key={platform} className="px-2 py-3 text-center">
                          <StatusBadge
                            status={
                              article.shares?.[platform]?.status ||
                              "NOT_CREATED"
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Yükleniyor...
              </div>
            ) : articles.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                Haber bulunamadı
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="p-4 hover:bg-white/5 transition-colors"
                  >
                    <p className="text-white text-sm font-medium mb-1 line-clamp-2">
                      {article.title}
                    </p>
                    <p className="text-gray-500 text-xs mb-3">
                      {article.category?.name} •{" "}
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString(
                            "tr-TR",
                          )
                        : "-"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(platformConfig).map(
                        ([platform, config]) => (
                          <div
                            key={platform}
                            className="flex items-center gap-1"
                          >
                            <span className="text-xs">{config.icon}</span>
                            <StatusBadge
                              status={
                                article.shares?.[platform]?.status ||
                                "NOT_CREATED"
                              }
                            />
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <div className="text-sm text-gray-400">
              Toplam {pagination.total} haber
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                disabled={pagination.page <= 1}
                aria-label="Önceki sayfa"
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">
                Sayfa {pagination.page} / {pagination.totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Sonraki sayfa"
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Batch Progress */}
        {activeBatch && (
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                Aktif Batch Çalışıyor
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-300">
                  Sayfa kapatılsa bile devam edecek
                </span>
                <button
                  onClick={requestCancelBatch}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  İptal Et
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Platformlar:</span>
                <div className="flex items-center gap-2">
                  {activeBatch.platform?.split(",").map((p: string) => (
                    (() => {
                      const platformKey = isSocialPlatformKey(p) ? p : null;
                      const config = platformKey ? platformConfig[platformKey] : null;

                      return (
                    <span
                      key={p}
                      className="text-white bg-white/10 px-2 py-0.5 rounded text-xs"
                    >
                          {config?.icon} {config?.label || p}
                    </span>
                      );
                    })()
                  ))}
                </div>
              </div>
              {activeBatch.progress && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">İlerleme:</span>
                    <span className="text-white">
                      {activeBatch.progress.progress?.currentArticle || 0} /{" "}
                      {activeBatch.progress.progress?.totalArticles ||
                        Math.ceil(
                          activeBatch.totalItems /
                            (activeBatch.platform?.split(",").length || 1),
                        )}{" "}
                      haber
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Paylaşılan:</span>
                    <span className="text-green-400">
                      {activeBatch.progress.progress?.processed || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Başarısız:</span>
                    <span className="text-red-400">
                      {activeBatch.progress.progress?.failed || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Atlanan (zaten paylaşıldı):
                    </span>
                    <span className="text-yellow-400">
                      {activeBatch.progress.progress?.skipped || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
                      style={{
                        width: `${
                          activeBatch.progress.progress?.totalArticles > 0
                            ? (activeBatch.progress.progress?.currentArticle /
                                activeBatch.progress.progress?.totalArticles) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Recent Batches */}
        {batches.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Son Batch İşlemleri
            </h3>
            <div className="space-y-2">
              {batches.slice(0, 5).map((batch) => (
                (() => {
                  const batchPlatform = String(batch.platform || "");
                  const batchPlatformConfig = isSocialPlatformKey(batchPlatform)
                    ? platformConfig[batchPlatform]
                    : null;

                  return (
                <div
                  key={batch.id}
                  className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                        <span>{batchPlatformConfig?.icon}</span>
                    <span className="text-white text-sm">
                          {batchPlatformConfig?.label || batchPlatform}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {batch.processedItems}/{batch.totalItems} işlendi
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        batch.status === "COMPLETED"
                          ? "bg-green-500/20 text-green-400"
                          : batch.status === "PROCESSING"
                            ? "bg-purple-500/20 text-purple-400"
                            : batch.status === "FAILED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {batch.status}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(batch.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          </div>
        )}

        {/* Batch Modal */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/20 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Toplu Paylaşım Başlat
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
                  <p className="text-xs text-gray-500 mt-1">
                    Seçili: {selectedPlatforms.length} platform
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="batch-target-mode"
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Batch Hedefi
                  </label>
                  <select
                    id="batch-target-mode"
                    value={batchTargetMode}
                    onChange={(e) =>
                      setBatchTargetMode(e.target.value as BatchTargetMode)
                    }
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="auto-unshared">
                      Otomatik (Paylaşılmayanlardan)
                    </option>
                    <option value="selected">
                      Sadece Seçtiklerim ({selectedArticleIds.length})
                    </option>
                    <option value="filtered">
                      Filtreye Uyan Tümü (max 500)
                    </option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    İstediğin moda göre tekli/çoklu/toplu batch kurarsın.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="batch-size"
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Batch Boyutu
                  </label>
                  <input
                    id="batch-size"
                    type="number"
                    value={batchSize}
                    onChange={(e) =>
                      setBatchSize(parseInt(e.target.value) || 10)
                    }
                    min={1}
                    max={100}
                    disabled={batchTargetMode !== "auto-unshared"}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {batchTargetMode === "auto-unshared"
                      ? "Kaç haber paylaşılacak"
                      : "Bu modda article listesi baz alınır"}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="interval-seconds"
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Paylaşım Aralığı (saniye)
                  </label>
                  <select
                    id="interval-seconds"
                    value={intervalSeconds}
                    onChange={(e) =>
                      setIntervalSeconds(parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value={5}>5 saniye</option>
                    <option value={10}>10 saniye</option>
                    <option value={15}>15 saniye</option>
                    <option value={30}>30 saniye</option>
                    <option value={45}>45 saniye</option>
                    <option value={60}>1 dakika</option>
                    <option value={90}>1.5 dakika</option>
                    <option value={120}>2 dakika</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Her haber arasında beklenecek süre
                  </p>
                  <p className="text-xs text-cyan-300 mt-1">
                    Önerilen minimum: {recommendedMinIntervalSeconds} saniye
                  </p>
                  <p className={`text-xs mt-1 ${rateLimitRiskClass}`}>
                    Rate-limit riski: {rateLimitRiskLevel}
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    <strong>Paralel Paylaşım:</strong> Her haber için seçili tüm
                    platformlara <span className="text-white">aynı anda</span>{" "}
                    paylaşım yapılır. TR ve EN içerikler paralel gönderilir.
                    Zaten paylaşılmış platformlar otomatik atlanır. İşlem arka
                    planda çalışır, sayfa kapatılsa bile devam eder.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:bg-white/20"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    void startBatch();
                  }}
                  disabled={
                    batchLoading ||
                    selectedPlatforms.length === 0 ||
                    !!activeBatch
                  }
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {batchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : activeBatch ? (
                    "Batch Çalışıyor"
                  ) : (
                    "Başlat"
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
