"use client";

import { useEffect, useState, useRef } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  FileText,
  TrendingUp,
  Clock,
  Play,
  Calendar,
  Terminal,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  PieChart,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  metrics: {
    totalArticles: number;
    totalViews: number;
    todayArticles: number;
    publishedArticles: number;
    draftArticles: number;
  };
  categoryStats: Array<{
    id: string;
    name: string;
    slug: string;
    articleCount: number;
    lastArticleDate: string | null;
    totalViews: number;
  }>;
  recentArticles: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: string;
    publishedAt: string | null;
    views: number;
    category: {
      name: string;
      slug: string;
    };
  }>;
  charts: {
    last7Days: Array<{
      date: string;
      count: number;
      label: string;
    }>;
    categoryDistribution: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
  };
}

interface AgentStats {
  agent: {
    totalExecutions: number;
    successfulExecutions: number;
    totalArticles: number;
    successRate: number;
    lastExecution: string | null;
    lastStatus: string | null;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  history: Array<{
    id: string;
    executionTime: string;
    status: string;
    articlesCreated: number;
    articlesScraped: number;
    duration: number | null;
  }>;
  categoryStats: Array<{
    name: string;
    count: number;
  }>;
}

interface LogMessage {
  message: string;
  type: "info" | "success" | "error" | "progress";
  timestamp: string;
}

export default function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchAllStats();
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchAllStats = async () => {
    try {
      const [dashboardRes, agentRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/agent/stats"),
      ]);

      const dashboardData = await dashboardRes.json();
      const agentData = await agentRes.json();

      if (dashboardData.success) {
        setDashboardStats(dashboardData.data);
      }
      if (agentData.success) {
        setAgentStats(agentData.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const executeAgent = async () => {
    setExecuting(true);
    setLogs([]);

    try {
      // Create EventSource for streaming logs
      const eventSource = new EventSource("/api/agent/stream");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "complete") {
          // Agent completed
          setExecuting(false);
          fetchAllStats();
          eventSource.close();
        } else {
          // Regular log message
          setLogs((prev) => [...prev, data as LogMessage]);
        }
      };

      eventSource.onerror = () => {
        setExecuting(false);
        setLogs((prev) => [
          ...prev,
          {
            message: "❌ Bağlantı hatası",
            type: "error",
            timestamp: new Date().toISOString(),
          },
        ]);
        eventSource.close();
      };
    } catch (error) {
      setExecuting(false);
      setLogs((prev) => [
        ...prev,
        {
          message: `❌ Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
          type: "error",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const scheduleAgent = async () => {
    try {
      const response = await fetch("/api/agent/schedule", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert(
          `Agent planlandı! Sonraki çalıştırma ${data.data.delayHours.toFixed(2)} saat sonra`,
        );
        fetchAllStats();
      } else {
        alert(`Planlama başarısız: ${data.error}`);
      }
    } catch (error) {
      alert("Agent planlanamadı");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate max count for progress bars
  const maxCategoryCount = dashboardStats?.categoryStats?.length
    ? Math.max(...dashboardStats.categoryStats.map((c) => c.articleCount))
    : 1;

  const maxChartValue = dashboardStats?.charts.last7Days?.length
    ? Math.max(...dashboardStats.charts.last7Days.map((d) => d.count))
    : 1;

  const deleteArticle = async (id: string) => {
    if (!confirm("Bu haberi silmek istediğinizden emin misiniz?")) return;

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchAllStats();
      } else {
        alert("Haber silinemedi");
      }
    } catch (error) {
      alert("Bir hata oluştu");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">
              Command Center <span className="text-primary">Pro</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Sistem durumu, otonom agent kontrolü ve içerik analizi
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={scheduleAgent}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Görev Planla
            </Button>
            <Button
              onClick={executeAgent}
              disabled={executing}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
            >
              <Play className="mr-2 h-4 w-4" />
              {executing
                ? "Ghostwriter Çalışıyor..."
                : "Agent'ı Şimdi Çalıştır"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Haber
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.metrics.totalArticles || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Sistemdeki tüm haberler
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Görüntülenme
              </CardTitle>
              <Eye className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.metrics.totalViews.toLocaleString("tr-TR") ||
                  0}
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm haberler toplamı
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Bugün Eklenen
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.metrics.todayArticles || 0}
              </div>
              <p className="text-xs text-muted-foreground">Son 24 saatte</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yayında</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.metrics.publishedArticles || 0}
              </div>
              <p className="text-xs text-muted-foreground">Aktif haberler</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taslak</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.metrics.draftArticles || 0}
              </div>
              <p className="text-xs text-muted-foreground">Bekleyen haberler</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Stats Table */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Kategori İstatistikleri
              </CardTitle>
              <CardDescription>Her kategoride kaç haber var?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                      <TableHead className="text-right">Görüntülenme</TableHead>
                      <TableHead className="text-right">Son Haber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardStats?.categoryStats &&
                    dashboardStats.categoryStats.length > 0 ? (
                      dashboardStats.categoryStats.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">
                            {cat.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.articleCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.totalViews.toLocaleString("tr-TR")}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {cat.lastArticleDate
                              ? new Date(
                                  cat.lastArticleDate,
                                ).toLocaleDateString("tr-TR")
                              : "Yok"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          Henüz kategori verisi yok.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Articles */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Son Haberler</CardTitle>
              <CardDescription>Sisteme eklenen son 5 haber</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardStats?.recentArticles &&
                dashboardStats.recentArticles.length > 0 ? (
                  dashboardStats.recentArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-medium text-sm line-clamp-1 mb-1">
                          {article.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {article.category.name}
                          </Badge>
                          <span>•</span>
                          <span>
                            {new Date(article.createdAt).toLocaleDateString(
                              "tr-TR",
                            )}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.views}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant={
                            article.status === "PUBLISHED"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {article.status === "PUBLISHED"
                            ? "Yayında"
                            : "Taslak"}
                        </Badge>
                        <Link href={`/admin/articles/${article.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteArticle(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Henüz haber yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Last 7 Days Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Son 7 Gün
              </CardTitle>
              <CardDescription>Günlük eklenen haber sayısı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardStats?.charts.last7Days &&
                dashboardStats.charts.last7Days.length > 0 ? (
                  dashboardStats.charts.last7Days.map((day, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{day.label}</span>
                        <span className="text-muted-foreground">
                          {day.count} haber
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${maxChartValue > 0 ? (day.count / maxChartValue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz veri yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution Pie Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Kategori Dağılımı
              </CardTitle>
              <CardDescription>Haber dağılımı yüzdeleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardStats?.charts.categoryDistribution &&
                dashboardStats.charts.categoryDistribution.length > 0 ? (
                  dashboardStats.charts.categoryDistribution
                    .filter((cat) => cat.value > 0)
                    .map((cat, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{cat.name}</span>
                          <span className="text-muted-foreground">
                            {cat.value} haber (%{cat.percentage})
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{
                              width: `${cat.percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz kategori verisi yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Stats Section */}
        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Agent İstatistikleri
            </CardTitle>
            <CardDescription>
              Otonom agent performans metrikleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {agentStats?.agent.totalExecutions || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Toplam Çalıştırma
                </div>
              </div>
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {agentStats?.agent.totalArticles || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Oluşturulan Haber
                </div>
              </div>
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold">
                  %{agentStats?.agent.successRate || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Başarı Oranı
                </div>
              </div>
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {agentStats?.queue.delayed || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Planlanan Görev
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Category Distribution */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Agent Kategori Dağılımı</CardTitle>
              <CardDescription>
                Agent tarafından oluşturulan haberler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentStats?.categoryStats &&
                agentStats.categoryStats.length > 0 ? (
                  agentStats.categoryStats.map((cat, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">
                          {cat.count} haber
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full transition-all duration-500"
                          style={{
                            width: `${(cat.count / maxCategoryCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz kategori verisi yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Execution History */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Son Operasyonlar</CardTitle>
              <CardDescription>Son 5 Ghostwriter görevi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentStats?.history.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {new Date(execution.executionTime).toLocaleString(
                          "tr-TR",
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {execution.articlesCreated} haber oluşturuldu (
                        {execution.articlesScraped} tarandı)
                      </p>
                    </div>
                    <div className="self-end sm:self-auto">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          execution.status === "SUCCESS"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : execution.status === "FAILED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {execution.status === "SUCCESS"
                          ? "BAŞARILI"
                          : execution.status === "FAILED"
                            ? "BAŞARISIZ"
                            : "KISMİ"}
                      </span>
                    </div>
                  </div>
                ))}

                {(!agentStats?.history || agentStats.history.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    Henüz işlem yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Logs - Embedded */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-green-500" />
                <CardTitle className="text-zinc-100">Agent Terminali</CardTitle>
              </div>
              {executing && (
                <div className="flex items-center gap-2 text-green-500 text-sm animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  CANLI
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm h-64 overflow-y-auto space-y-1 pr-2">
              {logs.length === 0 && !executing ? (
                <p className="text-zinc-500 italic">
                  Terminal hazır. Komut bekleniyor...
                </p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString("tr-TR")}]
                    </span>
                    <span
                      className={`${
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                            ? "text-green-400 font-semibold"
                            : log.type === "progress"
                              ? "text-blue-400"
                              : "text-zinc-300"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              {executing && (
                <div className="flex items-center gap-2 text-green-500/50">
                  <span>_</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
