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
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  FileText,
  TrendingUp,
  Eye,
  Settings as SettingsIcon,
  ShieldAlert,
  Clock,
  Play,
  Newspaper,
  RefreshCw,
  HardDrive,
  MemoryStick,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Wifi,
  WifiOff,
  ChevronRight,
  BarChart3,
  Timer,
  Bot,
  Share2,
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

// === Lazy load heavy components ===
const AgentPipelineStepper = dynamic(
  () =>
    import("@/components/admin/AgentPipelineStepper").then(
      (m) => m.AgentPipelineStepper,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[120px] animate-pulse bg-muted/30 rounded-xl" />
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

const NOOP = () => {};

// === Animated Number Component ===
const AnimatedNumber = memo(function AnimatedNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = end;
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={`tabular-nums ${className}`}>
      {displayed.toLocaleString("tr-TR")}
    </span>
  );
});

// === Pulse Dot ===
const PulseDot = memo(function PulseDot({
  color = "bg-green-500",
  size = "w-2 h-2",
}: {
  color?: string;
  size?: string;
}) {
  return (
    <span className="relative flex">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
      />
      <span className={`relative inline-flex rounded-full ${size} ${color}`} />
    </span>
  );
});

// === Trend Indicator ===
const TrendBadge = memo(function TrendBadge({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
        <Minus className="h-3 w-3" /> 0{suffix}
      </span>
    );
  const isUp = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isUp ? "text-emerald-500" : "text-red-500"}`}
    >
      {isUp ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(value)}
      {suffix}
    </span>
  );
});

// === Color Map for Tailwind (dynamic classes don't work with JIT) ===
const COLOR_MAP: Record<
  string,
  {
    border: string;
    borderHover: string;
    bg: string;
    ring: string;
    text: string;
    glow: string;
  }
> = {
  green: {
    border: "border-green-500/20",
    borderHover: "hover:border-green-500/40",
    bg: "bg-green-500/10",
    ring: "ring-green-500/20",
    text: "text-green-500",
    glow: "from-green-500/20 to-green-500/5",
  },
  blue: {
    border: "border-blue-500/20",
    borderHover: "hover:border-blue-500/40",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
    text: "text-blue-500",
    glow: "from-blue-500/20 to-blue-500/5",
  },
  purple: {
    border: "border-purple-500/20",
    borderHover: "hover:border-purple-500/40",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/20",
    text: "text-purple-500",
    glow: "from-purple-500/20 to-purple-500/5",
  },
  orange: {
    border: "border-orange-500/20",
    borderHover: "hover:border-orange-500/40",
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/20",
    text: "text-orange-500",
    glow: "from-orange-500/20 to-orange-500/5",
  },
  amber: {
    border: "border-amber-500/20",
    borderHover: "hover:border-amber-500/40",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    text: "text-amber-500",
    glow: "from-amber-500/20 to-amber-500/5",
  },
  indigo: {
    border: "border-indigo-500/20",
    borderHover: "hover:border-indigo-500/40",
    bg: "bg-indigo-500/10",
    ring: "ring-indigo-500/20",
    text: "text-indigo-500",
    glow: "from-indigo-500/20 to-indigo-500/5",
  },
  violet: {
    border: "border-violet-500/20",
    borderHover: "hover:border-violet-500/40",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/20",
    text: "text-violet-500",
    glow: "from-violet-500/20 to-violet-500/5",
  },
  cyan: {
    border: "border-cyan-500/20",
    borderHover: "hover:border-cyan-500/40",
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/20",
    text: "text-cyan-500",
    glow: "from-cyan-500/20 to-cyan-500/5",
  },
  primary: {
    border: "border-primary/20",
    borderHover: "hover:border-primary/40",
    bg: "bg-primary/10",
    ring: "ring-primary/20",
    text: "text-primary",
    glow: "from-primary/20 to-primary/5",
  },
};

// === Hero Metric Card — Mobile-first, compact ===
const HeroMetric = memo(function HeroMetric({
  label,
  value,
  icon: Icon,
  color,
  trend,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
  sub: string;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${c.glow} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
      <Card
        className={`relative overflow-hidden ${c.border} bg-card/80 backdrop-blur-sm ${c.borderHover} transition-all duration-300`}
      >
        <CardContent className="p-4">
          {/* Mobile: horizontal layout */}
          <div className="flex items-center gap-3">
            <div
              className={`shrink-0 p-2.5 ${c.bg} rounded-xl ring-1 ${c.ring}`}
            >
              <Icon className={`h-5 w-5 ${c.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {label}
                </span>
                {trend !== undefined && <TrendBadge value={trend} suffix="%" />}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black ${c.text} leading-tight`}
              >
                <AnimatedNumber value={value} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

// === Realtime Status Bar — Always visible on mobile ===
const RealtimeStatusBar = memo(function RealtimeStatusBar({
  isAgentEnabled,
  nextRun,
  queueStats,
  isConnected,
}: {
  isAgentEnabled: boolean;
  nextRun?: string;
  queueStats?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  isConnected: boolean;
}) {
  return (
    <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        {/* Agent Status */}
        <div className="flex items-center gap-2 shrink-0">
          <PulseDot color={isAgentEnabled ? "bg-emerald-500" : "bg-red-500"} />
          <span className="text-xs font-bold">
            {isAgentEnabled ? "OTONOM AKTİF" : "KAPALI"}
          </span>
        </div>

        {/* Queue Mini Stats */}
        {queueStats && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">
                Bekleyen
              </span>
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] font-black text-yellow-500 border-yellow-500/30"
              >
                {queueStats.waiting}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Aktif</span>
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] font-black text-blue-500 border-blue-500/30"
              >
                {queueStats.active}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Hata</span>
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] font-black text-red-500 border-red-500/30"
              >
                {queueStats.failed}
              </Badge>
            </div>
          </div>
        )}

        {/* Connection + Next Run */}
        <div className="flex items-center gap-2 shrink-0">
          {nextRun && (
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3 text-primary" />
              <CountdownTimer
                targetTimestamp={nextRun}
                onComplete={NOOP}
                className="text-[11px] font-black tabular-nums text-primary"
              />
            </div>
          )}
          <div
            className={`flex items-center gap-1 ${isConnected ? "text-emerald-500" : "text-red-500"}`}
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span className="text-[10px] font-bold hidden sm:inline">
              {isConnected ? "CANLI" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

// === System Resources — Compact Ring Gauges ===
const ResourceRing = memo(function ResourceRing({
  label,
  percent,
  used,
  total,
  icon: Icon,
  color,
}: {
  label: string;
  percent: number;
  used?: string;
  total?: string;
  icon: React.ElementType;
  color: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const statusColor =
    percent > 90
      ? "text-red-500"
      : percent > 70
        ? "text-yellow-500"
        : COLOR_MAP[color]?.text || "text-primary";

  return (
    <div className="flex flex-col items-center gap-2 p-3">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/20"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={statusColor}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`h-4 w-4 ${statusColor} mb-0.5`} />
          <span className={`text-lg font-black ${statusColor}`}>
            {percent}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        {used && total && (
          <p className="text-[10px] text-muted-foreground">
            {used} / {total}
          </p>
        )}
      </div>
    </div>
  );
});

// === Quick Action Pill ===
const QuickAction = memo(function QuickAction({
  href,
  icon: Icon,
  label,
  color = "primary",
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color?: string;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return (
    <Link href={href}>
      <Button
        variant="outline"
        size="sm"
        className={`rounded-full text-xs gap-1.5 ${c.border} hover:${c.bg} ${c.borderHover} transition-all`}
      >
        <Icon className={`h-3.5 w-3.5 ${c.text}`} />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.split(" ")[0]}</span>
      </Button>
    </Link>
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
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 active:scale-[0.98] transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {article.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {article.category && (
            <Badge variant="outline" className="text-[10px] h-5 rounded-full">
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
          className="text-[10px] h-5 rounded-full"
        >
          {article.status === "PUBLISHED" ? "Yayında" : "Taslak"}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
});

// === Otonom Agent Card — Compact Mobile ===
const AgentStatusCard = memo(function AgentStatusCard({
  isEnabled,
  lastExecution,
  nextRun,
  queueStats,
}: {
  isEnabled: boolean;
  lastExecution?: string;
  nextRun?: string;
  queueStats?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}) {
  if (!isEnabled) {
    return (
      <Card className="border-red-500/20 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-7 h-7 text-red-500 animate-pulse" />
          </div>
          <h3 className="font-black text-base text-red-500">
            Otonom Sistem KAPALI
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Otomatik haber toplama pasif
          </p>
          <Link href="/admin/agent-settings">
            <Button
              variant="destructive"
              size="sm"
              className="font-bold rounded-full"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Aktif Et
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const total = queueStats
    ? queueStats.waiting +
      queueStats.active +
      queueStats.completed +
      queueStats.failed
    : 0;
  const successRate =
    total > 0 ? Math.round((queueStats!.completed / total) * 100) : 100;

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Otonom Agent
              </CardTitle>
              <CardDescription className="text-[10px]">
                Pipeline durumu
              </CardDescription>
            </div>
          </div>
          <Badge className="font-black text-[10px] rounded-full bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
            <PulseDot color="bg-emerald-500" size="w-1.5 h-1.5" />
            <span className="ml-1.5">AKTİF</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Next Run Countdown */}
        {nextRun && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 block mb-1">
              Sonraki Çalışma
            </span>
            <CountdownTimer
              targetTimestamp={nextRun}
              onComplete={NOOP}
              className="text-2xl sm:text-3xl font-black tabular-nums text-primary"
            />
          </div>
        )}

        {/* Last Execution */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Son Çalışma</span>
          </div>
          <span className="text-xs font-bold">
            {lastExecution
              ? formatDistanceToNow(new Date(lastExecution), {
                  addSuffix: true,
                  locale: tr,
                })
              : "—"}
          </span>
        </div>

        {/* Queue Stats Grid */}
        {queueStats && (
          <div className="grid grid-cols-4 gap-1.5">
            {[
              {
                label: "Bekleyen",
                value: queueStats.waiting,
                color: "text-yellow-500",
                bg: "bg-yellow-500/10",
              },
              {
                label: "Aktif",
                value: queueStats.active,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                label: "Tamam",
                value: queueStats.completed,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Hata",
                value: queueStats.failed,
                color: "text-red-500",
                bg: "bg-red-500/10",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-2 rounded-xl ${item.bg} text-center`}
              >
                <div className={`text-base font-black ${item.color}`}>
                  {item.value}
                </div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Success Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Başarı Oranı
            </span>
            <span className="text-xs font-black text-emerald-500">
              {successRate}%
            </span>
          </div>
          <Progress value={successRate} className="h-1.5" />
        </div>

        <Link href="/admin/agent-settings" className="block">
          <Button
            variant="outline"
            size="sm"
            className="w-full font-bold rounded-full border-primary/20 hover:bg-primary hover:text-white transition-all text-xs"
          >
            <SettingsIcon className="mr-1.5 h-3.5 w-3.5" />
            Ayarlar
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
});

