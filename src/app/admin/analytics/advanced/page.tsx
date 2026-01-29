"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    TrendingUp,
    Eye,
    FileText,
    Award,
    BarChart3,
    Calendar,
    Download,
} from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { ExportButton } from "@/components/admin/ExportButton";
import { AnalyticsReportBuilder } from "@/components/admin/AnalyticsReportBuilder";
import { exportArticlesToExcel, exportAnalyticsToExcel } from "@/lib/excel-export";
import { exportAnalyticsReportToPDF } from "@/lib/pdf-export";
import { exportChartToPNG, exportChartToSVG } from "@/lib/chart-export";
import { DashboardSkeleton } from "@/components/admin/SkeletonLoaders";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface AnalyticsData {
    summary: {
        totalArticles: number;
        publishedArticles: number;
        totalViews: number;
        averageScore: number;
        totalVisitors: number;
    };
    viewsOverTime: Array<{ date: string; views: number }>;
    categoryStats: Array<{ name: string; count: number; views: number }>;
    topArticles: Array<{
        id: string;
        title: string;
        views: number;
        score: number;
    }>;
    trafficSources: Array<{ source: string; visitors: number }>;
}

export default function AdvancedAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await fetch("/api/admin/analytics/advanced");
            if (!response.ok) throw new Error("Failed to fetch analytics");
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Analytics fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (!data) return;

        exportAnalyticsToExcel({
            summary: data.summary,
            articles: data.topArticles,
            categories: data.categoryStats,
        });
    };

    const handleExportPDF = async () => {
        if (!data) return;

        exportAnalyticsReportToPDF({
            summary: data.summary,
            topArticles: data.topArticles,
            categoryStats: data.categoryStats,
        });
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (!data) {
        return <div>Veri yüklenemedi</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Gelişmiş Analytics</h1>
                    <p className="text-muted-foreground">
                        Detaylı performans analizi ve raporlar
                    </p>
                </div>
                <ExportButton
                    onExportExcel={handleExportExcel}
                    onExportPDF={handleExportPDF}
                />
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Toplam Makale
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalArticles}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.summary.publishedArticles} yayında
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Toplam Görüntülenme
                        </CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.summary.totalViews.toLocaleString("tr-TR")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round(data.summary.totalViews / data.summary.totalArticles)} ort/makale
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Ortalama Skor
                        </CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.summary.averageScore.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            İçerik kalitesi
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Toplam Ziyaretçi
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.summary.totalVisitors.toLocaleString("tr-TR")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Benzersiz kullanıcı
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Dönüşüm Oranı
                        </CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {((data.summary.totalViews / data.summary.totalVisitors) * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Views / Visitor
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Report Builder */}
            <AnalyticsReportBuilder />

            {/* Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Views Over Time */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Görüntüleme Trendi</CardTitle>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => exportChartToPNG("views-chart", "views_trend")}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    PNG
                                </button>
                                <button
                                    onClick={() => exportChartToSVG("views-chart", "views_trend")}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    SVG
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div id="views-chart">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data.viewsOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="views"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        name="Görüntülenme"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Kategori Dağılımı</CardTitle>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => exportChartToPNG("category-chart", "category_distribution")}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    PNG
                                </button>
                                <button
                                    onClick={() => exportChartToSVG("category-chart", "category_distribution")}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    SVG
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div id="category-chart">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data.categoryStats}
                                        dataKey="count"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {data.categoryStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Articles */}
                <Card>
                    <CardHeader>
                        <CardTitle>En Popüler Makaleler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div id="top-articles-chart">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={data.topArticles.slice(0, 5)}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="title" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="views" fill="#3b82f6" name="Görüntülenme" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Traffic Sources */}
                <Card>
                    <CardHeader>
                        <CardTitle>Trafik Kaynakları</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div id="traffic-sources-chart">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={data.trafficSources}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="source" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="visitors" fill="#10b981" name="Ziyaretçi" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
