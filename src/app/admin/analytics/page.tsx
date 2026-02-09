"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
    Activity,
    Users,
    MapPin,
    TrendingUp,
    Trophy,
    Tags,
    Globe,
    ArrowRight,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface AnalyticsData {
    metrics: {
        totalVisits: number;
        avgDuration: number;
    };
    topArticles: Array<{
        id: string;
        title: string;
        slug: string;
        visits: string;
        avg_duration: number;
        imageUrl?: string;
    }>;
    topCategories: Array<{
        name: string;
        slug: string;
        visits: number;
        articleCount: number;
    }>;
    stats: {
        country: Array<{ name: string; value: number; percentage: number }>;
    };
}

interface RealtimeVisitor {
    id: string;
    page: string;
    location: string;
    flag: string;
    country: string;
    city: string;
    lastActivity: string;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeVisitors, setActiveVisitors] = useState<RealtimeVisitor[]>([]);
    const [visitorCount, setVisitorCount] = useState(0);
    const eventSourceRef = useRef<EventSource | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    // Realtime visitor connection
    const connectRealtime = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource("/api/admin/realtime");
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed.visitors) {
                    setActiveVisitors(parsed.visitors.list || []);
                    setVisitorCount(parsed.visitors.active || 0);
                }
            } catch (e) {
                console.error("Failed to parse realtime data:", e);
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            eventSource.close();
            setTimeout(connectRealtime, 5000);
        };
    }, []);

    useEffect(() => {
        connectRealtime();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [connectRealtime]);

    const fetchAnalytics = async () => {
        try {
            const response = await fetch("/api/admin/analytics");
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight">
                        Okuyucu <span className="text-primary italic">Analitiği</span>
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Ziyaretçi davranışı ve içerik performansı
                    </p>
                </div>

                {/* Realtime Visitors Section */}
                <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Activity className="h-4 w-4 text-green-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase">
                                        Anlık Ziyaretçiler
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Şu anda sitede bulunan kullanıcılar
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className={cn(
                                        "h-2 w-2 rounded-full animate-pulse",
                                        isConnected ? "bg-green-500" : "bg-red-500"
                                    )}
                                />
                                <span className="text-4xl font-black text-green-500">
                                    {visitorCount}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {activeVisitors.length > 0 ? (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {activeVisitors.map((visitor) => (
                                    <div
                                        key={visitor.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{visitor.flag || "🌍"}</span>
                                            <div>
                                                <p className="text-sm font-medium line-clamp-1">
                                                    {visitor.page}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {visitor.city || visitor.country || visitor.location}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {visitor.country || "Bilinmiyor"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Şu anda aktif ziyaretçi yok</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Grid: Top 5 Articles + Top 3 Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* En Çok Okunan 5 Haber */}
                    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Trophy className="h-4 w-4 text-purple-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase">
                                        En Çok Okunan 5 Haber
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Tüm zamanların en popüler içerikleri
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data?.topArticles?.slice(0, 5).map((article, i) => (
                                    <div
                                        key={article.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                                                i === 0
                                                    ? "bg-yellow-500/20 text-yellow-500"
                                                    : i === 1
                                                        ? "bg-gray-400/20 text-gray-400"
                                                        : i === 2
                                                            ? "bg-orange-500/20 text-orange-500"
                                                            : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm line-clamp-1">
                                                {article.title}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm font-bold text-purple-500">
                                            <Eye className="h-4 w-4" />
                                            {Number(article.visits).toLocaleString("tr-TR")}
                                        </div>
                                    </div>
                                ))}
                                {(!data?.topArticles || data.topArticles.length === 0) && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Henüz veri yok</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* En Çok Okunan 3 Kategori */}
                    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Tags className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase">
                                        En Popüler 3 Kategori
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        En çok okunan haber kategorileri
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data?.topCategories?.slice(0, 3).map((category, i) => (
                                    <div
                                        key={category.slug}
                                        className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                                                        i === 0
                                                            ? "bg-yellow-500/20 text-yellow-500"
                                                            : i === 1
                                                                ? "bg-gray-400/20 text-gray-400"
                                                                : "bg-orange-500/20 text-orange-500"
                                                    )}
                                                >
                                                    {i + 1}
                                                </div>
                                                <span className="font-bold">{category.name}</span>
                                            </div>
                                            <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                                                {category.articleCount} haber
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Eye className="h-3 w-3" />
                                            <span className="font-medium">
                                                {category.visits?.toLocaleString("tr-TR") || 0} okuma
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!data?.topCategories || data.topCategories.length === 0) && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Henüz veri yok</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Ziyaretçi Lokasyon Pasta Grafiği */}
                <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Globe className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-black uppercase">
                                    Ziyaretçi Lokasyonları
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Ülkelere göre ziyaretçi dağılımı
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Pie Chart */}
                            <div className="h-[250px]">
                                {data?.stats?.country && data.stats.country.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.stats.country.slice(0, 6)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {data.stats.country.slice(0, 6).map((_, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "hsl(var(--card))",
                                                    border: "1px solid hsl(var(--border))",
                                                    borderRadius: "8px",
                                                    fontSize: "12px",
                                                }}
                                                formatter={(value: number, name: string) => [
                                                    `${value} ziyaretçi`,
                                                    name,
                                                ]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Veri toplanıyor...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="space-y-2">
                                {data?.stats?.country?.slice(0, 6).map((country, i) => (
                                    <div
                                        key={country.name}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                            />
                                            <span className="font-medium">{country.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold">
                                                {country.value.toLocaleString("tr-TR")}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {country.percentage.toFixed(1)}%
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Links to Detail Pages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                        href="/admin/views"
                        className="group flex items-center justify-between p-5 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent hover:from-blue-500/10 hover:border-blue-500/40 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                <BarChart3 className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Okunma Takibi</h3>
                                <p className="text-xs text-muted-foreground">
                                    Saatlik/günlük grafikler, kategori dağılımı, trend analizi
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </a>
                    <a
                        href="/admin/visitors"
                        className="group flex items-center justify-between p-5 rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:from-green-500/10 hover:border-green-500/40 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                <Users className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Ziyaretçi Detayları</h3>
                                <p className="text-xs text-muted-foreground">
                                    IP adresleri, cihaz bilgileri, ISP, ülke dağılımı
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                    </a>
                </div>
            </div>
        </AdminLayout>
    );
}
