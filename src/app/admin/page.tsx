"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
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
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Play,
  Loader2,
  Newspaper,
  Terminal,
  Pause,
  Trash2,
  Maximize2,
  Minimize2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { DashboardSkeleton } from "@/components/admin/SkeletonLoaders";
import {
  useDashboardStats,
  useAgentStats,
  useSystemStats,
} from "@/hooks/use-swr-admin";

// === RULE: bundle-dynamic-imports — Lazy load heavy components ===
const AgentPipelineStepper = dynamic(
  () =>
    import("@/components/admin/AgentPipelineStepper").then(
      (m) => m.AgentPipelineStepper,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] animate-pulse bg-muted/30 rounded-xl" />
    ),
  },
);

const SystemGauge = dynamic(
  () => import("@/components/admin/SystemGauge").then((m) => m.SystemGauge),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] animate-pulse bg-muted/30 rounded-xl" />
    ),
  },
);

const PipelineChart = dynamic<{
  data: Array<{ time: string; articles: number; views: number }>;
}>(() => import("@/components/admin/PipelineChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] animate-pulse bg-muted/30 rounded-xl" />
  ),
});

// === RULE: rendering-hoist-jsx — Static elements outside component ===
const METRIC_CARDS_CONFIG = [
  {
    key: "todayArticles",
    label: "Bugün Yayınlanan",
    sub: "haber bugün eklendi",
    color: "green",
    icon: TrendingUp,
  },
  {
    key: "publishedArticles",
    label: "Toplam Yayınlanan",
    sub: "haber yayında",
    color: "blue",
    icon: Newspaper,
  },
  {
    key: "todayViews",
    label: "Bugün Okuma",
    sub: "görüntülenme bugün",
    color: "purple",
    icon: Eye,
    format: true,
  },
  {
    key: "totalViews",
    label: "Toplam Okuma",
    sub: "toplam görüntülenme",
    color: "orange",
    icon: Activity,
    format: true,
  },
] as const;

// === RULE: rerender-memo-with-default-value — Hoist default non-primitive props ===
const NOOP = () => {};

// === Metric Card Component (memoized) ===
const MetricCard = memo(function MetricCard({
  label,
  sub,
  color,
  icon: Icon,
  value,
}: {
  label: string;
  sub: string;
  color: string;
  icon: React.ElementType;
  value: number;
}) {
  return (
    <Card
      className={`relative overflow-hidden border-${color}-500/20 bg-gradient-to-br from-${color}-500/10 to-transparent`}
    >
      <div
        className={`absolute top-0 right-0 w-20 h-20 bg-${color}-500/10 rounded-full blur-2xl`}
      />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className={`p-2 bg-${color}-500/10 rounded-lg`}>
            <Icon className={`h-4 w-4 text-${color}-500`} />
          </div>
        </div>
        <div className={`text-4xl font-black text-${color}-500 tabular-nums`}>
          {value?.toLocaleString("tr-TR") || 0}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{sub}</p>
      </CardContent>
    </Card>
  );
});

