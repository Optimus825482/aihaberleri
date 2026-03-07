/**
 * Admin Trends Page - Haber Trendleri Yönetim Paneli
 *
 * FEATURES:
 * - Real-time pipeline monitoring
 * - Trend logs viewer
 * - Manual trigger for trend fetching
 * - Next scheduled run countdown
 * - Active trends table
 * - Pipeline health indicators
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  RefreshCw,
  Play,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Hash,
  Globe,
  Calendar,
  Timer,
  BarChart3,
  Flame,
  BookOpen,
  Bug,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { usePageVisibility } from "@/hooks/usePageVisibility";

// Types
interface PipelineStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  currentPhase: string;
  progress: number;
}

interface TrendLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  source: string;
}

interface SocialTrend {
  id: string;
  topic: string;
  hashtag: string | null;
  platform: string;
  score: number;
  volume: number;
  sentiment: string;
  keywords: string[];
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

interface TrendStats {
  totalTrends: number;
  activeTrends: number;
  mastodonTrends: number;
  blueskyTrends: number;
  hackerNewsTrends: number;
  arxivTrends: number;
  lobstersTrends: number;
  articlesEnriched: number;
  avgTrendScore: number;
}

// Mock data for demo - will be replaced with real API calls
const mockStats: TrendStats = {
  totalTrends: 0,
  activeTrends: 0,
  mastodonTrends: 0,
  blueskyTrends: 0,
  hackerNewsTrends: 0,
  arxivTrends: 0,
  lobstersTrends: 0,
  articlesEnriched: 0,
  avgTrendScore: 0,
};

export default function TrendsPage() {
  const isPageVisible = usePageVisibility();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [stats, setStats] = useState<TrendStats>(mockStats);
  const [trends, setTrends] = useState<SocialTrend[]>([]);
  const [logs, setLogs] = useState<TrendLog[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus>({
    isRunning: false,
    lastRun: null,
    nextRun: null,
    currentPhase: "idle",
    progress: 0,
  });
  const [countdown, setCountdown] = useState<string>("--:--:--");

  // Popular topics state
  const [popularTopics, setPopularTopics] = useState<any>(null);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Fetch trends data
  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/trends");
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends || []);
        setStats(data.stats || mockStats);
        setPipeline(data.pipeline || pipeline);
      }
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    }
  }, []);

  // Fetch popular topics (LLM clustering results)
  const fetchPopularTopics = useCallback(async () => {
    setIsLoadingTopics(true);
    try {
      const res = await fetch("/api/admin/trends/popular-topics");
      if (res.ok) {
        const data = await res.json();
        setPopularTopics(data);
      }
    } catch (error) {
      console.error("Failed to fetch popular topics:", error);
    } finally {
      setIsLoadingTopics(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/trends/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  }, []);

  // Manual trigger trend fetch
  const triggerTrendFetch = async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/admin/trends/trigger", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        // Add success log
        setLogs((prev) => [
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            level: "success",
            message: `Manuel trend çekme başlatıldı: ${data.message || "İşlem başlatıldı"}`,
            source: "admin",
          },
          ...prev,
        ]);

        // Refresh data after trigger
        setTimeout(() => {
          fetchTrends();
          fetchLogs();
        }, 2000);
      } else {
        const error = await res.json();
        setLogs((prev) => [
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            level: "error",
            message: `Trend çekme başarısız: ${error.error || "Bilinmeyen hata"}`,
            source: "admin",
          },
          ...prev,
        ]);
      }
    } catch (error) {
      setLogs((prev) => [
        {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: "error",
          message: `Bağlantı hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
          source: "admin",
        },
        ...prev,
      ]);
    } finally {
      setIsFetching(false);
    }
  };

  // Calculate countdown
  useEffect(() => {
    if (!pipeline.nextRun) {
      setCountdown("--:--:--");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const next = new Date(pipeline.nextRun!).getTime();
      const diff = next - now;

      if (diff <= 0) {
        setCountdown("00:00:00");
        fetchTrends();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [pipeline.nextRun, fetchTrends]);

  // Initial load
  useEffect(() => {
    if (!isPageVisible) {
      return undefined;
    }

    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchTrends(), fetchLogs(), fetchPopularTopics()]);
      setIsLoading(false);
    };
    load();

    // Auto-refresh only while the tab is visible.
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchTrends();
        fetchLogs();
        fetchPopularTopics();
      }
    }, 45000);

    return () => clearInterval(refreshInterval);
  }, [fetchTrends, fetchLogs, fetchPopularTopics, isPageVisible]);

  // Log level colors
  const getLogLevelColor = (level: TrendLog["level"]) => {
    switch (level) {
      case "success":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      default:
        return "text-blue-500";
    }
  };

  const getLogLevelIcon = (level: TrendLog["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "warning":
        return <AlertCircle className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Platform badge
  const getPlatformBadge = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "mastodon":
        return (
          <Badge
            variant="outline"
            className="bg-violet-500/10 text-violet-500 border-violet-500/30"
          >
            <Globe className="h-3 w-3 mr-1" />
            Mastodon
          </Badge>
        );
      case "bluesky":
        return (
          <Badge
            variant="outline"
            className="bg-sky-500/10 text-sky-500 border-sky-500/30"
          >
            <Globe className="h-3 w-3 mr-1" />
            Bluesky
          </Badge>
        );
      case "hackernews":
        return (
          <Badge
            variant="outline"
            className="bg-orange-500/10 text-orange-500 border-orange-500/30"
          >
            <Hash className="h-3 w-3 mr-1" />
            HackerNews
          </Badge>
        );
      case "arxiv":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-500 border-red-500/30"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            ArXiv
          </Badge>
        );
      case "lobsters":
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-500 border-rose-500/30"
          >
            <Bug className="h-3 w-3 mr-1" />
            Lobsters
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Globe className="h-3 w-3 mr-1" />
            {platform}
          </Badge>
        );
    }
  };

  // Sentiment badge
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return (
          <Badge className="bg-green-500/20 text-green-500">Pozitif</Badge>
        );
      case "negative":
        return <Badge className="bg-red-500/20 text-red-500">Negatif</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-500">Nötr</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">
              Trend verileri yükleniyor...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/20">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              Haber Trendleri
            </h1>
            <p className="text-muted-foreground mt-1">
              Mastodon, Bluesky, HackerNews, ArXiv ve Lobsters trendlerini takip edin
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                fetchTrends();
                fetchLogs();
              }}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              Yenile
            </Button>
            <Button
              onClick={triggerTrendFetch}
              disabled={isFetching || pipeline.isRunning}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Çekiliyor...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Manuel Başlat
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Genel Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalTrends}</p>
                  <p className="text-xs text-muted-foreground">Toplam Trend</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Flame className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeTrends}</p>
                  <p className="text-xs text-muted-foreground">Aktif Trend</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.articlesEnriched}</p>
                  <p className="text-xs text-muted-foreground">Zenginleştirildi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgTrendScore}</p>
                  <p className="text-xs text-muted-foreground">Ort. Skor</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.mastodonTrends}</p>
                  <p className="text-xs text-muted-foreground">Mastodon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.blueskyTrends}</p>
                  <p className="text-xs text-muted-foreground">Bluesky</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Hash className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.hackerNewsTrends}</p>
                  <p className="text-xs text-muted-foreground">HackerNews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.arxivTrends}</p>
                  <p className="text-xs text-muted-foreground">ArXiv</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <Bug className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.lobstersTrends}</p>
                  <p className="text-xs text-muted-foreground">Lobsters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Status Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${pipeline.isRunning ? "bg-green-500/20 animate-pulse" : "bg-gray-500/20"}`}
                >
                  <Activity
                    className={`h-5 w-5 ${pipeline.isRunning ? "text-green-500" : "text-gray-500"}`}
                  />
                </div>
                <div>
                  <CardTitle className="text-lg">Pipeline Durumu</CardTitle>
                  <CardDescription>
                    {pipeline.isRunning
                      ? "Trend Enricher aktif çalışıyor"
                      : "Pipeline bekleme modunda"}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Last Run */}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Son Çalışma</p>
                  <p className="font-semibold text-sm">
                    {pipeline.lastRun
                      ? new Date(pipeline.lastRun).toLocaleString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })
                      : "Henüz yok"}
                  </p>
                </div>

                {/* Countdown */}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Sonraki Çalışma
                  </p>
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="font-mono text-lg font-bold text-primary">
                      {countdown}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          {pipeline.isRunning && (
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mevcut Aşama:</span>
                  <Badge variant="outline" className="bg-primary/10">
                    {pipeline.currentPhase}
                  </Badge>
                </div>
                <Progress value={pipeline.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {pipeline.progress}% tamamlandı
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="popular" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="popular">
              <TrendingUp className="h-4 w-4 mr-2" />
              Popüler Konular
            </TabsTrigger>
            <TabsTrigger value="trends">
              <Flame className="h-4 w-4 mr-2" />
              Aktif Trendler
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="h-4 w-4 mr-2" />
              Pipeline Logları
            </TabsTrigger>
          </TabsList>

          {/* Popular Topics Tab */}
          <TabsContent value="popular" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      Popüler Konu Cluster&apos;ları
                    </CardTitle>
                    <CardDescription>
                      LLM ile platformlar arası konu gruplama — {popularTopics?.stats?.clusterCount || 0} cluster, {popularTopics?.stats?.trendCount || 0} trend
                      {popularTopics?.stats?.lastUpdated && (
                        <span className="ml-2 text-xs">
                          (Son güncelleme: {new Date(popularTopics.stats.lastUpdated).toLocaleString("tr-TR")} — {popularTopics.stats.durationMs}ms)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPopularTopics}
                    disabled={isLoadingTopics}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTopics ? "animate-spin" : ""}`} />
                    Yenile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!popularTopics || popularTopics.clusters?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Henüz cluster yok</p>
                    <p className="text-sm mt-1">
                      {popularTopics?.message || "Trend fetch çalıştığında topic clustering otomatik oluşturulacak"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {popularTopics.clusters.map((cluster: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-colors ${idx === 0
                            ? "bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border-yellow-500/30"
                            : idx === 1
                              ? "bg-gradient-to-r from-gray-500/5 to-slate-500/5 border-gray-400/30"
                              : idx === 2
                                ? "bg-gradient-to-r from-amber-700/5 to-orange-700/5 border-amber-700/30"
                                : "bg-card hover:bg-muted/50 border-border"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-mono text-muted-foreground">
                                #{idx + 1}
                              </span>
                              <h3 className="font-bold text-lg">
                                {cluster.canonicalTopic}
                              </h3>
                              {cluster.platformCount > 1 && (
                                <Badge className="bg-emerald-500/20 text-emerald-500">
                                  <Globe className="h-3 w-3 mr-1" />
                                  {cluster.platformCount} platform
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {cluster.platforms.map((p: string) => getPlatformBadge(p))}
                            </div>

                            <div className="space-y-1.5">
                              {cluster.trends.map((t: any, ti: number) => (
                                <div key={ti} className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground text-xs w-20 shrink-0">
                                    {t.platform}
                                  </span>
                                  <span className="truncate flex-1">
                                    {t.url ? (
                                      <a
                                        href={t.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        {t.topic}
                                        <ArrowUpRight className="h-3 w-3 shrink-0" />
                                      </a>
                                    ) : (
                                      t.topic
                                    )}
                                  </span>
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {t.score}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <div className="text-3xl font-bold text-primary">
                              {cluster.avgScore}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Ort. Skor
                            </p>
                            <div className="text-sm text-muted-foreground">
                              Max: <span className="font-medium text-foreground">{cluster.maxScore}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Vol: <span className="font-medium text-foreground">{cluster.totalVolume?.toLocaleString("tr-TR")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Unclustered trends */}
                    {popularTopics.unclustered?.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          Tek Kalan Trend&apos;ler ({popularTopics.unclustered.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {popularTopics.unclustered.map((t: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg border bg-muted/30 text-sm flex items-center gap-2">
                              {getPlatformBadge(t.platform)}
                              <span className="truncate flex-1">{t.topic}</span>
                              <Badge variant="secondary" className="text-xs">{t.score}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Aktif Trendler
                </CardTitle>
                <CardDescription>
                  Şu anda aktif olan sosyal medya trendleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trends.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Henüz trend yok</p>
                    <p className="text-sm mt-1">
                      Manuel başlat butonuna tıklayarak trend çekmeyi
                      başlatabilirsiniz
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trends.map((trend) => (
                      <div
                        key={trend.id}
                        className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getPlatformBadge(trend.platform)}
                              {getSentimentBadge(trend.sentiment)}
                              {trend.isActive && (
                                <Badge className="bg-green-500/20 text-green-500">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Aktif
                                </Badge>
                              )}
                            </div>

                            <h3 className="font-bold text-lg truncate">
                              {trend.topic}
                            </h3>

                            {trend.hashtag && (
                              <p className="text-primary font-mono text-sm mt-1 flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {trend.hashtag}
                              </p>
                            )}

                            {trend.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {trend.keywords.slice(0, 5).map((kw, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {kw}
                                  </Badge>
                                ))}
                                {trend.keywords.length > 5 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    +{trend.keywords.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-2xl font-bold text-primary">
                              {trend.score}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Trend Skoru
                            </p>

                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">
                                Vol:{" "}
                              </span>
                              <span className="font-medium">
                                {trend.volume.toLocaleString("tr-TR")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(trend.createdAt).toLocaleString("tr-TR")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Bitiş:{" "}
                            {new Date(trend.expiresAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Pipeline Logları
                </CardTitle>
                <CardDescription>
                  Trend çekme ve enrichment işlemlerinin gerçek zamanlı logları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Henüz log yok</p>
                      <p className="text-sm mt-1">
                        Pipeline çalıştığında loglar burada görünecek
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-3 rounded-lg border bg-card/50 flex items-start gap-3 ${
                            log.level === "error"
                              ? "border-red-500/30 bg-red-500/5"
                              : log.level === "warning"
                                ? "border-yellow-500/30 bg-yellow-500/5"
                                : log.level === "success"
                                  ? "border-green-500/30 bg-green-500/5"
                                  : "border-blue-500/30 bg-blue-500/5"
                          }`}
                        >
                          <div
                            className={`mt-0.5 ${getLogLevelColor(log.level)}`}
                          >
                            {getLogLevelIcon(log.level)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{log.message}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>
                                {new Date(log.timestamp).toLocaleTimeString(
                                  "tr-TR",
                                )}
                              </span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs h-5">
                                {log.source}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
