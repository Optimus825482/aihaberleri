"use client";

import { useEffect, useState, useCallback } from "react";
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
    PlayCircle,
    PauseCircle,
    RefreshCw,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Database,
    Search,
    Image,
    FileText,
    Filter,
    Copy,
    Globe,
    Bell,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface AgentStatus {
    name: string;
    displayName: string;
    icon: React.ElementType;
    status: "idle" | "running" | "success" | "error";
    queueCount: number;
    processedCount: number;
    lastRun: string | null;
    avgProcessingTime: number;
}

interface CircuitStatus {
    name: string;
    state: "CLOSED" | "OPEN" | "HALF_OPEN";
    failureRate: number;
    totalRequests: number;
    lastFailure: string | null;
}

interface ScheduleInfo {
    interval: number;
    reason: string;
    turkeyTime: string;
    nextRun: string;
    isWeekend: boolean;
    isBreakingNews: boolean;
}

interface PipelineStats {
    agents: AgentStatus[];
    circuits: CircuitStatus[];
    schedule: ScheduleInfo;
    totalArticlesToday: number;
    successRate: number;
    lastPipelineRun: string | null;
}

const AGENT_CONFIG: Record<string, { displayName: string; icon: React.ElementType }> = {
    "content-collector": { displayName: "İçerik Toplayıcı", icon: Globe },
    "relevance-filter": { displayName: "Alakalılık Filtresi", icon: Filter },
    "duplicate-detector": { displayName: "Duplikat Tespiti", icon: Copy },
    "content-enricher": { displayName: "İçerik Zenginleştirici", icon: Search },
    "visual-generator": { displayName: "Görsel Oluşturucu", icon: Image },
    "database-publisher": { displayName: "Yayınlayıcı", icon: Database },
};