// === Recent Article Row (memoized) ===
const RecentArticleRow = memo(function RecentArticleRow({
  article,
}: {
  article: {
    id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: string;
    views: number;
    category?: { name: string };
  };
}) {
  return (
    <Link
      href={`/admin/articles/${article.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {article.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {article.category && (
            <Badge variant="outline" className="text-[10px] h-5">
              {article.category.name}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(article.createdAt), {
              addSuffix: true,
              locale: tr,
            })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-xs font-bold tabular-nums">
            {article.views?.toLocaleString("tr-TR") || 0}
          </p>
          <p className="text-[9px] text-muted-foreground">okuma</p>
        </div>
        <Badge
          variant={article.status === "PUBLISHED" ? "default" : "secondary"}
          className="text-[10px] h-5"
        >
          {article.status === "PUBLISHED" ? "Yayında" : "Taslak"}
        </Badge>
      </div>
    </Link>
  );
});

// === Log Entry Component (memoized + content-visibility) ===
interface LogEntry {
  type: string;
  level?: string;
  message?: string;
  timestamp: string;
  step?: string;
  emoji?: string;
}

const LOG_LEVEL_COLORS: Record<string, string> = {
  error: "text-red-400",
  warn: "text-yellow-400",
  success: "text-emerald-400",
  info: "text-blue-400",
};

const LogEntryRow = memo(function LogEntryRow({ log }: { log: LogEntry }) {
  const colorClass = LOG_LEVEL_COLORS[log.level || ""] || "text-zinc-400";
  return (
    // RULE: rendering-content-visibility — skip layout for off-screen log entries
    <div
      className={`flex items-start gap-2 py-0.5 hover:bg-zinc-900/50 rounded px-1 ${colorClass}`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 24px" }}
    >
      <span className="text-zinc-600 shrink-0 select-none">
        {new Date(log.timestamp).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
      {log.emoji && <span className="shrink-0">{log.emoji}</span>}
      {log.step && (
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] uppercase font-bold">
          {log.step}
        </span>
      )}
      <span className="break-all">{log.message}</span>
    </div>
  );
});

// === Live Log Stream Component ===
function LiveLogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    if (!isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isPaused]);

  // SSE connection
  useEffect(() => {
    const connectToLogs = () => {
      if (eventSourceRef.current) eventSourceRef.current.close();

      const eventSource = new EventSource("/api/agent/live-logs");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => setIsConnected(true);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "connected") setIsConnected(true);
          else if (data.type === "log") {
            // RULE: rerender-functional-setstate — stable callback, no stale closure
            setLogs((prev) => [...prev, data].slice(-200));
          }
        } catch {
          /* ignore parse errors */
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        setTimeout(connectToLogs, 5000);
      };
    };

    connectToLogs();
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Scroll on new logs
  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  return (
    <Card
      className={`border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent ${isExpanded ? "fixed inset-4 z-50" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Terminal className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                Worker Log Akışı
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isConnected ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                  />
                  {isConnected ? "CANLI" : "BAĞLANTI YOK"}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                AI News Agent realtime işlem logları
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused((p) => !p)}
              className="h-8 w-8 p-0"
              title={isPaused ? "Devam Et" : "Duraklat"}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLogs([])}
              className="h-8 w-8 p-0"
              title="Temizle"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((e) => !e)}
              className="h-8 w-8 p-0"
              title={isExpanded ? "Küçült" : "Büyüt"}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs overflow-hidden ${isExpanded ? "h-[calc(100vh-180px)]" : "h-[300px]"}`}
        >
          <div className="h-full overflow-y-auto p-3 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Terminal className="h-8 w-8 mb-2 opacity-50" />
                <p>Henüz log yok</p>
                <p className="text-[10px] mt-1">
                  Agent çalıştığında loglar burada görünecek
                </p>
              </div>
            ) : (
              logs.map((log, index) => <LogEntryRow key={index} log={log} />)
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
        {isPaused && (
          <div className="mt-2 text-center">
            <Badge variant="secondary" className="text-xs">
              <Pause className="h-3 w-3 mr-1" />
              Otomatik kaydırma duraklatıldı
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === Main Dashboard Component ===
export default function AdminDashboard() {
  // RULE: client-swr-dedup — SWR for auto-refresh, dedup, caching (replaces setInterval)
  const {
    data: dashboardData,
    error: dashError,
    isLoading: dashLoading,
    mutate: refreshDashboard,
  } = useDashboardStats(30000);
  const {
    data: agentData,
    error: agentError,
    isLoading: agentLoading,
  } = useAgentStats(30000);
  const { data: systemData } = useSystemStats(30000);

  // RULE: rerender-derived-state-no-effect — derive during render, not in useEffect
  const dashboardStats = dashboardData?.success ? dashboardData.data : null;
  const agentStats = agentData?.success ? agentData.data : null;
  const systemStats = systemData?.success ? systemData.data : null;
  const isAgentEnabled = agentStats?.agent?.enabled ?? false;
  const isLoading = dashLoading && agentLoading;
  const hasError = dashError && agentError;

  if (isLoading) {
    return (
      <AdminLayout>
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* API Error Banner */}
        {hasError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">
                API&apos;lere bağlanılamadı
              </p>
              <p className="text-red-400/70 text-sm">
                Bazı veriler yüklenemedi. Otomatik yenilenmeye devam edecek.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshDashboard()}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tekrar Dene
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Command <span className="text-primary italic">Center</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Sistem durumu ve otonom operasyon takibi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/articles/create">
              <Button className="font-bold">
                <FileText className="mr-2 h-4 w-4" />
                Yeni Haber
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/agent-settings">
            <Button variant="outline" size="sm" className="text-xs">
              <SettingsIcon className="h-3 w-3 mr-1" /> Agent Ayarları
            </Button>
          </Link>
          <Link href="/admin/analytics">
            <Button variant="outline" size="sm" className="text-xs">
              <Activity className="h-3 w-3 mr-1" /> Analytics
            </Button>
          </Link>
          <Link href="/admin/monitoring">
            <Button variant="outline" size="sm" className="text-xs">
              <Eye className="h-3 w-3 mr-1" /> Sistem İzleme
            </Button>
          </Link>
          <Link href="/admin/seo">
            <Button variant="outline" size="sm" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" /> SEO
            </Button>
          </Link>
        </div>

        {/* Main Metrics - 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRIC_CARDS_CONFIG.map((cfg) => (
            <MetricCard
              key={cfg.key}
              label={cfg.label}
              sub={cfg.sub}
              color={cfg.color}
              icon={cfg.icon}
              value={dashboardStats?.metrics?.[cfg.key] || 0}
            />
          ))}
        </div>

        {/* Agent Pipeline Stepper */}
        <AgentPipelineStepper />

        {/* System Resources */}
        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Activity className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight">
                  Sunucu Kaynakları
                </CardTitle>
                <CardDescription className="text-xs">
                  RAM ve Disk kullanım durumu
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <SystemGauge
              ramPercent={systemStats?.memory?.percent || 0}
              diskPercent={systemStats?.disk?.percent || 0}
              ramInfo={systemStats?.memory}
              diskInfo={systemStats?.disk}
            />
          </CardContent>
        </Card>

        {/* Pipeline Chart + Otonom Sistem — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Activity Chart */}
          <PipelineChart
            data={dashboardStats?.charts?.pipelineActivity || []}
          />

          {/* Otonom Sistem Durumu */}
          <Card
            className={`border-2 overflow-hidden ${
              isAgentEnabled
                ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
                : "border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent"
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg ${isAgentEnabled ? "bg-primary/10" : "bg-destructive/10"}`}
                  >
                    {isAgentEnabled ? (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base font-black uppercase tracking-tight">
                      Otonom Sistem
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Dinamik &amp; Realtime Pipeline
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={isAgentEnabled ? "default" : "destructive"}
                  className="font-black px-3 py-0.5 text-xs"
                >
                  {isAgentEnabled ? "AKTİF" : "KAPALI"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isAgentEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Son Çalışma</span>
                    </div>
                    <span className="text-sm font-bold">
                      {agentStats?.agent?.lastExecution
                        ? formatDistanceToNow(
                            new Date(agentStats.agent.lastExecution),
                            { addSuffix: true, locale: tr },
                          )
                        : "Henüz çalışmadı"}
                    </span>
                  </div>

                  <div className="relative p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
                    <div className="relative text-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/60 block mb-2">
                        Sonraki Çalışma
                      </span>
                      {agentStats?.agent?.nextRun ? (
                        <CountdownTimer
                          targetTimestamp={agentStats.agent.nextRun}
                          onComplete={NOOP}
                          className="text-4xl font-black tabular-nums text-primary"
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-lg font-bold">
                            Planlanıyor...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {
                        label: "Bekleyen",
                        value: agentStats?.queue?.waiting || 0,
                        color: "text-yellow-500",
                      },
                      {
                        label: "Aktif",
                        value: agentStats?.queue?.active || 0,
                        color: "text-blue-500",
                      },
                      {
                        label: "Tamamlanan",
                        value: agentStats?.queue?.completed || 0,
                        color: "text-green-500",
                      },
                      {
                        label: "Başarısız",
                        value: agentStats?.queue?.failed || 0,
                        color: "text-red-500",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-2 rounded-lg bg-muted/50 text-center"
                      >
                        <div className={`text-lg font-black ${item.color}`}>
                          {item.value}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link href="/admin/agent-settings" className="block">
                    <Button
                      variant="outline"
                      className="w-full font-bold border-primary/20 hover:bg-primary hover:text-white transition-all"
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Sistem Ayarları
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-8 h-8 text-destructive animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-destructive">
                      Otonom Sistem KAPALI
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Otomatik haber toplama pasif durumda
                    </p>
                  </div>
                  <Link href="/admin/agent-settings">
                    <Button variant="destructive" className="font-bold">
                      <Play className="mr-2 h-4 w-4" />
                      Agent&apos;ı Aktif Et
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Articles — API returns but old dashboard didn't show */}
        {dashboardStats?.recentArticles &&
          dashboardStats.recentArticles.length > 0 && (
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Newspaper className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black uppercase tracking-tight">
                        Son Haberler
                      </CardTitle>
                      <CardDescription className="text-xs">
                        En son eklenen haberler
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/admin/articles">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Tümünü Gör <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="divide-y divide-border/50">
                  {dashboardStats.recentArticles.map((article: any) => (
                    <RecentArticleRow key={article.id} article={article} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Live Worker Log Stream */}
        <LiveLogStream />
      </div>
    </AdminLayout>
  );
}
