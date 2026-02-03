"use client";

import { useEffect, useState } from "react";
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
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Target,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface SEOStats {
  totalArticles: number;
  averageScore: number;
  articlesWithRecommendations: number;
  totalRecommendations: number;
  resolvedRecommendations: number;
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  recommendationTypes: Array<{
    type: string;
    count: number;
  }>;
  lowestScoringArticles: Array<{
    id: string;
    title: string;
    slug: string;
    seoScore: number;
    recommendationCount: number;
  }>;
}

const SCORE_COLORS = {
  excellent: "#22c55e", // green-500
  good: "#84cc16", // lime-500
  fair: "#eab308", // yellow-500
  poor: "#f97316", // orange-500
  critical: "#ef4444", // red-500
};

const RECOMMENDATION_COLORS = [
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
];

export default function SEODashboardPage() {
  const [stats, setStats] = useState<SEOStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();

    // Auto-refresh her 30 saniyede bir
    const interval = setInterval(() => {
      fetchStats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const response = await fetch("/api/admin/seo/stats");
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("SEO istatistikleri yüklenemedi:", error);
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              SEO Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Makale SEO performansını izleyin ve optimize edin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats()}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Yenile
            </Button>
            <Link href="/admin/seo/bulk-actions">
              <Button>
                <BarChart3 className="h-4 w-4 mr-2" />
                Toplu İşlemler
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ortalama Skor
                </span>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums">
                {stats?.averageScore.toFixed(0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.totalArticles || 0} makale
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Çözülen Öneriler
                </span>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums">
                {stats?.resolvedRecommendations || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Toplam {stats?.totalRecommendations || 0} öneri
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bekleyen Öneriler
                </span>
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums">
                {(stats?.totalRecommendations || 0) -
                  (stats?.resolvedRecommendations || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.articlesWithRecommendations || 0} makalede
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  İyileştirme Oranı
                </span>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Target className="h-4 w-4 text-purple-500" />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums">
                {stats?.totalRecommendations
                  ? (
                      ((stats.resolvedRecommendations || 0) /
                        stats.totalRecommendations) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Çözülme oranı
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Skor Dağılımı
              </CardTitle>
              <CardDescription>
                Makalelerin SEO skorlarına göre dağılımı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.scoreDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    opacity={0.5}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    opacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {stats?.scoreDistribution.map((_entry, index) => {
                      let color = SCORE_COLORS.critical;
                      if (_entry.range.includes("90-100"))
                        color = SCORE_COLORS.excellent;
                      else if (_entry.range.includes("70-89"))
                        color = SCORE_COLORS.good;
                      else if (_entry.range.includes("50-69"))
                        color = SCORE_COLORS.fair;
                      else if (_entry.range.includes("30-49"))
                        color = SCORE_COLORS.poor;

                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recommendation Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Öneri Türleri
              </CardTitle>
              <CardDescription>
                En sık karşılaşılan SEO sorunları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.recommendationTypes || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percent }) =>
                      `${type}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats?.recommendationTypes.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          RECOMMENDATION_COLORS[
                            index % RECOMMENDATION_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Lowest Scoring Articles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Dikkat Gereken Makaleler
            </CardTitle>
            <CardDescription>
              En düşük SEO skoruna sahip makaleler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.lowestScoringArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`font-bold tabular-nums ${
                          article.seoScore >= 70
                            ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                            : article.seoScore >= 50
                              ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
                              : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                        }`}
                      >
                        {article.seoScore}
                      </Badge>
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="font-medium hover:text-primary transition-colors line-clamp-1"
                      >
                        {article.title}
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {article.recommendationCount} öneri bekliyor
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/news/${article.slug}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/articles/${article.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Düzenle
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {(!stats?.lowestScoringArticles ||
                stats.lowestScoringArticles.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>Tüm makaleler iyi durumda!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
