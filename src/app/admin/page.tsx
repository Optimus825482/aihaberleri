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
  Activity,
  FileText,
  TrendingUp,
  Clock,
  Calendar,
  Terminal,
  Eye,
  Edit,
  Trash2,
  PieChart,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { CountdownTimer } from "@/components/CountdownTimer";
import { DashboardDonutChart } from "@/components/DashboardDonutChart";
import { DashboardLineChart } from "@/components/DashboardLineChart";

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
    score: number;
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
    enabled: boolean;
    nextRun: string | null;
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
  upcomingJobs: Array<{
    id: string;
    scheduledFor: number;
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

  const deleteArticle = async (id: string) => {
    if (!confirm("Bu haberi silmek istediğinize emin misiniz?")) return;

    try {
      const response = await fetch(`/api/admin/articles/${id}`, {
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

  const isAgentEnabled = agentStats?.agent.enabled ?? false;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Command <span className="text-primary italic">Center</span>
            </h1>
            <p className="text-muted-foreground">
              Sistem durumu ve otonom operasyon takibi
            </p>
          </div>
        </div>

        {/* Stats Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Toplam Haber",
              value: dashboardStats?.metrics.totalArticles,
              icon: FileText,
              color: "text-blue-500",
            },
            {
              label: "Görüntülenme",
              value: dashboardStats?.metrics.totalViews.toLocaleString("tr-TR"),
              icon: Eye,
              color: "text-purple-500",
            },
            {
              label: "Bugün Eklenen",
              value: dashboardStats?.metrics.todayArticles,
              icon: TrendingUp,
              color: "text-green-500",
            },
            {
              label: "Yayında",
              value: dashboardStats?.metrics.publishedArticles,
              icon: Activity,
              color: "text-blue-400",
            },
            {
              label: "Taslak",
              value: dashboardStats?.metrics.draftArticles,
              icon: Clock,
              color: "text-orange-500",
            },
          ].map((stat, i) => (
            <Card key={i} className="bg-card/40 border-primary/10 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-black">{stat.value || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Primary Operational Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Autonomous Status Control */}
          <Card
            className={`lg:col-span-1 border-2 overflow-hidden ${isAgentEnabled ? "border-primary/20 bg-primary/5 shadow-primary/5 shadow-2xl" : "border-destructive/20 bg-destructive/5 shadow-destructive/5 shadow-2xl"}`}
          >
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black flex items-center gap-2 uppercase tracking-tight">
                  {isAgentEnabled ? (
                    <ShieldCheck className="text-primary w-5 h-5" />
                  ) : (
                    <ShieldAlert className="text-destructive w-5 h-5" />
                  )}
                  Otonom Sistem
                </CardTitle>
                <Badge
                  variant={isAgentEnabled ? "default" : "destructive"}
                  className="font-black px-3 py-0.5 text-[10px]"
                >
                  {isAgentEnabled ? "AKTİF" : "KAPALI"}
                </Badge>
              </div>
              <CardDescription className="text-[11px] font-bold uppercase opacity-60">
                Sistem çalışma periyodu
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-8">
              {isAgentEnabled ? (
                <div className="flex flex-col items-center text-center space-y-5">
                  <div className="relative w-full h-1.5 bg-primary/20 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-primary animate-progress-indefinite" />
                  </div>

                  {agentStats?.agent.nextRun ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-2">
                        SIRADAKİ TARAMA
                      </span>
                      <div className="bg-primary/10 px-6 py-4 rounded-3xl border border-primary/20">
                        <CountdownTimer
                          targetTimestamp={agentStats.agent.nextRun}
                          onComplete={() => fetchAllStats()}
                          className="text-4xl font-black tabular-nums text-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-3">
                      <Activity className="w-8 h-8 text-primary animate-spin-slow" />
                      <p className="text-sm font-black italic text-primary/60 uppercase tracking-widest">
                        Görev Planlanıyor...
                      </p>
                    </div>
                  )}
                  <Link href="/admin/agent-settings" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full font-black text-xs group border-primary/20 hover:bg-primary hover:text-white transition-all duration-300"
                    >
                      SİSTEM AYARLARI{" "}
                      <SettingsIcon className="ml-2 h-3.5 w-3.5 group-hover:rotate-90 transition-transform" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-6 py-4">
                  <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="w-10 h-10 text-destructive animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-xl text-destructive uppercase tracking-tight">
                      Otonom Sistem KAPALI
                    </h3>
                    <p className="text-[11px] font-bold text-muted-foreground px-8 leading-relaxed opacity-70">
                      Otomatik haber toplama ve içerik üretimi şu an pasif
                      durumda. Tekrar başlatmak için otonom modu aktif edin.
                    </p>
                  </div>
                  <Link href="/admin/agent-settings" className="w-full">
                    <Button
                      variant="destructive"
                      className="w-full font-black text-xs shadow-lg shadow-destructive/20"
                    >
                      AGENT&apos;I AKTİF ET
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trend Graphics */}
          <Card className="lg:col-span-2 bg-card/40 border-primary/10 shadow-xl overflow-hidden relative group">
            <div className="absolute -top-12 -right-12 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
              <TrendingUp className="w-64 h-64" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight">
                <Activity className="h-5 w-5 text-blue-500" />
                Haftalık İçerik Trendi
              </CardTitle>
              <CardDescription className="text-[11px] font-bold uppercase opacity-60">
                Son 7 günün içerik oluşturma performansı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardLineChart
                data={dashboardStats?.charts.last7Days || []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Secondary Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Articles */}
          <Card className="border-primary/5 bg-card/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight">
                  Son Haberler
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-50 text-sky-600">
                  En yeni 5 içerik
                </CardDescription>
              </div>
              <Link href="/admin/articles">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-black text-[10px] hover:bg-primary/10 hover:text-primary"
                >
                  TÜMÜNÜ YÖNET
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardStats?.recentArticles &&
                dashboardStats.recentArticles.length > 0 ? (
                  dashboardStats.recentArticles.map((article) => (
                    <div
                      key={article.id}
                      className="group flex items-start justify-between p-3 border-b border-primary/5 last:border-0 hover:bg-primary/5 rounded-xl transition-all duration-300"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                          <Badge
                            variant="outline"
                            className="font-black text-[9px] h-4 px-1.5 border-primary/20 text-primary/80 uppercase"
                          >
                            {article.category.name}
                          </Badge>
                          <span className="opacity-30">•</span>
                          <span
                            className={`font-black ${
                              (article.score || 0) >= 800
                                ? "text-green-600"
                                : (article.score || 0) >= 500
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {article.score || 0}
                          </span>
                          <span className="opacity-30">•</span>
                          <span className="font-bold">
                            {new Date(article.createdAt).toLocaleString(
                              "tr-TR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          <span className="opacity-30">•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {article.views}
                          </span>
                        </div>
                      </div>
                      <Link href={`/admin/articles/${article.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-2xl opacity-50 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground opacity-40 italic">
                    <FileText className="w-8 h-8 mb-2" />
                    <p className="font-bold text-xs uppercase">
                      Haber Bulunmuyor
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Operation History */}
          <Card className="border-primary/5 bg-card/20">
            <CardHeader>
              <CardTitle className="text-base font-black uppercase tracking-tight">
                Operasyon Günlüğü
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase opacity-50 text-purple-600">
                Ghostwriter performans geçmişi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agentStats?.history.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${execution.status === "SUCCESS" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}
                      >
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-xs text-foreground/80 group-hover:text-foreground transition-colors">
                          {new Date(execution.executionTime).toLocaleString(
                            "tr-TR",
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">
                          {execution.articlesCreated} Haber Oluşturuldu •{" "}
                          {execution.duration || 0} Saniye
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        execution.status === "SUCCESS"
                          ? "default"
                          : execution.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                      }
                      className="font-black text-[9px] px-2 h-5 rounded-full"
                    >
                      {execution.status === "SUCCESS" ? "OK" : "ERR"}
                    </Badge>
                  </div>
                ))}
                {(!agentStats?.history || agentStats.history.length === 0) && (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground opacity-40 italic">
                    <Clock className="w-8 h-8 mb-2" />
                    <p className="font-bold text-xs uppercase">
                      İşlem Kaydı Boş
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Logs - Terminal Style */}
        <Card className="bg-[#09090b] border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden group">
          <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="h-4 w-[1px] bg-white/10 mx-2" />
                <Terminal className="h-4 w-4 text-primary" />
                <CardTitle className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                  {isAgentEnabled
                    ? "GHOSTWRITER_SYSTEM_MONITOR"
                    : "SYSTEM_OFFLINE"}
                </CardTitle>
              </div>
              {executing && (
                <div className="flex items-center gap-2 text-green-400 text-[10px] font-black bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                  REAL-TIME STREAMING
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-mono text-[11px] h-72 overflow-y-auto p-6 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.05),transparent)]">
              {logs.length === 0 && !executing ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-3 grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-50 transition-all duration-700">
                  <Terminal className="h-10 w-10" />
                  <p className="font-black uppercase tracking-tighter text-xs">
                    Terminal Standby Mode
                  </p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex gap-4 animate-in fade-in duration-300"
                  >
                    <span className="text-zinc-600 shrink-0 font-bold opacity-50">
                      [{new Date(log.timestamp).toLocaleTimeString("tr-TR")}]
                    </span>
                    <span
                      className={`${
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                            ? "text-primary font-bold"
                            : log.type === "progress"
                              ? "text-sky-400"
                              : "text-zinc-400"
                      } leading-relaxed`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              {executing && (
                <div className="text-primary animate-pulse font-black px-4">
                  _
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