// === MAIN DASHBOARD ===
export default function AdminDashboard() {
  const {
    data: dashboardData,
    error: dashError,
    isLoading: dashLoading,
    mutate: refreshDashboard,
  } = useDashboardStats(15000); // 15s refresh for more realtime feel

  const {
    data: agentData,
    error: agentError,
    isLoading: agentLoading,
  } = useAgentStats(8000); // 8s refresh for realtime agent status

  const dashboardStats = dashboardData?.success ? dashboardData.data : null;
  const agentStats = agentData?.success ? agentData.data : null;

  const { data: systemData } = useSystemStats(10000); // 10s refresh for realtime
  const systemStats = systemData?.success ? systemData.data : null;
  const isAgentEnabled = agentStats?.agent?.enabled ?? false;
  const isLoading = dashLoading && agentLoading && !dashboardStats;
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
      <div className="space-y-4 sm:space-y-6">
        {/* Realtime Status Bar — Sticky on mobile */}
        <RealtimeStatusBar
          isAgentEnabled={isAgentEnabled}
          nextRun={agentStats?.agent?.nextRun}
          queueStats={agentStats?.queue}
          isConnected={true}
        />

        {/* Error Banner */}
        {hasError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-red-400 font-bold text-sm">Bağlantı hatası</p>
              <p className="text-red-400/70 text-xs truncate">
                Veriler yüklenemedi, otomatik yenilenecek
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshDashboard()}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0 rounded-full"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Header — Compact on mobile */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate">
              Command <span className="text-primary italic">Center</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
              Realtime sistem durumu ve otonom operasyon takibi
            </p>
          </div>
          <Link href="/admin/articles/create" className="shrink-0">
            <Button size="sm" className="font-bold rounded-full text-xs">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yeni Haber</span>
              <span className="sm:hidden">Ekle</span>
            </Button>
          </Link>
        </div>

        {/* Quick Actions — Horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
          <QuickAction
            href="/admin/agent-settings"
            icon={Bot}
            label="Agent"
            color="primary"
          />
          <QuickAction
            href="/admin/visitor-analytics"
            icon={BarChart3}
            label="Analytics"
            color="blue"
          />
          <QuickAction
            href="/admin/seo"
            icon={TrendingUp}
            label="SEO"
            color="green"
          />
          <QuickAction
            href="/admin/articles"
            icon={Newspaper}
            label="Haberler"
            color="amber"
          />
          <QuickAction
            href="/admin/unshared-articles"
            icon={Share2}
            label="Paylaşılmayan"
            color="amber"
          />
        </div>

        {/* Hero Metrics — 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroMetric
            label="Bugün"
            value={dashboardStats?.metrics?.todayArticles || 0}
            icon={TrendingUp}
            color="green"
            sub="haber eklendi"
          />
          <HeroMetric
            label="Yayında"
            value={dashboardStats?.metrics?.publishedArticles || 0}
            icon={Newspaper}
            color="blue"
            sub="toplam haber"
          />
          <HeroMetric
            label="Bugün Okuma"
            value={dashboardStats?.metrics?.todayViews || 0}
            icon={Eye}
            color="purple"
            sub="görüntülenme"
          />
          <HeroMetric
            label="Toplam Okuma"
            value={dashboardStats?.metrics?.totalViews || 0}
            icon={Activity}
            color="orange"
            sub="tüm zamanlar"
          />
        </div>

        {/* Pipeline Stepper */}
        <AgentPipelineStepper />

        {/* Sunucu Kaynakları — RAM & Disk */}
        <Card className="border-indigo-500/20 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-0 px-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <MemoryStick className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">
                  Sunucu Kaynakları
                </CardTitle>
                <CardDescription className="text-[10px]">
                  RAM • Disk — 10s güncelleme
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-center gap-4 sm:gap-8">
              <ResourceRing
                label="RAM"
                percent={systemStats?.memory?.percent || 0}
                used={systemStats?.memory?.usedFormatted}
                total={systemStats?.memory?.totalFormatted}
                icon={MemoryStick}
                color="indigo"
              />
              <div className="h-16 w-px bg-border/50" />
              <ResourceRing
                label="Disk"
                percent={systemStats?.disk?.percent || 0}
                used={systemStats?.disk?.usedFormatted}
                total={systemStats?.disk?.totalFormatted}
                icon={HardDrive}
                color="violet"
              />
            </div>
          </CardContent>
        </Card>

        {/* Charts + Agent Status — Responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Pipeline Chart — Takes more space */}
          <div className="lg:col-span-3">
            <PipelineChart
              data={dashboardStats?.charts?.pipelineActivity || []}
            />
          </div>

          {/* Agent Status — Sidebar */}
          <div className="lg:col-span-2">
            <AgentStatusCard
              isEnabled={isAgentEnabled}
              lastExecution={agentStats?.agent?.lastExecution}
              nextRun={agentStats?.agent?.nextRun}
              queueStats={agentStats?.queue}
            />
          </div>
        </div>

        {/* Recent Articles */}
        {dashboardStats?.recentArticles &&
          dashboardStats.recentArticles.length > 0 && (
            <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <Newspaper className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight">
                        Son Haberler
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        En son eklenen içerikler
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/admin/articles">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs rounded-full"
                    >
                      Tümü <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="divide-y divide-border/30">
                  {dashboardStats.recentArticles.map((article: any) => (
                    <RecentArticleRow key={article.id} article={article} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </AdminLayout>
  );
}
