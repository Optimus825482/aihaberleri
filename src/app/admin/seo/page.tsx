"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  TrendingUp,
  FileText,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Lightbulb,
  Zap,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  CalendarDays,
  Target,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { SEOPanel } from "@/components/admin/SEOPanel";
import { useToast } from "@/hooks/use-toast";

interface SEORecommendation {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  suggestion: string;
  isResolved: boolean;
}

interface ArticleSEO {
  id: string;
  title: string;
  slug: string;
  seoScore: number;
  language?: string;
  publishedAt?: string | null;
  keywords?: string[];
  status: string;
  category: { name: string } | null;
  _count: { seoRecommendations: number };
  seoRecommendations?: SEORecommendation[];
}

interface BulkProgressItem {
  index: number;
  total: number;
  articleId: string;
  title: string;
  status: "success" | "failed" | "skipped" | "error";
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  message: string;
}

interface BulkResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  avgImprovement: number;
  message?: string;
}

interface ContentPlanArticle {
  id: string;
  title: string;
  slug: string;
  language: string;
  category: string;
  publishedAt: string | null;
  seoScore: number;
  targetScore: number;
  projectedLift: number;
  priorityScore: number;
  intent: "informational" | "commercial" | "transactional";
  primaryKeyword: string;
  secondaryKeywords: string[];
}

interface ContentPlanWeek {
  week: number;
  focus: string;
  targetKeyword: string;
  contentType: string;
  wordCountTarget: number;
  internalLinkTargets: string[];
  articleIds: string[];
}

interface ContentPlanData {
  generatedAt: string;
  summary: {
    candidateCount: number;
    plannedCount: number;
    averageCurrentScore: number;
    averageTargetScore: number;
    averageLift: number;
    totalProjectedLift: number;
  };
  priorityArticles: ContentPlanArticle[];
  topicClusters: Array<{
    category: string;
    pillarTitle: string;
    supportingArticles: string[];
    targetKeywords: string[];
  }>;
  calendar: ContentPlanWeek[];
}

interface SEOAutopilotState {
  enabled: boolean;
  intervalMinutes: number;
  maxScore: number;
  language: "tr" | "en" | "all";
  batchSize: number;
  delayMs: number;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastResult: string | null;
}

type OptimizationMode = "autonomous" | "manual" | "single";
type LanguageFilter = "tr" | "en" | "all";

