"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { SEOPanel } from "@/components/admin/SEOPanel";
import { useToast } from "@/hooks/use-toast";
import { usePageVisibility } from "@/hooks/usePageVisibility";

// == Constants ==
const TARGET_SCORE = 99;

// == Types ==
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

type LanguageFilter = "tr" | "en" | "all";

// == Helpers ==
function getScoreColor(score: number) {
  if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  if (score >= 50) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function getProgressColor(pct: number) {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-500";
  if (pct >= 30) return "bg-orange-500";
  return "bg-red-500";
}

export default function SEOPage() {
  const { toast } = useToast();
  const isPageVisible = usePageVisibility();

  // == Article data ==
  const [articles, setArticles] = useState<ArticleSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSEO | null>(null);
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("tr");
  const [batchLimit, setBatchLimit] = useState(100);
  const hasRecalculated = useRef(false);

  // == Stats ==
  const [stats, setStats] = useState({
    total: 0,
    atTarget: 0,
    belowTarget: 0,
    avgScore: 0,
  });

  // == Scan state ==
  const [scanResult, setScanResult] = useState<{
    tr: number;
    en: number;
    total: number;
  } | null>(null);
  const [scanning, setScanning] = useState(false);

  // == Bulk optimize state ==
  const [bulkOptimizing, setBulkOptimizing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgressItem[]>([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkCurrent, setBulkCurrent] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [processingTitle, setProcessingTitle] = useState<string | null>(null);
  const bulkLogRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const lastIndexRef = useRef(0);

  // == Computed ==
  const completionPct = stats.total > 0 ? Math.round((stats.atTarget / stats.total) * 100) : 0;

  // == Data fetching ==
  const updateStats = useCallback((articlesData: ArticleSEO[]) => {
    const total = articlesData.length;
    const avgScore =
      total > 0
        ? Math.round(articlesData.reduce((sum, a) => sum + (a.seoScore || 0), 0) / total)
        : 0;
    const atTarget = articlesData.filter((a) => (a.seoScore || 0) >= TARGET_SCORE).length;
    const belowTarget = total - atTarget;
    setStats({ total, atTarget, belowTarget, avgScore });
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        include: "seo",
        status: "PUBLISHED",
        limit: "500",
      });
      if (languageFilter !== "all") query.set("language", languageFilter);

      const response = await fetch(`/api/admin/articles?${query.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let articlesData = data.articles || [];

        // Ilk yuklemede null/0 skorlulari recalculate et
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
            const refreshed = await fetch(`/api/admin/articles?${query.toString()}`);
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
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      toast({ title: "Hata", description: "Makaleler yuklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [languageFilter, toast, updateStats]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // == Polling ==
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async () => {
    if (!isPageVisible) {
      return;
    }

    const jobId = jobIdRef.current;
    if (!jobId) return;

    try {
      const since = lastIndexRef.current;
      const res = await fetch(`/api/admin/seo/auto-optimize?jobId=${jobId}&since=${since}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.progress?.length > 0) {
        setBulkProgress((prev) => [...prev, ...data.progress]);
        const maxIndex = Math.max(...data.progress.map((p: BulkProgressItem) => p.index));
        lastIndexRef.current = maxIndex;
        setTimeout(() => {
          bulkLogRef.current?.scrollTo({ top: bulkLogRef.current.scrollHeight, behavior: "smooth" });
        }, 50);
      }

      setBulkTotal(data.total);
      setBulkCurrent(data.current);
      setProcessingTitle(data.processingTitle || null);

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
  }, [fetchArticles, isPageVisible, stopPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      jobIdRef.current = jobId;
      lastIndexRef.current = 0;
      if (isPageVisible) {
        pollingRef.current = setInterval(pollJobStatus, 5000);
      }
    },
    [isPageVisible, pollJobStatus, stopPolling],
  );

  // == Sayfa yuklendiginde aktif job kontrolu ==
  const fetchAutoOptimizeStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo/auto-optimize");
      if (!res.ok) return;
      const data = await res.json();

      if (data.active && data.jobId && !jobIdRef.current) {
        setBulkOptimizing(true);
        setBulkTotal(data.total || 0);
        setBulkCurrent(data.current || 0);

        const fullRes = await fetch(`/api/admin/seo/auto-optimize?jobId=${data.jobId}&since=0`);
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

  useEffect(() => {
    fetchAutoOptimizeStatus();
    const statusInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAutoOptimizeStatus();
      }
    }, 30000);
    return () => {
      clearInterval(statusInterval);
      stopPolling();
    };
  }, [fetchAutoOptimizeStatus, stopPolling]);

  useEffect(() => {
    if (!jobIdRef.current) {
      return;
    }

    if (!isPageVisible) {
      stopPolling();
      return;
    }

    startPolling(jobIdRef.current);
    pollJobStatus();
  }, [isPageVisible, pollJobStatus, startPolling, stopPolling]);

  // == Tara & Baslat ==
  const scanAndOptimize = useCallback(async () => {
    setScanning(true);
    setScanResult(null);

    try {
      // 1) Tara
      const scanRes = await fetch(`/api/admin/seo/scan-unoptimized?maxScore=${TARGET_SCORE}`);
      if (!scanRes.ok) throw new Error("Tarama basarisiz");
      const scanData = await scanRes.json();

      setScanResult({ tr: scanData.counts.tr, en: scanData.counts.en, total: scanData.counts.total });

      const targetCount =
        languageFilter === "all"
          ? scanData.counts.total
          : scanData.counts[languageFilter] || 0;

      if (targetCount === 0) {
        toast({
          title: "Tamamlanmis!",
          description: `${languageFilter.toUpperCase()} dilinde tum makaleler ${TARGET_SCORE}+ puanda.`,
        });
        setScanning(false);
        return;
      }

      toast({
        title: `${targetCount} makale bulundu`,
        description: `${Math.min(targetCount, batchLimit)} makale optimize edilecek...`,
      });
    } catch (error) {
      toast({
        title: "Tarama hatasi",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive",
      });
      setScanning(false);
      return;
    }

    setScanning(false);

    // 2) Batch optimize baslat
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
          maxScore: TARGET_SCORE,
          limit: batchLimit,
          language: languageFilter,
        }),
      });

      const result = await response.json();

      if (response.status === 409 && result.jobId) {
        startPolling(result.jobId);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Istek basarisiz");

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
        message: err instanceof Error ? err.message : "Baglanti hatasi",
      });
    }
  }, [batchLimit, languageFilter, startPolling, toast]);

  // == Sadece Tara ==
  const scanOnly = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(`/api/admin/seo/scan-unoptimized?maxScore=${TARGET_SCORE}`);
      if (!res.ok) throw new Error("Tarama basarisiz");
      const data = await res.json();
      setScanResult({ tr: data.counts.tr, en: data.counts.en, total: data.counts.total });
      toast({
        title: "Tarama tamamlandi",
        description: `${data.counts.total} makale ${TARGET_SCORE} puanin altinda (TR: ${data.counts.tr}, EN: ${data.counts.en})`,
      });
    } catch (error) {
      toast({
        title: "Tarama hatasi",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  }, [toast]);

  // == Render ==
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Target className="h-8 w-8 text-emerald-600" />
              SEO Optimizer
            </h1>
            <p className="text-muted-foreground mt-1">
              Tum makaleler &rarr; <span className="font-semibold text-foreground">{TARGET_SCORE} puan</span> hedefi
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Filter */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              {(["tr", "en", "all"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguageFilter(lang)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    languageFilter === lang
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {lang === "all" ? "Hepsi" : lang.toUpperCase()}
                </button>
              ))}
            </div>

            <Button
              onClick={scanAndOptimize}
              disabled={bulkOptimizing || loading || scanning}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : bulkOptimizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {scanning
                ? "Taraniyor..."
                : bulkOptimizing
                  ? `${bulkCurrent}/${bulkTotal}`
                  : "Tara & Baslat"}
            </Button>

            <Button onClick={scanOnly} disabled={bulkOptimizing || scanning} variant="outline" size="sm">
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Sadece Tara
            </Button>

            <Button onClick={fetchArticles} disabled={loading || bulkOptimizing} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="border-2 border-emerald-200/50 bg-gradient-to-r from-emerald-50/50 to-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="font-semibold text-lg">
                    {stats.atTarget} / {stats.total} makale hedefe ulasti
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats.belowTarget > 0
                      ? `${stats.belowTarget} makale ${TARGET_SCORE} puanin altinda`
                      : "Tum makaleler hedefte!"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-600">{completionPct}%</p>
                <p className="text-xs text-muted-foreground">tamamlanma</p>
              </div>
            </div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${getProgressColor(completionPct)}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Skor</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}</div>
              <p className="text-xs text-muted-foreground">Hedef: {TARGET_SCORE}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Makale</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {languageFilter === "all" ? "Tum diller" : languageFilter.toUpperCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{TARGET_SCORE}+ Puan</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.atTarget}</div>
              <p className="text-xs text-muted-foreground">Hedefe ulasan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Iyilestirme Gerekli</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.belowTarget}</div>
              <p className="text-xs text-muted-foreground">{TARGET_SCORE} alti skor</p>
            </CardContent>
          </Card>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Target className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">
                    {scanResult.total} makale {TARGET_SCORE} altinda
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">TR: {scanResult.tr}</Badge>
                    <Badge variant="outline">EN: {scanResult.en}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Batch Settings */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="batchLimit" className="text-sm whitespace-nowrap">
              Batch Limiti:
            </Label>
            <Input
              id="batchLimit"
              type="number"
              min={10}
              max={200}
              value={batchLimit}
              onChange={(e) => setBatchLimit(Number(e.target.value) || 100)}
              className="w-24"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Her calistirmada en fazla {batchLimit} makale islenir
          </p>
        </div>

        {/* Live Progress */}
        {(bulkOptimizing || bulkResult) && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {bulkOptimizing ? "Optimizasyon Calisiyor" : "Tamamlandi"}
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
                      {bulkCurrent} / {bulkTotal} makale islendi
                    </span>
                    <span>{Math.round((bulkCurrent / bulkTotal) * 100)}%</span>
                  </div>
                  <Progress value={(bulkCurrent / bulkTotal) * 100} className="h-3" />
                  {processingTitle && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="truncate">Isleniyor: {processingTitle}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {bulkResult && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{bulkResult.succeeded}</div>
                    <div className="text-xs text-green-600">Basarili</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{bulkResult.failed}</div>
                    <div className="text-xs text-red-600">Basarisiz</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">{bulkResult.skipped}</div>
                    <div className="text-xs text-gray-600">Atlandi</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">+{bulkResult.avgImprovement}</div>
                    <div className="text-xs text-blue-600">Ort. Artis</div>
                  </div>
                </div>
              )}

              {/* Log */}
              {bulkProgress.length > 0 && (
                <div
                  ref={bulkLogRef}
                  className="max-h-[300px] overflow-y-auto space-y-1 text-sm border rounded-lg p-2 bg-muted/30 font-mono"
                >
                  {bulkProgress.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50">
                      {item.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : item.status === "skipped" ? (
                        <SkipForward className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 min-w-0 text-xs">{item.title}</span>
                      {item.status === "success" && (
                        <span className="text-green-600 font-medium flex-shrink-0 text-xs">
                          {item.beforeScore}&rarr;{item.afterScore} (+{item.scoreDelta})
                        </span>
                      )}
                      {item.status === "skipped" && (
                        <span className="text-gray-400 flex-shrink-0 text-xs">atlandi</span>
                      )}
                      {(item.status === "failed" || item.status === "error") && (
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

        {/* Article List + SEO Panel */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Article List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Makale SEO Skorlari</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    En dusuk skordan yuksege sirali
                  </p>
                </div>
                <Badge variant="secondary">{articles.length} makale</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Yukleniyor...</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Henuz makale yok</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                  {[...articles]
                    .sort((a, b) => (a.seoScore || 0) - (b.seoScore || 0))
                    .map((article) => {
                      const score = article.seoScore || 0;
                      const isAtTarget = score >= TARGET_SCORE;
                      return (
                        <div
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedArticle?.id === article.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-medium text-sm truncate">{article.title}</h3>
                                {article.language && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5">
                                    {article.language.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {article.category && <span>{article.category.name}</span>}
                                {article._count.seoRecommendations > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Lightbulb className="h-3 w-3" />
                                    {article._count.seoRecommendations}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Mini progress bar */}
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isAtTarget ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(score, 100)}%` }}
                                />
                              </div>
                              <div
                                className={`text-center w-10 py-0.5 rounded text-xs font-bold border ${getScoreColor(score)}`}
                              >
                                {score}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO Detail Panel */}
          <div className="space-y-4">
            {selectedArticle ? (
              <>
                <Card className="bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">
                          {selectedArticle.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">/{selectedArticle.slug}</span>
                          {selectedArticle.category && (
                            <Badge variant="outline">{selectedArticle.category.name}</Badge>
                          )}
                          {selectedArticle.language && (
                            <Badge variant="secondary">
                              {selectedArticle.language.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Mevcut:</span>
                          <span
                            className={`font-bold ${
                              (selectedArticle.seoScore || 0) >= TARGET_SCORE
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            {selectedArticle.seoScore || 0}
                          </span>
                          <span className="text-sm text-muted-foreground">/ Hedef:</span>
                          <span className="font-bold text-emerald-600">{TARGET_SCORE}</span>
                        </div>
                      </div>
                      <Link href={`/admin/articles/${selectedArticle.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Duzenle
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <SEOPanel
                  articleId={selectedArticle.id}
                  initialScore={selectedArticle.seoScore || 0}
                  initialRecommendations={selectedArticle.seoRecommendations || []}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">SEO onerilerini gormek icin bir makale secin</p>
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