export default function PipelineDashboard() {
    const [stats, setStats] = useState<PipelineStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const [breakingNewsMode, setBreakingNewsMode] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/pipeline/stats");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
                setBreakingNewsMode(data.schedule?.isBreakingNews || false);
            }
        } catch (error) {
            console.error("Failed to fetch pipeline stats:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        // Refresh every 10 seconds
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const triggerPipeline = async () => {
        setTriggering(true);
        try {
            await fetch("/api/agent/trigger", { method: "POST" });
            await fetchStats();
        } catch (error) {
            console.error("Failed to trigger pipeline:", error);
        } finally {
            setTriggering(false);
        }
    };

    const toggleBreakingNews = async () => {
        try {
            const response = await fetch("/api/admin/scheduler", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "breakingNews",
                    enabled: !breakingNewsMode,
                    durationMinutes: 60,
                }),
            });
            if (response.ok) {
                setBreakingNewsMode(!breakingNewsMode);
                await fetchStats();
            }
        } catch (error) {
            console.error("Failed to toggle breaking news mode:", error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "running":
                return "bg-blue-500 animate-pulse";
            case "success":
                return "bg-green-500";
            case "error":
                return "bg-red-500";
            default:
                return "bg-gray-400";
        }
    };

    const getCircuitColor = (state: string) => {
        switch (state) {
            case "CLOSED":
                return "bg-green-500/20 text-green-500 border-green-500/30";
            case "HALF_OPEN":
                return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
            case "OPEN":
                return "bg-red-500/20 text-red-500 border-red-500/30";
            default:
                return "bg-gray-500/20 text-gray-500 border-gray-500/30";
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Activity className="h-8 w-8 text-primary" />
                            Pipeline Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Multi-Agent haber pipeline durumu ve kontrolü
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant={breakingNewsMode ? "destructive" : "outline"}
                            onClick={toggleBreakingNews}
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            {breakingNewsMode ? "Breaking News AÇIK" : "Breaking News"}
                        </Button>
                        <Button onClick={triggerPipeline} disabled={triggering}>
                            {triggering ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <PlayCircle className="h-4 w-4 mr-2" />
                            )}
                            Pipeline Tetikle
                        </Button>
                    </div>
                </div>

                {/* Schedule Info */}
                <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Zamanlama Bilgisi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Türkiye Saati</p>
                                <p className="text-2xl font-bold">{stats?.schedule?.turkeyTime || "--:--"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Mevcut Slot</p>
                                <Badge variant="outline" className="mt-1">
                                    {stats?.schedule?.reason || "NORMAL"}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Interval</p>
                                <p className="text-2xl font-bold">{stats?.schedule?.interval || 15} dk</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Sonraki Çalışma</p>
                                <p className="text-lg font-medium">
                                    {stats?.schedule?.nextRun
                                        ? formatDistanceToNow(new Date(stats.schedule.nextRun), {
                                            addSuffix: true,
                                            locale: tr,
                                        })
                                        : "--"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Durum</p>
                                <div className="flex gap-2 mt-1">
                                    {stats?.schedule?.isWeekend && (
                                        <Badge variant="secondary">Hafta Sonu</Badge>
                                    )}
                                    {stats?.schedule?.isBreakingNews && (
                                        <Badge variant="destructive">🚨 Breaking</Badge>
                                    )}
                                    {!stats?.schedule?.isWeekend && !stats?.schedule?.isBreakingNews && (
                                        <Badge variant="outline">Normal</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Bugün Üretilen</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalArticlesToday || 0}</div>
                            <p className="text-xs text-muted-foreground">makale</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Başarı Oranı</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats?.successRate?.toFixed(1) || 0}%
                            </div>
                            <Progress value={stats?.successRate || 0} className="mt-2" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Son Çalışma</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-medium">
                                {stats?.lastPipelineRun
                                    ? formatDistanceToNow(new Date(stats.lastPipelineRun), {
                                        addSuffix: true,
                                        locale: tr,
                                    })
                                    : "Henüz yok"}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aktif Kuyruklar</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats?.agents?.reduce((sum, a) => sum + a.queueCount, 0) || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">işlem bekliyor</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Agent Pipeline */}
                <Card>
                    <CardHeader>
                        <CardTitle>Agent Pipeline Durumu</CardTitle>
                        <CardDescription>
                            6 aşamalı haber işleme pipeline'ı
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            {/* Pipeline Flow Visualization */}
                            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
                                {stats?.agents?.map((agent, index) => {
                                    const config = AGENT_CONFIG[agent.name] || {
                                        displayName: agent.name,
                                        icon: Activity,
                                    };
                                    const Icon = config.icon;

                                    return (
                                        <div key={agent.name} className="flex items-center">
                                            <div className="flex flex-col items-center min-w-[120px]">
                                                <div
                                                    className={`p-3 rounded-full ${agent.status === "running"
                                                            ? "bg-blue-500/20 ring-2 ring-blue-500"
                                                            : agent.status === "error"
                                                                ? "bg-red-500/20"
                                                                : "bg-muted"
                                                        }`}
                                                >
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <p className="text-sm font-medium mt-2 text-center">
                                                    {config.displayName}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {agent.status}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Kuyruk: {agent.queueCount} | İşlenen: {agent.processedCount}
                                                </div>
                                            </div>
                                            {index < (stats?.agents?.length || 0) - 1 && (
                                                <div className="w-8 h-0.5 bg-muted-foreground/30 mx-2" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Circuit Breakers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Circuit Breaker Durumu
                        </CardTitle>
                        <CardDescription>
                            API dayanıklılık devreleri
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                            {stats?.circuits?.map((circuit) => (
                                <div
                                    key={circuit.name}
                                    className="p-4 rounded-lg border bg-card"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium capitalize">{circuit.name}</span>
                                        <Badge className={getCircuitColor(circuit.state)}>
                                            {circuit.state}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <p>Hata Oranı: {circuit.failureRate.toFixed(1)}%</p>
                                        <p>Toplam İstek: {circuit.totalRequests}</p>
                                        {circuit.lastFailure && (
                                            <p className="text-xs">
                                                Son Hata:{" "}
                                                {formatDistanceToNow(new Date(circuit.lastFailure), {
                                                    addSuffix: true,
                                                    locale: tr,
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Agent Details Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Agent Detayları</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">Agent</th>
                                        <th className="text-left py-3 px-4">Durum</th>
                                        <th className="text-center py-3 px-4">Kuyruk</th>
                                        <th className="text-center py-3 px-4">İşlenen</th>
                                        <th className="text-center py-3 px-4">Ort. Süre</th>
                                        <th className="text-left py-3 px-4">Son Çalışma</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.agents?.map((agent) => {
                                        const config = AGENT_CONFIG[agent.name] || {
                                            displayName: agent.name,
                                            icon: Activity,
                                        };
                                        const Icon = config.icon;

                                        return (
                                            <tr key={agent.name} className="border-b hover:bg-muted/50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{config.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                                                        <span className="capitalize">{agent.status}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Badge variant="outline">{agent.queueCount}</Badge>
                                                </td>
                                                <td className="py-3 px-4 text-center">{agent.processedCount}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {agent.avgProcessingTime > 0
                                                        ? `${(agent.avgProcessingTime / 1000).toFixed(1)}s`
                                                        : "-"}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">
                                                    {agent.lastRun
                                                        ? formatDistanceToNow(new Date(agent.lastRun), {
                                                            addSuffix: true,
                                                            locale: tr,
                                                        })
                                                        : "Henüz yok"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