export default function SEOPage() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<ArticleSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSEO | null>(
    null,
  );
  const [stats, setStats] = useState({
    avgScore: 0,
    optimized: 0,
    needsWork: 0,
    total: 0,
  });

  // Bulk optimize state
  const [bulkOptimizing, setBulkOptimizing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgressItem[]>([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkCurrent, setBulkCurrent] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [processingTitle, setProcessingTitle] = useState<string | null>(null);
  const [optimizeThreshold, setOptimizeThreshold] = useState(80);
  const [optimizeLimit, setOptimizeLimit] = useState(100);
  const [optimizationMode, setOptimizationMode] =
    useState<OptimizationMode>("autonomous");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("tr");
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [planAgeDays, setPlanAgeDays] = useState(30);
  const [planWeeks, setPlanWeeks] = useState(8);
  const [planLoading, setPlanLoading] = useState(false);
  const [contentPlan, setContentPlan] = useState<ContentPlanData | null>(null);
  const [autopilot, setAutopilot] = useState<SEOAutopilotState | null>(null);
  const [autopilotUpdating, setAutopilotUpdating] = useState(false);
  const bulkLogRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const lastIndexRef = useRef(0);
  const hasRecalculated = useRef(false);

  // Scan state
  const [scanResult, setScanResult] = useState<{
    tr: number;
    en: number;
    total: number;
    maxScore: number;
    timestamp: number;
  } | null>(null);
  const [scanning, setScanning] = useState(false);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("tr-TR");
  };

  const formatTimestamp = (value: number | null | undefined) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("tr-TR");
  };

  // ─── Scan: Optimize edilmemiş makaleleri tara ───
  const scanUnoptimized = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(
        `/api/admin/seo/scan-unoptimized?maxScore=${optimizeThreshold}`,
      );
      if (!res.ok) throw new Error("Tarama başarısız");
      const data = await res.json();
      setScanResult({
        tr: data.counts.tr,
        en: data.counts.en,
        total: data.counts.total,
        maxScore: data.maxScore,
        timestamp: data.timestamp,
      });
      toast({
        title: "Tarama tamamlandı",
        description: `${data.counts.total} optimize edilmemiş makale bulundu (TR: ${data.counts.tr}, EN: ${data.counts.en})`,
      });
    } catch (error) {
      toast({
        title: "Tarama hatası",
        description:
          error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  }, [optimizeThreshold, toast]);

  const updateStats = useCallback((articlesData: ArticleSEO[]) => {
    const total = articlesData.length;
    const avgScore =
      total > 0
        ? Math.round(
          articlesData.reduce(
            (sum: number, a: ArticleSEO) => sum + (a.seoScore || 0),
            0,
          ) / total,
        )
        : 0;
    const optimized = articlesData.filter(
      (a: ArticleSEO) => (a.seoScore || 0) >= 80,
    ).length;
    const needsWork = articlesData.filter(
      (a: ArticleSEO) => (a.seoScore || 0) < 60,
    ).length;
    setStats({ avgScore, optimized, needsWork, total });
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        include: "seo",
        status: "PUBLISHED",
        limit: "250",
      });

      if (languageFilter !== "all") {
        query.set("language", languageFilter);
      }

      const response = await fetch(
        `/api/admin/articles?${query.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        let articlesData = data.articles || [];

        // Null/0 skorlu makaleler varsa ve henüz recalculate yapılmadıysa
        const hasNullScores = articlesData.some(
          (a: ArticleSEO) => a.seoScore === null || a.seoScore === 0,
        );
        if (hasNullScores && !hasRecalculated.current) {
          hasRecalculated.current = true;
          try {
            await fetch("/api/admin/seo/recalculate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ all: true, status: "PUBLISHED" }),
            });
            // Skorlar güncellendi, tekrar fetch et
            const refreshed = await fetch(
              `/api/admin/articles?${query.toString()}`,
            );
            if (refreshed.ok) {
              const refreshedData = await refreshed.json();
              articlesData = refreshedData.articles || [];
            }
          } catch (e) {
            console.warn("SEO recalculate failed:", e);
          }
        }

        setArticles(articlesData);
        updateStats(articlesData);

        if (articlesData.length > 0 && !selectedArticle) {
          const lowScoreArticle = [...articlesData]
            .sort(
              (a: ArticleSEO, b: ArticleSEO) =>
                (a.seoScore || 0) - (b.seoScore || 0),
            )
            .find((a: ArticleSEO) => (a.seoScore || 0) < 80);
          if (lowScoreArticle) {
            setSelectedArticle(lowScoreArticle);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      toast({
        title: "Hata",
        description: "Makaleler yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [languageFilter, selectedArticle, toast, updateStats]);

  const fetchContentPlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      const query = new URLSearchParams({
        maxScore: String(optimizeThreshold),
        ageDays: String(planAgeDays),
        weeks: String(planWeeks),
        limit: String(Math.max(optimizeLimit, 20)),
        language: languageFilter,
        mode: optimizationMode,
      });

      const response = await fetch(`/api/admin/seo/content-plan?${query}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Plan üretilemedi");
      }

      setContentPlan(data as ContentPlanData);
    } catch (error) {
      console.error("Failed to fetch content plan:", error);
      toast({
        title: "Plan üretilemedi",
        description:
          error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setPlanLoading(false);
    }
  }, [
    languageFilter,
    optimizationMode,
    optimizeLimit,
    optimizeThreshold,
    planAgeDays,
    planWeeks,
    toast,
  ]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    fetchContentPlan();
  }, [fetchContentPlan]);

  // ─── Polling: Job durumunu her 2 saniyede kontrol et ───
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async () => {
    const jobId = jobIdRef.current;
    if (!jobId) return;

    try {
      const since = lastIndexRef.current;
      const res = await fetch(
        `/api/admin/seo/auto-optimize?jobId=${jobId}&since=${since}`,
      );
      if (!res.ok) return;

      const data = await res.json();

      if (data.autopilot) {
        setAutopilot(data.autopilot);
      }

      // Yeni progress'leri ekle
      if (data.progress && data.progress.length > 0) {
        setBulkProgress((prev) => [...prev, ...data.progress]);
        const maxIndex = Math.max(
          ...data.progress.map((p: BulkProgressItem) => p.index),
        );
        lastIndexRef.current = maxIndex;

        // Auto-scroll
        setTimeout(() => {
          bulkLogRef.current?.scrollTo({
            top: bulkLogRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 50);
      }

      setBulkTotal(data.total);
      setBulkCurrent(data.current);
      setProcessingTitle(data.processingTitle || null);

      // Job bitti mi?
      if (!data.active) {
        stopPolling();
        setBulkOptimizing(false);
        setProcessingTitle(null);
        setBulkResult({
          processed: data.total,
          succeeded: data.succeeded,
          failed: data.failed,
          skipped: data.skipped,
          avgImprovement: data.avgImprovement,
          message: data.error || undefined,
        });
        jobIdRef.current = null;
        lastIndexRef.current = 0;
        fetchArticles();
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [fetchArticles, stopPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      jobIdRef.current = jobId;
      lastIndexRef.current = 0;
      pollingRef.current = setInterval(pollJobStatus, 2000);
    },
    [pollJobStatus, stopPolling],
  );

  // ─── Tara & Başlat: Scan sonrası otomatik batch başlat ───
  const scanAndOptimize = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(
        `/api/admin/seo/scan-unoptimized?maxScore=${optimizeThreshold}`,
      );
      if (!res.ok) throw new Error("Tarama başarısız");
      const data = await res.json();
      setScanResult({
        tr: data.counts.tr,
        en: data.counts.en,
        total: data.counts.total,
        maxScore: data.maxScore,
        timestamp: data.timestamp,
      });

      const targetCount =
        languageFilter === "all"
          ? data.counts.total
          : data.counts[languageFilter] || 0;

      if (targetCount === 0) {
        toast({
          title: "Tamamlanmış",
          description: `${languageFilter.toUpperCase()} dilinde optimize edilmemiş makale bulunamadı.`,
        });
        setScanning(false);
        return;
      }

      toast({
        title: `${targetCount} makale bulundu`,
        description: `${Math.min(targetCount, optimizeLimit)} makale batch olarak optimize edilecek...`,
      });
    } catch (error) {
      toast({
        title: "Tarama hatası",
        description:
          error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive",
      });
      setScanning(false);
      return;
    }

    setScanning(false);

    // Scan başarılı — şimdi otonom batch başlat
    setOptimizationMode("autonomous");
    setBulkOptimizing(true);
    setBulkProgress([]);
    setBulkResult(null);
    setBulkTotal(0);
    setBulkCurrent(0);
    setProcessingTitle(null);

    try {
      const response = await fetch("/api/admin/seo/auto-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxScore: optimizeThreshold,
          limit: optimizeLimit,
          language: languageFilter,
        }),
      });

      const result = await response.json();

      if (response.status === 409 && result.jobId) {
        startPolling(result.jobId);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "İstek başarısız");
      }

      startPolling(result.jobId);
    } catch (err) {
      console.error("Scan & optimize error:", err);
      setBulkOptimizing(false);
      setBulkResult({
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        avgImprovement: 0,
        message: err instanceof Error ? err.message : "Bağlantı hatası",
      });
    }
  }, [
    languageFilter,
    optimizeLimit,
    optimizeThreshold,
    startPolling,
    toast,
  ]);

  const fetchAutoOptimizeStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo/auto-optimize");
      if (!res.ok) return;
      const data = await res.json();

      if (data.autopilot) {
        setAutopilot(data.autopilot);
      }

      if (data.active && data.jobId && !jobIdRef.current) {
        setBulkOptimizing(true);
        setBulkTotal(data.total || 0);
        setBulkCurrent(data.current || 0);

        const fullRes = await fetch(
          `/api/admin/seo/auto-optimize?jobId=${data.jobId}&since=0`,
        );
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          if (fullData.progress?.length > 0) {
            setBulkProgress(fullData.progress);
            lastIndexRef.current = Math.max(
              ...fullData.progress.map((p: BulkProgressItem) => p.index),
            );
          }
        }

        startPolling(data.jobId);
      }
    } catch {
      // ignore
    }
  }, [startPolling]);

  // ─── Sayfa yüklendiğinde aktif job var mı kontrol et ───
  useEffect(() => {
    fetchAutoOptimizeStatus();
    const statusInterval = setInterval(fetchAutoOptimizeStatus, 15000);

    return () => {
      clearInterval(statusInterval);
      stopPolling();
    };
  }, [fetchAutoOptimizeStatus, stopPolling]);

  const updateAutopilotSettings = useCallback(
    async (payload: Partial<SEOAutopilotState>) => {
      setAutopilotUpdating(true);
      try {
        const response = await fetch("/api/admin/seo/auto-optimize", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Ayar güncellenemedi");
        }

        if (data.autopilot) {
          setAutopilot((prev) => ({
            ...(prev || {
              enabled: true,
              intervalMinutes: 30,
              maxScore: 80,
              language: "tr",
              batchSize: 100,
              delayMs: 3000,
              nextRunAt: null,
              lastRunAt: null,
              lastResult: null,
            }),
            ...data.autopilot,
          }));
        }
      } catch (error) {
        toast({
          title: "Otonom ayar güncellenemedi",
          description:
            error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
          variant: "destructive",
        });
      } finally {
        setAutopilotUpdating(false);
      }
    },
    [toast],
  );

  // ─── Bulk Auto-Optimize ───
  const startBulkOptimize = useCallback(async () => {
    if (optimizationMode === "manual") {
      if (selectedArticleIds.length === 0) {
        toast({
          title: "Seçim gerekli",
          description: "Manuel modda en az bir makale seçmelisiniz.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await fetch("/api/admin/seo/bulk-optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleIds: selectedArticleIds }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Manuel optimizasyon başlatılamadı");
        }

        toast({
          title: "Kuyruğa alındı",
          description: `${selectedArticleIds.length} makale manuel optimizasyon kuyruğuna eklendi.`,
        });
      } catch (error) {
        toast({
          title: "Hata",
          description:
            error instanceof Error ? error.message : "Manuel optimizasyon başarısız",
          variant: "destructive",
        });
      }
      return;
    }

    if (optimizationMode === "single") {
      const targetId = selectedArticle?.id || selectedArticleIds[0];
      if (!targetId) {
        toast({
          title: "Seçim gerekli",
          description: "Tekli mod için bir makale seçmelisiniz.",
          variant: "destructive",
        });
        return;
      }

      setBulkOptimizing(true);
      try {
        const response = await fetch(`/api/admin/articles/${targetId}/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Tekli optimizasyon başarısız");
        }

        setBulkResult({
          processed: 1,
          succeeded: 1,
          failed: 0,
          skipped: 0,
          avgImprovement: Number(data.scoreDelta || 0),
          message: data.message,
        });

        toast({
          title: "Tekli analiz tamamlandı",
          description: `Skor değişimi: ${data.beforeScore} → ${data.afterScore}`,
        });
        fetchArticles();
      } catch (error) {
        setBulkResult({
          processed: 1,
          succeeded: 0,
          failed: 1,
          skipped: 0,
          avgImprovement: 0,
          message:
            error instanceof Error ? error.message : "Tekli optimizasyon başarısız",
        });
      } finally {
        setBulkOptimizing(false);
      }
      return;
    }

    setBulkOptimizing(true);
    setBulkProgress([]);
    setBulkResult(null);
    setBulkTotal(0);
    setBulkCurrent(0);
    setProcessingTitle(null);

    try {
      const response = await fetch("/api/admin/seo/auto-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxScore: optimizeThreshold,
          limit: optimizeLimit,
          language: languageFilter,
        }),
      });

      const data = await response.json();

      if (response.status === 409 && data.jobId) {
        // Zaten çalışan job var — polling başlat
        startPolling(data.jobId);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "İstek başarısız");
      }

      // Job başarıyla oluşturuldu — polling başlat
      startPolling(data.jobId);
    } catch (err) {
      console.error("Bulk optimize error:", err);
      setBulkOptimizing(false);
      setBulkResult({
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        avgImprovement: 0,
        message: err instanceof Error ? err.message : "Bağlantı hatası",
      });
    }
  }, [
    fetchArticles,
    languageFilter,
    optimizationMode,
    optimizeLimit,
    optimizeThreshold,
    selectedArticle?.id,
    selectedArticleIds,
    startPolling,
    toast,
  ]);

  const actionLabel =
    optimizationMode === "autonomous"
      ? "Otonom Çalıştır"
      : optimizationMode === "manual"
        ? `Manuel Kuyruğa Ekle (${selectedArticleIds.length})`
        : "Tekli Optimize Et";

  const actionDisabled =
    bulkOptimizing ||
    loading ||
    (optimizationMode === "autonomous" && stats.needsWork === 0) ||
    (optimizationMode === "manual" && selectedArticleIds.length === 0) ||
    (optimizationMode === "single" &&
      selectedArticleIds.length === 0 &&
      !selectedArticle);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SEO Dashboard</h1>
            <p className="text-muted-foreground">
              Makale SEO performansını izleyin ve optimize edin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={scanAndOptimize}
              disabled={bulkOptimizing || loading || scanning}
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {scanning
                ? "Taranıyor..."
                : bulkOptimizing
                  ? `${bulkCurrent}/${bulkTotal} İşleniyor...`
                  : "Tara & Optimize Et"}
            </Button>
            <Button
              onClick={scanUnoptimized}
              disabled={bulkOptimizing || scanning}
              variant="outline"
              size="sm"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              Sadece Tara
            </Button>
            <Button
              onClick={startBulkOptimize}
              disabled={actionDisabled}
              variant="outline"
            >
              {bulkOptimizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {bulkOptimizing
                ? `${bulkCurrent}/${bulkTotal} İşleniyor...`
                : actionLabel}
            </Button>
            <Button onClick={fetchArticles} disabled={loading || bulkOptimizing} variant="outline">
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Yenile
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ortalama SEO Skoru
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}/100</div>
              <p className="text-xs text-muted-foreground">
                Tüm makaleler ortalaması
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Optimize Edilmiş
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.optimized}</div>
              <p className="text-xs text-muted-foreground">
                80+ skor (Toplam: {stats.total})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                İyileştirme Gerekli
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.needsWork}</div>
              <p className="text-xs text-muted-foreground">60 altı skor</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Arama Görünürlüğü
              </CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0
                  ? Math.round((stats.optimized / stats.total) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Optimize edilmiş oran
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scan Sonuçları */}
        {scanResult && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-800">
                      Tarama Sonucu
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (Skor &lt; {scanResult.maxScore})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                      Toplam: {scanResult.total}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      TR: {scanResult.tr}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      EN: {scanResult.en}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(scanResult.timestamp)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Geçmiş Yayın SEO İyileştirme Ayarları
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Toplu optimizasyon ve plan üretimi için eşik ve kapsam değerlerini güncelleyin.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="space-y-2">
                <Label>Çalışma Modu</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={optimizationMode === "autonomous" ? "default" : "outline"}
                    onClick={() => setOptimizationMode("autonomous")}
                  >
                    Otonom
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={optimizationMode === "manual" ? "default" : "outline"}
                    onClick={() => setOptimizationMode("manual")}
                  >
                    Manuel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={optimizationMode === "single" ? "default" : "outline"}
                    onClick={() => setOptimizationMode("single")}
                  >
                    Tekli Seçim
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dil Kapsamı</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={languageFilter === "tr" ? "default" : "outline"}
                    onClick={() => setLanguageFilter("tr")}
                  >
                    TR
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={languageFilter === "en" ? "default" : "outline"}
                    onClick={() => setLanguageFilter("en")}
                  >
                    EN
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={languageFilter === "all" ? "default" : "outline"}
                    onClick={() => setLanguageFilter("all")}
                  >
                    TR + EN
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Hedef Skor Eşiği</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={40}
                  max={95}
                  value={optimizeThreshold}
                  onChange={(e) => setOptimizeThreshold(Number(e.target.value) || 80)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Toplu İşlem Limiti</Label>
                <Input
                  id="limit"
                  type="number"
                  min={10}
                  max={200}
                  value={optimizeLimit}
                  onChange={(e) => setOptimizeLimit(Number(e.target.value) || 100)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageDays">Minimum Yaş (Gün)</Label>
                <Input
                  id="ageDays"
                  type="number"
                  min={1}
                  max={3650}
                  value={planAgeDays}
                  onChange={(e) => setPlanAgeDays(Number(e.target.value) || 30)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeks">Plan Süresi (Hafta)</Label>
                <Input
                  id="weeks"
                  type="number"
                  min={2}
                  max={12}
                  value={planWeeks}
                  onChange={(e) => setPlanWeeks(Number(e.target.value) || 8)}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fetchContentPlan}
                disabled={planLoading}
              >
                {planLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4 mr-2" />
                )}
                Planı Güncelle
              </Button>
              {contentPlan && (
                <p className="text-xs text-muted-foreground">
                  Son üretim: {formatDate(contentPlan.generatedAt)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Aktif mod: {optimizationMode.toUpperCase()} • Dil: {languageFilter.toUpperCase()}
              </p>
            </div>

            <div className="mt-4 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">SEO Otonom Devriye</p>
                  <p className="text-xs text-muted-foreground">
                    Her turda 50 habere kadar işler, LLM çağrılarını sıra + bekleme ile korur.
                  </p>
                </div>
                <Badge variant={autopilot?.enabled ? "default" : "outline"}>
                  {autopilot?.enabled ? "Aktif" : "Pasif"}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-4 mt-3">
                <div className="space-y-1">
                  <Label htmlFor="autopilot-interval" className="text-xs">
                    Devriye (dk)
                  </Label>
                  <Input
                    id="autopilot-interval"
                    type="number"
                    min={5}
                    max={240}
                    value={autopilot?.intervalMinutes ?? 30}
                    onChange={(e) =>
                      setAutopilot((prev) =>
                        prev
                          ? {
                            ...prev,
                            intervalMinutes: Number(e.target.value) || 30,
                          }
                          : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="autopilot-score" className="text-xs">
                    Maks SEO Skoru
                  </Label>
                  <Input
                    id="autopilot-score"
                    type="number"
                    min={40}
                    max={95}
                    value={autopilot?.maxScore ?? 80}
                    onChange={(e) =>
                      setAutopilot((prev) =>
                        prev
                          ? {
                            ...prev,
                            maxScore: Number(e.target.value) || 80,
                          }
                          : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="autopilot-delay" className="text-xs">
                    LLM Bekleme (ms)
                  </Label>
                  <Input
                    id="autopilot-delay"
                    type="number"
                    min={1000}
                    max={15000}
                    value={autopilot?.delayMs ?? 2500}
                    onChange={(e) =>
                      setAutopilot((prev) =>
                        prev
                          ? {
                            ...prev,
                            delayMs: Number(e.target.value) || 2500,
                          }
                          : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Batch</Label>
                  <div className="h-10 px-3 border rounded-md flex items-center text-sm">
                    {autopilot?.batchSize ?? 50}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={autopilot?.enabled ? "outline" : "default"}
                  disabled={autopilotUpdating}
                  onClick={() =>
                    updateAutopilotSettings({ enabled: !(autopilot?.enabled ?? true) })
                  }
                >
                  {autopilot?.enabled ? "Devriyeyi Durdur" : "Devriyeyi Başlat"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={autopilotUpdating || !autopilot}
                  onClick={() =>
                    autopilot &&
                    updateAutopilotSettings({
                      intervalMinutes: autopilot.intervalMinutes,
                      maxScore: autopilot.maxScore,
                      delayMs: autopilot.delayMs,
                    })
                  }
                >
                  Ayarları Kaydet
                </Button>

                <p className="text-xs text-muted-foreground">
                  Son devriye: {formatTimestamp(autopilot?.lastRunAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sonraki devriye: {formatTimestamp(autopilot?.nextRunAt)}
                </p>
              </div>

              {autopilot?.lastResult && (
                <p className="text-xs text-muted-foreground mt-2">
                  Son sonuç: {autopilot.lastResult}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Optimize Progress */}
        {(bulkOptimizing || bulkResult) && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Toplu Optimizasyon
                </CardTitle>
                {bulkResult && !bulkOptimizing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBulkResult(null);
                      setBulkProgress([]);
                    }}
                  >
                    Kapat
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              {bulkOptimizing && bulkTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {bulkCurrent} / {bulkTotal} makale işlendi
                    </span>
                    <span>
                      {Math.round((bulkCurrent / bulkTotal) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(bulkCurrent / bulkTotal) * 100}
                    className="h-2"
                  />
                  {processingTitle && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="truncate">İşleniyor: {processingTitle}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {bulkResult && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-lg font-bold text-green-700">
                      {bulkResult.succeeded}
                    </div>
                    <div className="text-xs text-green-600">Başarılı</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-50 border border-red-200">
                    <div className="text-lg font-bold text-red-700">
                      {bulkResult.failed}
                    </div>
                    <div className="text-xs text-red-600">Başarısız</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="text-lg font-bold text-gray-700">
                      {bulkResult.skipped}
                    </div>
                    <div className="text-xs text-gray-600">Atlandı</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-lg font-bold text-blue-700">
                      +{bulkResult.avgImprovement}
                    </div>
                    <div className="text-xs text-blue-600">Ort. Artış</div>
                  </div>
                </div>
              )}

              {/* Log */}
              {bulkProgress.length > 0 && (
                <div
                  ref={bulkLogRef}
                  className="max-h-[250px] overflow-y-auto space-y-1 text-sm border rounded-lg p-2 bg-muted/30"
                >
                  {bulkProgress.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50"
                    >
                      {item.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : item.status === "skipped" ? (
                        <SkipForward className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 min-w-0">
                        {item.title}
                      </span>
                      {item.status === "success" && (
                        <span className="text-green-600 font-medium flex-shrink-0">
                          {item.message}
                        </span>
                      )}
                      {item.status === "skipped" && (
                        <span className="text-gray-400 flex-shrink-0 text-xs">
                          atlandı
                        </span>
                      )}
                      {(item.status === "failed" ||
                        item.status === "error") && (
                          <span className="text-red-500 flex-shrink-0 text-xs truncate max-w-[200px]">
                            {item.message}
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Geçmiş İçerik SEO Yol Haritası
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Yayınlanmış düşük skorlu haberler için önceliklendirilmiş içerik planı, konu kümesi ve haftalık takvim.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!contentPlan ? (
              <div className="text-sm text-muted-foreground">Plan verisi yüklenemedi.</div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Aday Makale</div>
                    <div className="text-xl font-bold">{contentPlan.summary.candidateCount}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Plana Giren</div>
                    <div className="text-xl font-bold">{contentPlan.summary.plannedCount}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Ort. Skor Artışı</div>
                    <div className="text-xl font-bold">+{contentPlan.summary.averageLift}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Hedef Ortalama</div>
                    <div className="text-xl font-bold">{contentPlan.summary.averageTargetScore}</div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Öncelikli Makaleler</h3>
                    <div className="max-h-[260px] overflow-y-auto space-y-2">
                      {contentPlan.priorityArticles.slice(0, 12).map((item) => (
                        <div key={item.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <Badge variant="outline">{item.intent}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-2">
                            <span>Skor: {item.seoScore} → {item.targetScore}</span>
                            <span>+{item.projectedLift}</span>
                            <span>Öncelik: {item.priorityScore}</span>
                            <span>Dil: {item.language?.toUpperCase()}</span>
                            <span>Yayın: {formatDate(item.publishedAt)}</span>
                          </div>
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">Primary:</span> {item.primaryKeyword}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Haftalık İçerik Takvimi</h3>
                    <div className="max-h-[260px] overflow-y-auto space-y-2">
                      {contentPlan.calendar.map((week) => (
                        <div key={week.week} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Hafta {week.week}</p>
                            <Badge variant="secondary">{week.articleIds.length} içerik</Badge>
                          </div>
                          <p className="text-xs mt-1 text-muted-foreground">{week.focus}</p>
                          <p className="text-xs mt-1">Ana keyword: {week.targetKeyword}</p>
                          <p className="text-xs text-muted-foreground">Kelime hedefi: {week.wordCountTarget}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Topic Cluster Planı</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {contentPlan.topicClusters.slice(0, 6).map((cluster) => (
                      <div key={cluster.category} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">{cluster.category}</p>
                        <p className="text-xs text-muted-foreground mt-1">{cluster.pillarTitle}</p>
                        <p className="text-xs mt-2">
                          <span className="text-muted-foreground">Keyword hedefleri:</span>{" "}
                          {cluster.targetKeywords.slice(0, 4).join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Article List */}
          <Card>
            <CardHeader>
              <CardTitle>Makale SEO Skorları</CardTitle>
              <p className="text-sm text-muted-foreground">
                Düşük skorlu makaleleri optimize edin
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Yükleniyor...
                  </p>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Henüz makale yok
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {articles
                    .sort((a, b) => (a.seoScore || 0) - (b.seoScore || 0))
                    .slice(0, 20)
                    .map((article) => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedArticle?.id === article.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {(optimizationMode === "manual" ||
                                optimizationMode === "single") && (
                                  <Checkbox
                                    checked={selectedArticleIds.includes(article.id)}
                                    onCheckedChange={(checked) => {
                                      if (optimizationMode === "single") {
                                        setSelectedArticleIds(checked ? [article.id] : []);
                                        return;
                                      }
                                      setSelectedArticleIds((prev) => {
                                        if (checked === true) {
                                          return prev.includes(article.id)
                                            ? prev
                                            : [...prev, article.id];
                                        }
                                        return prev.filter((id) => id !== article.id);
                                      });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}
                              <h3 className="font-medium text-sm truncate">
                                {article.title}
                              </h3>
                              {article.language && (
                                <Badge variant="secondary" className="text-xs">
                                  {article.language.toUpperCase()}
                                </Badge>
                              )}
                              {article.category && (
                                <Badge variant="outline" className="text-xs">
                                  {article.category.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>/{article.slug}</span>
                              {article._count.seoRecommendations > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Lightbulb className="h-3 w-3 mr-1" />
                                  {article._count.seoRecommendations}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div
                            className={`text-center px-3 py-1 rounded-lg border text-sm font-bold ${getScoreColor(article.seoScore || 0)}`}
                          >
                            {article.seoScore || 0}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO Recommendations Panel */}
          <div className="space-y-4">
            {selectedArticle ? (
              <>
                <Card className="bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {selectedArticle.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>/{selectedArticle.slug}</span>
                          {selectedArticle.category && (
                            <Badge variant="outline">
                              {selectedArticle.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Link href={`/admin/articles/${selectedArticle.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Düzenle
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <SEOPanel
                  articleId={selectedArticle.id}
                  initialScore={selectedArticle.seoScore || 0}
                  initialRecommendations={
                    selectedArticle.seoRecommendations || []
                  }
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      SEO önerilerini görmek için bir makale seçin
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
