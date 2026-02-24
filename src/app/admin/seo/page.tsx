"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import Link from "next/link";
import { SEOPanel } from "@/components/admin/SEOPanel";

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

export default function SEOPage() {
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
  const bulkLogRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const lastIndexRef = useRef(0);
  const hasRecalculated = useRef(false);

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
      const response = await fetch("/api/admin/articles?include=seo");
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
            const refreshed = await fetch("/api/admin/articles?include=seo");
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
    } finally {
      setLoading(false);
    }
  }, [selectedArticle, updateStats]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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

  // ─── Sayfa yüklendiğinde aktif job var mı kontrol et ───
  useEffect(() => {
    const checkActiveJob = async () => {
      try {
        const res = await fetch("/api/admin/seo/auto-optimize");
        if (!res.ok) return;
        const data = await res.json();

        if (data.active && data.jobId) {
          // Devam eden job var — polling'i resume et
          setBulkOptimizing(true);
          setBulkTotal(data.total);
          setBulkCurrent(data.current);

          // Tüm mevcut progress'leri yükle
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
    };

    checkActiveJob();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // ─── Bulk Auto-Optimize ───
  const startBulkOptimize = useCallback(async () => {
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
        body: JSON.stringify({ maxScore: 80, limit: 50 }),
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
  }, [startPolling]);

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
              onClick={startBulkOptimize}
              disabled={bulkOptimizing || loading || stats.needsWork === 0}
              variant="default"
            >
              {bulkOptimizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {bulkOptimizing
                ? `${bulkCurrent}/${bulkTotal} İşleniyor...`
                : "Toplu Optimize"}
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
                              <h3 className="font-medium text-sm truncate">
                                {article.title}
                              </h3>
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
