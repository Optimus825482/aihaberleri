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
    Settings as SettingsIcon,
    ShieldCheck,
    ShieldAlert,
    Clock,
    Play,
    Loader2,
    Newspaper,
} from "lucide-react";
import Link from "next/link";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { AgentPipelineStepper } from "@/components/admin/AgentPipelineStepper";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface DashboardStats {
    metrics: {
        totalArticles: number;
        totalViews: number;
        todayArticles: number;
        todayViews: number;
        publishedArticles: number;
        draftArticles: number;
        activeVisitors: number;
    };
    charts: {
        pipelineActivity: Array<{
            time: string;
            articles: number;
            views: number;
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
        intervalHours: number;
    };
    queue: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
}

export default function AdminDashboard() {
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const refreshInterval = useRef<NodeJS.Timeout | null>(null);

    const isAgentEnabled = agentStats?.agent.enabled ?? false;

    useEffect(() => {
        fetchAllStats();

        // Realtime refresh every 30 seconds
        refreshInterval.current = setInterval(() => {
            fetchAllStats(true);
        }, 30000);

        return () => {
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, []);

    const fetchAllStats = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

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
            setRefreshing(false);
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

    return (
        <AdminLayout>
            <div className="space-y-6">
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
                        {refreshing && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        <Link href="/admin/articles/create">
                            <Button className="font-bold">
                                <FileText className="mr-2 h-4 w-4" />
                                Yeni Haber
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Main Metrics - 4 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Bugün Yayınlanan */}
                    <Card className="relative overflow-hidden border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
                        <CardContent className="p-5 relative">
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Bugün Yayınlanan
                                </span>
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-green-500 tabular-nums">
                                {dashboardStats?.metrics.todayArticles || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                haber bugün eklendi
                            </p>
                        </CardContent>
                    </Card>

                    {/* Toplam Yayınlanan */}
                    <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
                        <CardContent className="p-5 relative">
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Toplam Yayınlanan
                                </span>
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Newspaper className="h-4 w-4 text-blue-500" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-blue-500 tabular-nums">
                                {dashboardStats?.metrics.publishedArticles || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                haber yayında
                            </p>
                        </CardContent>
                    </Card>

                    {/* Bugün Okuma */}
                    <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
                        <CardContent className="p-5 relative">
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Bugün Okuma
                                </span>
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Eye className="h-4 w-4 text-purple-500" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-purple-500 tabular-nums">
                                {dashboardStats?.metrics.todayViews?.toLocaleString("tr-TR") || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                görüntülenme bugün
                            </p>
                        </CardContent>
                    </Card>

                    {/* Toplam Okuma */}
                    <Card className="relative overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />
                        <CardContent className="p-5 relative">
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Toplam Okuma
                                </span>
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Activity className="h-4 w-4 text-orange-500" />
                                </div>
                            </div>
                            <div className="text-4xl font-black text-orange-500 tabular-nums">
                                {dashboardStats?.metrics.totalViews?.toLocaleString("tr-TR") || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                toplam görüntülenme
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Agent Pipeline Stepper - Real-time Progress */}
                <AgentPipelineStepper />

                {/* Pipeline Status & Otonom Sistem */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pipeline Activity Chart */}
                    <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <Activity className="h-4 w-4 text-cyan-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase tracking-tight">
                                        Pipeline Aktivitesi
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Son 24 saat haber ve okuma grafiği
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={dashboardStats?.charts?.pipelineActivity || []}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="time"
                                            stroke="#6b7280"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#6b7280"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                                fontSize: "12px",
                                            }}
                                            labelStyle={{ color: "hsl(var(--foreground))" }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="articles"
                                            name="Haberler"
                                            stroke="#06b6d4"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorArticles)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="views"
                                            name="Okumalar"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorViews)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Otonom Sistem Durumu */}
                    <Card
                        className={`border-2 overflow-hidden ${isAgentEnabled
                            ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
                            : "border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent"
                            }`}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`p-2 rounded-lg ${isAgentEnabled ? "bg-primary/10" : "bg-destructive/10"
                                            }`}
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
                                            Dinamik & Realtime Pipeline
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
                                    {/* Last Execution */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Son Çalışma</span>
                                        </div>
                                        <span className="text-sm font-bold">
                                            {agentStats?.agent.lastExecution
                                                ? formatDistanceToNow(
                                                    new Date(agentStats.agent.lastExecution),
                                                    { addSuffix: true, locale: tr }
                                                )
                                                : "Henüz çalışmadı"}
                                        </span>
                                    </div>

                                    {/* Next Run Countdown */}
                                    <div className="relative p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
                                        <div className="relative text-center">
                                            <span className="text-xs font-bold uppercase tracking-widest text-primary/60 block mb-2">
                                                Sonraki Çalışma
                                            </span>
                                            {agentStats?.agent.nextRun ? (
                                                <CountdownTimer
                                                    targetTimestamp={agentStats.agent.nextRun}
                                                    onComplete={() => fetchAllStats()}
                                                    className="text-4xl font-black tabular-nums text-primary"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 text-primary">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span className="text-lg font-bold">Planlanıyor...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Queue Status */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { label: "Bekleyen", value: agentStats?.queue.waiting || 0, color: "text-yellow-500" },
                                            { label: "Aktif", value: agentStats?.queue.active || 0, color: "text-blue-500" },
                                            { label: "Tamamlanan", value: agentStats?.queue.completed || 0, color: "text-green-500" },
                                            { label: "Başarısız", value: agentStats?.queue.failed || 0, color: "text-red-500" },
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
                                            Agent'ı Aktif Et
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
