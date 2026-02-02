"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Globe,
  Activity,
  Monitor,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Visitor {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  currentPage: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  provider: string | null;
  lastActivity: string;
  createdAt: string;
  flag: string;
  location: string;
}

interface VisitorsData {
  visitors: Visitor[];
  stats: {
    total: number;
    active: number;
    uniqueCountries: number;
  };
}

export default function VisitorsPageOptimized() {
  const [data, setData] = useState<VisitorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Memoized helper functions to prevent re-creation on every render
  const getDeviceType = useCallback((userAgent: string | null): string => {
    if (!userAgent) return "Unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android")) return "Mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) return "Tablet";
    return "Desktop";
  }, []);

  const getBrowser = useCallback((userAgent: string | null): string => {
    if (!userAgent) return "Unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("chrome")) return "Chrome";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("safari")) return "Safari";
    if (ua.includes("edge")) return "Edge";
    if (ua.includes("opera")) return "Opera";
    return "Other";
  }, []);

  const getTimeAgo = useCallback((timestamp: string): string => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000,
    );

    if (seconds < 60) return `${seconds}s önce`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}dk önce`;
    return `${Math.floor(seconds / 3600)}sa önce`;
  }, []);

  // Fetch visitors with error handling and loading states
  const fetchVisitors = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      const response = await fetch("/api/admin/visitors", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error || "Failed to fetch visitors");
      }
    } catch (error) {
      console.error("Failed to fetch visitors:", error);
      toast.error("Ziyaretçiler yüklenemedi", {
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    fetchVisitors(true);
    toast.success("Yenileniyor...");
  }, [fetchVisitors]);

  // Cleanup old visitors
  const handleCleanup = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/visitors", {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.count} eski ziyaretçi silindi`);
        fetchVisitors(true);
      } else {
        throw new Error(result.error || "Cleanup failed");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      toast.error("Temizleme başarısız", {
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    }
  }, [fetchVisitors]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchVisitors();

    if (!autoRefresh) return;

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchVisitors();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchVisitors]);

  // Memoized country distribution to avoid recalculation
  const countryDistribution = useMemo(() => {
    if (!data?.visitors.length) return [];

    const distribution = data.visitors.reduce(
      (acc, visitor) => {
        const country = visitor.country || "Unknown";
        const flag = visitor.flag;
        const key = `${flag} ${country}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(distribution).sort(([, a], [, b]) => b - a);
  }, [data?.visitors]);

  // Stats cards configuration
  const statsCards = useMemo(
    () => [
      {
        label: "Aktif Ziyaretçi",
        value: data?.stats.active || 0,
        icon: Activity,
        gradient: "from-green-500/20 to-green-600/10",
        iconBg: "bg-green-500/10",
        iconColor: "text-green-500",
        border: "border-green-500/20",
      },
      {
        label: "Toplam Ziyaretçi",
        value: data?.stats.total || 0,
        icon: Users,
        gradient: "from-blue-500/20 to-blue-600/10",
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        border: "border-blue-500/20",
      },
      {
        label: "Farklı Ülke",
        value: data?.stats.uniqueCountries || 0,
        icon: Globe,
        gradient: "from-purple-500/20 to-purple-600/10",
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-500",
        border: "border-purple-500/20",
      },
    ],
    [data?.stats],
  );

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

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header - Cyberpunk Style */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 p-8">
          {/* Animated Background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-1 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
                <div>
                  <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-2">
                    Anlık{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500 italic">
                      Ziyaretçiler
                    </span>
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    Son 5 dakikadaki aktif kullanıcılar
                    {lastUpdate && (
                      <span className="ml-2 text-xs">
                        • Son güncelleme:{" "}
                        {lastUpdate.toLocaleTimeString("tr-TR")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                {autoRefresh ? "Otomatik" : "Manuel"}
              </Button>

              {/* Manual refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Yenile
              </Button>

              {/* Cleanup */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanup}
                className="gap-2 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Temizle
              </Button>

              {/* Live Indicator */}
              <div className="flex items-center gap-3 bg-green-500/10 px-6 py-3 rounded-full border border-green-500/20">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full relative z-10" />
                  <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                </div>
                <span className="text-sm font-black text-green-500 uppercase tracking-wider">
                  CANLI
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Enhanced Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statsCards.map((stat, i) => (
            <Card
              key={i}
              className={`relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${stat.gradient} border ${stat.border} hover:scale-105 transition-all duration-300 group cursor-pointer`}
            >
              {/* Glow Effect */}
              <div
                className={`absolute inset-0 ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity blur-xl`}
              />

              <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {stat.label}
                  </span>
                  <div
                    className={`p-2 ${stat.iconBg} rounded-lg group-hover:scale-110 transition-transform`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </div>
                <div className="text-3xl font-black tabular-nums">
                  {stat.value}
                </div>

                {/* Animated Progress Bar */}
                <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${stat.gradient} animate-pulse w-[70%]`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visitors List - Enhanced */}
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
          <CardHeader className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-xl">
                  <Users className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">
                    Aktif Ziyaretçiler
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                    {data?.visitors.length || 0} aktif kullanıcı
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-3">
              {data?.visitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className="flex items-center gap-4 p-4 border border-white/10 rounded-xl hover:border-green-500/50 hover:bg-white/5 transition-all duration-300 group"
                >
                  {/* Flag & Location */}
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {visitor.flag}
                    </span>
                    <div>
                      <p className="font-bold text-sm group-hover:text-green-500 transition-colors">
                        {visitor.location || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {visitor.ipAddress}
                      </p>
                      {visitor.isp && (
                        <p className="text-[10px] text-violet-500 font-medium mt-0.5 flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5" />
                          {visitor.isp}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Current Page */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider">
                      Sayfa
                    </p>
                    <p
                      className="text-sm truncate font-medium"
                      title={visitor.currentPage}
                    >
                      {visitor.currentPage}
                    </p>
                    {visitor.timezone && (
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        🕐 {visitor.timezone}
                      </p>
                    )}
                  </div>

                  {/* Device & Browser */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-white/20 bg-white/5"
                    >
                      <Monitor className="h-3 w-3 mr-1" />
                      {getDeviceType(visitor.userAgent)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-white/20 bg-white/5"
                    >
                      {getBrowser(visitor.userAgent)}
                    </Badge>
                    {visitor.provider && (
                      <Badge
                        variant="outline"
                        className="text-xs border-green-500/30 bg-green-500/10 text-green-500"
                        title={`Geolocation provider: ${visitor.provider}`}
                      >
                        {visitor.provider === "ipwho"
                          ? "🔍 ipwho"
                          : "⚡ ip-api"}
                      </Badge>
                    )}
                  </div>

                  {/* Last Activity */}
                  <div className="text-right min-w-[80px]">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider">
                      Son Aktivite
                    </p>
                    <p className="text-sm font-black text-green-500 tabular-nums">
                      {getTimeAgo(visitor.lastActivity)}
                    </p>
                  </div>
                </div>
              ))}

              {data?.visitors.length === 0 && (
                <div className="text-center py-16">
                  <div className="relative inline-block">
                    <Users className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                    <div className="absolute inset-0 bg-muted-foreground/10 blur-xl" />
                  </div>
                  <p className="text-muted-foreground font-bold">
                    Şu anda aktif ziyaretçi yok
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {autoRefresh
                      ? "Sayfa otomatik olarak güncelleniyor..."
                      : "Manuel yenileme aktif"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Country Distribution - Enhanced */}
        {countryDistribution.length > 0 && (
          <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                  <Globe className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">
                    Ülke Dağılımı
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                    Aktif ziyaretçilerin ülkelere göre dağılımı
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {countryDistribution.map(([country, count]) => (
                  <div
                    key={country}
                    className="flex items-center gap-3 p-4 border border-white/10 rounded-xl hover:border-violet-500/50 hover:bg-white/5 transition-all duration-300 group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {country.split(" ")[0]}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold group-hover:text-violet-500 transition-colors">
                        {country.split(" ").slice(1).join(" ")}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {count} ziyaretçi
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
