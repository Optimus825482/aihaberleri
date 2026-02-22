"use client";

import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Users,
  Clock,
  MousePointerClick,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingUp,
  RefreshCw,
  Chrome,
  Laptop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Period = "today" | "7d" | "30d" | "90d";

interface OverviewData {
  totalPageViews: number;
  uniqueVisitors: number;
  avgDuration: number;
  avgScrollDepth: number;
  bounceRate: number;
  activeNow: number;
}

interface StatsData {
  overview: OverviewData;
  pageViewsByDay: Array<{ date: string; count: number }>;
  topPages: Array<{ path: string; count: number; avg_duration: number }>;
  topCountries: Array<{ country: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  browserBreakdown: Array<{ browser: string; count: number }>;
  osBreakdown: Array<{ os: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topArticles: Array<{
    articleId: string;
    title: string;
    slug: string;
    views: number;
    avg_duration: number;
    avg_scroll: number;
  }>;
  recentVisitors: Array<{
    id: string;
    ipAddress: string;
    currentPage: string;
    country: string | null;
    countryCode: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
    os: string | null;
    lastActivity: string;
    totalVisits: number;
  }>;
}

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

const DEVICE_ICONS: Record<string, any> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}dk ${secs}s`;
}

function getCountryFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "violet",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/30",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  };

  const iconColorMap: Record<string, string> = {
    violet: "text-violet-400",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    blue: "text-blue-400",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02]",
        colorMap[color],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg bg-background/50 p-2.5",
            iconColorMap[color],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend === "up" ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
          ) : trend === "down" ? (
            <ArrowDownRight className="h-3 w-3 text-rose-400" />
          ) : null}
        </div>
      )}
    </div>
  );
});

export default function VisitorAnalyticsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");
  const [refreshing, setRefreshing] = useState(false);
  const [ga4Data, setGa4Data] = useState<{
    totalPageViews: number;
    totalUsers: number;
    newUsers: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
    dailyData: Array<{ date: string; pageViews: number; users: number }>;
    topPages: Array<{ page: string; views: number; users: number }>;
  } | null>(null);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const visitorFetchAbortRef = useRef<AbortController | null>(null);
  const ga4FetchAbortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    visitorFetchAbortRef.current?.abort();
    const controller = new AbortController();
    visitorFetchAbortRef.current = controller;

    try {
      setRefreshing(true);
      const res = await fetch(
        `/api/admin/analytics/visitor-stats?period=${period}`,
        { signal: controller.signal },
      );
      const result = await res.json();
      if (!controller.signal.aborted && result.success) {
        setData(result.data);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Failed to fetch visitor stats:", error);
    } finally {
      if (visitorFetchAbortRef.current === controller) {
        visitorFetchAbortRef.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [period]);

  const fetchGA4 = useCallback(async () => {
    ga4FetchAbortRef.current?.abort();
    const controller = new AbortController();
    ga4FetchAbortRef.current = controller;

    try {
      setGa4Loading(true);
      const res = await fetch(
        `/api/admin/analytics/ga4-realtime?period=${period}`,
        { signal: controller.signal },
      );
      const result = await res.json();
      if (!controller.signal.aborted && result.success && result.data) {
        setGa4Data(result.data);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Failed to fetch GA4 data:", error);
    } finally {
      if (ga4FetchAbortRef.current === controller) {
        ga4FetchAbortRef.current = null;
        setGa4Loading(false);
      }
    }
  }, [period]);

  const syncGA4Views = useCallback(async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/analytics/ga-views?sync=true");
      const result = await res.json();
      if (result.synced) {
        alert(`✅ ${result.synced} makale GA4 verileri ile güncellendi`);
        fetchData(); // Refresh stats
      }
    } catch (error) {
      alert("❌ GA4 senkronizasyonu başarısız");
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    const refreshAll = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      fetchData();
      fetchGA4();
    };

    refreshAll();

    const visitorInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    }, 60000);

    const ga4Interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchGA4();
      }
    }, 180000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData();
        fetchGA4();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(visitorInterval);
      clearInterval(ga4Interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, fetchGA4]);

  useEffect(() => {
    return () => {
      visitorFetchAbortRef.current?.abort();
      ga4FetchAbortRef.current?.abort();
    };
  }, []);

  const deviceTotal = useMemo(
    () => data?.deviceBreakdown.reduce((sum, item) => sum + item.count, 0) ?? 0,
    [data?.deviceBreakdown],
  );

  const countryTotal = useMemo(
    () => data?.topCountries.reduce((sum, item) => sum + item.count, 0) ?? 0,
    [data?.topCountries],
  );

  const referrerRows = useMemo(() => {
    const referrers = data?.topReferrers ?? [];
    const total = referrers.reduce((sum, item) => sum + item.count, 0);

    return referrers.map((ref) => {
      const pct = total > 0 ? Math.round((ref.count / total) * 100) : 0;
      let displayName = ref.referrer;

      try {
        if (ref.referrer.startsWith("http")) {
          displayName = new URL(ref.referrer).hostname;
        }
      } catch { }

      return {
        ...ref,
        pct,
        displayName,
      };
    });
  }, [data?.topReferrers]);

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="rounded-lg bg-red-500/10 p-6 text-center">
          <p className="text-red-400">Veri yüklenemedi</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-violet-400 hover:underline"
          >
            Tekrar Dene
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { overview } = data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Ziyaretçi Analizi
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Detaylı trafik metrikleri ve ziyaretçi davranışları
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex rounded-lg border border-border/50 bg-background/50 p-0.5">
              {(["today", "7d", "30d", "90d"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    period === p
                      ? "bg-violet-500/20 text-violet-300 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "today"
                    ? "Bugün"
                    : p === "7d"
                      ? "7 Gün"
                      : p === "30d"
                        ? "30 Gün"
                        : "90 Gün"}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              aria-label="Verileri yenile"
              className="rounded-lg border border-border/50 bg-background/50 p-2 text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </button>
            {overview.activeNow > 0 && (
              <Badge
                variant="outline"
                className="border-emerald-500/50 text-emerald-400 gap-1"
              >
                <Activity className="h-3 w-3 animate-pulse" />
                {overview.activeNow} aktif
              </Badge>
            )}
          </div>
        </div>

        {/* GA4 Overview Section */}
        {ga4Data && (
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-black">
                    GA4
                  </Badge>
                  <CardTitle className="text-sm font-bold">
                    Google Analytics 4 Özeti
                  </CardTitle>
                </div>
                <button
                  onClick={syncGA4Views}
                  disabled={syncing}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                  {syncing ? "Senkronize..." : "DB Senkronize"}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl bg-background/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Görüntüleme</p>
                  <p className="text-xl font-black text-emerald-400 tabular-nums">{ga4Data.totalPageViews.toLocaleString("tr-TR")}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kullanıcı</p>
                  <p className="text-xl font-black text-cyan-400 tabular-nums">{ga4Data.totalUsers.toLocaleString("tr-TR")}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yeni</p>
                  <p className="text-xl font-black text-violet-400 tabular-nums">{ga4Data.newUsers.toLocaleString("tr-TR")}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Oturum</p>
                  <p className="text-xl font-black text-amber-400 tabular-nums">{ga4Data.sessions.toLocaleString("tr-TR")}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ort. Süre</p>
                  <p className="text-xl font-black text-blue-400 tabular-nums">{formatDuration(ga4Data.avgSessionDuration)}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bounce</p>
                  <p className="text-xl font-black text-rose-400 tabular-nums">%{ga4Data.bounceRate}</p>
                </div>
              </div>

              {/* GA4 Daily Chart */}
              {ga4Data.dailyData.length > 1 && (
                <div className="mt-4 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ga4Data.dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ga4PageViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ga4Users" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelFormatter={(v) => new Date(v).toLocaleDateString("tr-TR")}
                      />
                      <Area type="monotone" dataKey="pageViews" name="Görüntüleme" stroke="#10b981" strokeWidth={2} fill="url(#ga4PageViews)" />
                      <Area type="monotone" dataKey="users" name="Kullanıcı" stroke="#06b6d4" strokeWidth={2} fill="url(#ga4Users)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Sayfa Görüntüleme"
            value={overview.totalPageViews.toLocaleString("tr-TR")}
            icon={Eye}
            color="violet"
          />
          <StatCard
            title="Tekil Ziyaretçi"
            value={overview.uniqueVisitors.toLocaleString("tr-TR")}
            icon={Users}
            color="cyan"
          />
          <StatCard
            title="Ort. Süre"
            value={formatDuration(overview.avgDuration)}
            icon={Clock}
            color="emerald"
          />
          <StatCard
            title="Ort. Scroll"
            value={`%${overview.avgScrollDepth}`}
            icon={MousePointerClick}
            color="amber"
          />
          <StatCard
            title="Bounce Rate"
            value={`%${overview.bounceRate}`}
            subtitle={overview.bounceRate > 60 ? "Yüksek" : "Normal"}
            icon={ArrowDownRight}
            color="rose"
          />
          <StatCard
            title="Şu An Aktif"
            value={overview.activeNow}
            icon={Activity}
            color="blue"
          />
        </div>

        {/* Traffic Chart */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-400" />
              Trafik Grafiği
            </CardTitle>
            <CardDescription>Günlük sayfa görüntüleme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.pageViewsByDay}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v) =>
                      new Date(v).toLocaleDateString("tr-TR")
                    }
                    formatter={(value: number) => [
                      value.toLocaleString("tr-TR"),
                      "Görüntüleme",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorViews)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Middle Row: Device + Browser + OS */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Device Breakdown */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-cyan-400" />
                Cihaz Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="device"
                    >
                      {data.deviceBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {data.deviceBreakdown.map((item, i) => {
                  const pct =
                    deviceTotal > 0
                      ? Math.round((item.count / deviceTotal) * 100)
                      : 0;
                  const DeviceIcon = DEVICE_ICONS[item.device] || Monitor;
                  return (
                    <div
                      key={item.device}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <DeviceIcon className="h-3 w-3 text-muted-foreground" />
                        <span>{item.device}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {pct}% ({item.count})
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Browser Breakdown */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Chrome className="h-4 w-4 text-emerald-400" />
                Tarayıcı Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.browserBreakdown.slice(0, 6)}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      type="number"
                      fontSize={11}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      type="category"
                      dataKey="browser"
                      fontSize={11}
                      stroke="hsl(var(--muted-foreground))"
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* OS Breakdown */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Laptop className="h-4 w-4 text-amber-400" />
                İşletim Sistemi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.osBreakdown.slice(0, 6)}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      type="number"
                      fontSize={11}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      type="category"
                      dataKey="os"
                      fontSize={11}
                      stroke="hsl(var(--muted-foreground))"
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Countries + Top Pages + Referrers */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Top Countries */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-400" />
                Ülke Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {data.topCountries.map((item, i) => {
                  const pct =
                    countryTotal > 0
                      ? Math.round((item.count / countryTotal) * 100)
                      : 0;
                  return (
                    <div key={item.country} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {getCountryFlag(null)}
                          </span>
                          {item.country}
                        </span>
                        <span className="text-muted-foreground">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.topCountries.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Henüz veri yok
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Pages */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-400" />
                En Çok Ziyaret Edilen Sayfalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {data.topPages.slice(0, 15).map((page, i) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-muted-foreground font-mono w-5 text-right shrink-0">
                        {i + 1}.
                      </span>
                      <span className="truncate" title={page.path}>
                        {page.path === "/" ? "Ana Sayfa" : page.path}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-muted-foreground">
                        {formatDuration(page.avg_duration)}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        {page.count}
                      </Badge>
                    </div>
                  </div>
                ))}
                {data.topPages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Henüz veri yok
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Referrers */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                Trafik Kaynakları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {referrerRows.map((ref) => {
                  return (
                    <div key={ref.referrer} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span
                          className="truncate max-w-[180px]"
                          title={ref.referrer}
                        >
                          {ref.displayName}
                        </span>
                        <span className="text-muted-foreground">
                          {ref.count} ({ref.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                          style={{ width: `${ref.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.topReferrers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Henüz veri yok
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Articles */}
        {data.topArticles.length > 0 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-400" />
                En Çok Okunan Makaleler
              </CardTitle>
              <CardDescription>
                Okuma süresi ve scroll derinliği ile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                        #
                      </th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                        Makale
                      </th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                        Okuma
                      </th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                        Ort. Süre
                      </th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                        Ort. Scroll
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topArticles.map((article, i) => (
                      <tr
                        key={article.articleId}
                        className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                      >
                        <td className="py-2.5 px-2 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className="line-clamp-1 max-w-[400px]"
                            title={article.title}
                          >
                            {article.title}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <Badge variant="secondary" className="text-[10px]">
                            {article.views}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right text-muted-foreground">
                          {formatDuration(article.avg_duration)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="h-1.5 w-16 rounded-full bg-muted/30 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  article.avg_scroll >= 70
                                    ? "bg-emerald-500"
                                    : article.avg_scroll >= 40
                                      ? "bg-amber-500"
                                      : "bg-rose-500",
                                )}
                                style={{ width: `${article.avg_scroll}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground w-8 text-right">
                              %{article.avg_scroll}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Active Visitors */}
        {data.recentVisitors.length > 0 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                Son Aktif Ziyaretçiler
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/30 text-emerald-400"
                >
                  Son 30 dk
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                        Konum
                      </th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                        Sayfa
                      </th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                        Cihaz
                      </th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                        Tarayıcı
                      </th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                        Ziyaret
                      </th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                        Son Aktivite
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentVisitors.map((visitor) => {
                      const isActive =
                        new Date(visitor.lastActivity).getTime() >
                        Date.now() - 5 * 60 * 1000;
                      return (
                        <tr
                          key={visitor.id}
                          className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                        >
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1.5">
                              {isActive && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              )}
                              <span>
                                {visitor.city && visitor.country
                                  ? `${visitor.city}, ${visitor.country}`
                                  : visitor.country || "Bilinmiyor"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className="truncate max-w-[200px] block"
                              title={visitor.currentPage}
                            >
                              {visitor.currentPage === "/"
                                ? "Ana Sayfa"
                                : visitor.currentPage}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-muted-foreground">
                            {visitor.device || "-"}
                          </td>
                          <td className="py-2.5 px-2 text-muted-foreground">
                            {visitor.browser || "-"}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <Badge variant="outline" className="text-[10px]">
                              {visitor.totalVisits}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">
                            {new Date(visitor.lastActivity).toLocaleTimeString(
                              "tr-TR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
