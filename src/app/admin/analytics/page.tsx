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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Eye, Activity, Users, Laptop, Globe, Cpu } from "lucide-react";
import { DashboardDonutChart } from "@/components/DashboardDonutChart";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  metrics: {
    totalVisits: number;
    avgDuration: number;
  };
  topArticles: Array<{
    id: string;
    title: string;
    slug: string;
    visits: string; // BigInt serialized as string
    avg_duration: number;
  }>;
  recentVisits: Array<{
    id: string;
    ipAddress: string;
    userAgent: string | null;
    duration: number;
    createdAt: string;
    article: {
      title: string;
      slug: string;
    };
  }>;
  stats: {
    browser: Array<{ name: string; value: number; percentage: number }>;
    device: Array<{ name: string; value: number; percentage: number }>;
    os: Array<{ name: string; value: number; percentage: number }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

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

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}dk ${sec}sn`;
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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Okuyucu <span className="text-primary italic">Analitiği</span>
          </h1>
          <p className="text-muted-foreground">
            Ziyaretçi davranışı ve içerik performansı
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">
                  Toplam Okuma
                </span>
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-black">
                {data?.metrics.totalVisits.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">
                  Ort. Okuma Süresi
                </span>
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-black">
                {formatDuration(data?.metrics.avgDuration || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">
                  Aktif Ziyaretçi
                </span>
                <Activity className="w-5 h-5 text-orange-500 animate-pulse" />
              </div>
              <div className="text-3xl font-black">
                {/* Real-time users requires websockets, putting placeholder/estimate */}
                ~
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Distribution Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Laptop className="h-4 w-4 text-blue-500" />
                Cihaz Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.stats?.device ? (
                <DashboardDonutChart data={data.stats.device} title="Cihaz" />
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  Yükleniyor...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                Tarayıcı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.stats?.browser ? (
                <DashboardDonutChart
                  data={data.stats.browser}
                  title="Tarayıcı"
                />
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  Yükleniyor...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-green-500" />
                İşletim Sistemi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.stats?.os ? (
                <DashboardDonutChart data={data.stats.os} title="OS" />
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  Yükleniyor...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Engaging Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                En Çok Okunan Haberler
              </CardTitle>
              <CardDescription>
                Ortalama kalma süresine göre sıralı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.topArticles.map((article, i) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {article.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Number(article.visits)} Ziyaret
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono ml-2 shrink-0"
                    >
                      {formatDuration(article.avg_duration)}
                    </Badge>
                  </div>
                ))}
                {(!data?.topArticles || data.topArticles.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground italic text-sm">
                    Henüz veri yok
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Visits Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Son Ziyaretler
              </CardTitle>
              <CardDescription>Gerçek zamanlı okuma kayıtları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                  {data?.recentVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="text-sm p-3 border-l-2 border-primary/20 pl-4 hover:bg-muted/30 transition-colors"
                    >
                      <p className="font-medium line-clamp-1 mb-1 text-primary">
                        {visit.article.title}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                            {visit.ipAddress}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(visit.createdAt).toLocaleTimeString(
                              "tr-TR",
                            )}
                          </span>
                        </div>
                        <span className="font-bold text-foreground">
                          {formatDuration(visit.duration)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!data?.recentVisits || data.recentVisits.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground italic text-sm">
                      Kayıt bulunamadı
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
