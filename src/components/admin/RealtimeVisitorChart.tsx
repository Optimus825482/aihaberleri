"use client";

import { memo, useEffect, useState, useCallback } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    RefreshCw,
    Zap,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────
interface RealtimeData {
    activeUsers: number;
    minuteData: Array<{ minutesAgo: number; users: number }>;
    topPages: Array<{ page: string; users: number }>;
    devices: Array<{ device: string; users: number }>;
    countries: Array<{ country: string; users: number }>;
}

// ─── Device Icon Helper ──────────────────────────────────
const deviceIcons: Record<string, React.ElementType> = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
};

const deviceLabels: Record<string, string> = {
    desktop: "Masaüstü",
    mobile: "Mobil",
    tablet: "Tablet",
};

// ─── Custom Tooltip ──────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs">
            <p className="text-muted-foreground font-medium mb-1">{label}</p>
            <p className="font-black text-emerald-400">
                {payload[0].value} aktif kullanıcı
            </p>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────
function RealtimeVisitorChart() {
    const [data, setData] = useState<RealtimeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/analytics/ga4-realtime");
            if (!res.ok) throw new Error("Failed");
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
                setError(false);
                setLastUpdate(new Date());
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // İlk yükleme + 30 saniyede bir
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Chart data format: minutesAgo 29→0 arası, label olarak "29dk önce" → "Şimdi"
    const chartData = (data?.minuteData || []).map((d) => ({
        label: d.minutesAgo === 0 ? "Şimdi" : `${d.minutesAgo}dk`,
        users: d.users,
    }));

    const totalDeviceUsers = (data?.devices || []).reduce(
        (sum, d) => sum + d.users,
        0,
    );

    return (
        <Card className="border-emerald-500/20 bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative p-2 bg-emerald-500/10 rounded-xl">
                            <Zap className="h-4 w-4 text-emerald-500" />
                            {/* Pulse animation when live */}
                            {data && data.activeUsers > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-tight">
                                Canlı Ziyaretçiler
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                                GA4 Realtime • Son 30 dakika
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {lastUpdate && (
                            <span className="text-[9px] text-muted-foreground hidden sm:block">
                                {lastUpdate.toLocaleTimeString("tr-TR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                })}
                            </span>
                        )}
                        <button
                            onClick={fetchData}
                            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                            title="Yenile"
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`}
                            />
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 space-y-3">
                {/* Loading state */}
                {loading && !data && (
                    <div className="h-[180px] flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                    </div>
                )}

                {/* Error state */}
                {error && !data && (
                    <div className="h-[180px] flex flex-col items-center justify-center gap-2">
                        <p className="text-xs text-muted-foreground">
                            GA4 verisi alınamadı
                        </p>
                        <button
                            onClick={fetchData}
                            className="text-xs text-primary hover:underline"
                        >
                            Tekrar dene
                        </button>
                    </div>
                )}

                {data && (
                    <>
                        {/* Big Active Users Number */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl sm:text-5xl font-black text-emerald-500 tabular-nums leading-none">
                                    {data.activeUsers}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground uppercase">
                                    aktif
                                </span>
                            </div>
                            {/* Device breakdown badges */}
                            <div className="flex flex-wrap gap-1 justify-end">
                                {data.devices.map((d) => {
                                    const Icon = deviceIcons[d.device.toLowerCase()] || Globe;
                                    const label =
                                        deviceLabels[d.device.toLowerCase()] || d.device;
                                    const pct =
                                        totalDeviceUsers > 0
                                            ? Math.round((d.users / totalDeviceUsers) * 100)
                                            : 0;
                                    return (
                                        <Badge
                                            key={d.device}
                                            variant="outline"
                                            className="text-[9px] h-5 px-1.5 gap-1 border-emerald-500/20"
                                        >
                                            <Icon className="h-2.5 w-2.5" />
                                            {label} {pct}%
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Area Chart — Son 30 dakika */}
                        <div className="h-[140px] sm:h-[160px] w-full -mx-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="realtimeGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#10b981"
                                                stopOpacity={0.4}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#10b981"
                                                stopOpacity={0.02}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="label"
                                        stroke="#6b7280"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                        tick={{ fontSize: 9 }}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="users"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#realtimeGradient)"
                                        dot={false}
                                        activeDot={{
                                            r: 4,
                                            stroke: "#10b981",
                                            strokeWidth: 2,
                                            fill: "#fff",
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Pages — Collapsible on mobile */}
                        {data.topPages.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Aktif Sayfalar
                                </p>
                                <div className="space-y-1">
                                    {data.topPages.slice(0, 5).map((p, i) => {
                                        const maxUsers = data.topPages[0]?.users || 1;
                                        const pct = Math.round((p.users / maxUsers) * 100);
                                        return (
                                            <div key={i} className="flex items-center gap-2 group">
                                                <div className="flex-1 min-w-0">
                                                    <div className="relative h-6 rounded-md overflow-hidden bg-muted/20">
                                                        <div
                                                            className="absolute inset-y-0 left-0 bg-emerald-500/15 rounded-md transition-all duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium truncate">
                                                            {p.page}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-500 shrink-0 w-6 text-right tabular-nums">
                                                    {p.users}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Countries — Compact pills */}
                        {data.countries.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {data.countries.slice(0, 6).map((c, i) => (
                                    <Badge
                                        key={i}
                                        variant="outline"
                                        className="text-[9px] h-5 px-1.5 gap-1 border-muted-foreground/20"
                                    >
                                        <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                                        {c.country}{" "}
                                        <span className="font-black text-foreground">
                                            {c.users}
                                        </span>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default memo(RealtimeVisitorChart);
