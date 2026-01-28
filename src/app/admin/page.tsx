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
  Eye,
  PieChart,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { CountdownTimer } from "@/components/CountdownTimer";
import { DashboardDonutChart } from "@/components/DashboardDonutChart";
import { RealtimeAreaChart } from "@/components/RealtimeAreaChart";
import { CountryBarChart } from "@/components/CountryBarChart";
import { SystemMonitor, LogMessage } from "@/components/SystemMonitor";

interface DashboardStats {
  metrics: {
    totalArticles: number;
    totalViews: number;
    todayArticles: number;
    publishedArticles: number;
    draftArticles: number;
    activeVisitors: number;
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
    realtimeVisitors: Array<{
      time: string;
      visitors: number;
      label: string;
    }>;
    countryDistribution: Array<{
      name: string;
      value: number;
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

export default function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [trafficRange, setTrafficRange] = useState("30m");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchAllStats();
  }, [trafficRange]);

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
        fetch(`/api/admin/dashboard?range=${trafficRange}`),
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
              icon: FileText,
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Realtime Traffic Chart */}
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Zap className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black uppercase tracking-tight">
                      Anlık Trafik
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                      {trafficRange === "5m"
                        ? "Son 5 Dakika"
                        : trafficRange === "15m"
                          ? "Son 15 Dakika"
                          : trafficRange === "30m"
                            ? "Son 30 Dakika"
                            : trafficRange === "1h"
                              ? "Son 1 Saat"
                              : "Bugün"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 relative z-10">
                  <select
                    value={trafficRange}
                    onChange={(e) => setTrafficRange(e.target.value)}
                    className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-xs font-bold uppercase outline-none focus:ring-2 ring-blue-500/50 cursor-pointer hover:bg-blue-500/20 transition-colors text-foreground"
                    style={{ pointerEvents: "auto" }}
                  >
                    <option
                      value="5m"
                      className="bg-background text-foreground"
                    >
                      Son 5 Dakika
                    </option>
                    <option
                      value="15m"
                      className="bg-background text-foreground"
                    >
                      Son 15 Dakika
                    </option>
                    <option
                      value="30m"
                      className="bg-background text-foreground"
                    >
                      Son 30 Dakika
                    </option>
                    <option
                      value="1h"
                      className="bg-background text-foreground"
                    >
                      Son 1 Saat
                    </option>
                    <option
                      value="today"
                      className="bg-background text-foreground"
                    >
                      Bugün
                    </option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RealtimeAreaChart
                data={dashboardStats?.charts.realtimeVisitors || []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Country Distribution */}
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Globe className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-tight">
                    Coğrafi Dağılım
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                    Son 24 saat • Ülkelere göre
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CountryBarChart
                data={dashboardStats?.charts.countryDistribution || []}
              />
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                  <PieChart className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-tight">
                    Kategori Dağılımı
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                    İçerik kategorileri
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <DashboardDonutChart
                data={dashboardStats?.charts.categoryDistribution || []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Real-time Logs - Terminal Style */}
        {/* Real-time Logs - Terminal Style */}
        <SystemMonitor
          logs={logs}
          executing={executing}
          isAgentEnabled={isAgentEnabled}
        />
      </div>
    </AdminLayout>
  );
}
