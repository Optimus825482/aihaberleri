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
import { Users, Globe, Activity, Monitor } from "lucide-react";

interface Visitor {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  currentPage: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
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

export default function VisitorsPage() {
  const [data, setData] = useState<VisitorsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitors();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchVisitors, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchVisitors = async () => {
    try {
      const response = await fetch("/api/admin/visitors");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch visitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceType = (userAgent: string | null): string => {
    if (!userAgent) return "Unknown";

    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android")) return "Mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) return "Tablet";
    return "Desktop";
  };

  const getBrowser = (userAgent: string | null): string => {
    if (!userAgent) return "Unknown";

    const ua = userAgent.toLowerCase();
    if (ua.includes("chrome")) return "Chrome";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("safari")) return "Safari";
    if (ua.includes("edge")) return "Edge";
    if (ua.includes("opera")) return "Opera";
    return "Other";
  };

  const getTimeAgo = (timestamp: string): string => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000,
    );

    if (seconds < 60) return `${seconds}s önce`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}dk önce`;
    return `${Math.floor(seconds / 3600)}sa önce`;
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
              Anlık <span className="text-primary italic">Ziyaretçiler</span>
            </h1>
            <p className="text-muted-foreground">
              Son 5 dakikadaki aktif kullanıcılar • Otomatik güncelleme: 10sn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-green-500">CANLI</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Aktif Ziyaretçi",
              value: data?.stats.active || 0,
              icon: Activity,
              color: "text-green-500",
            },
            {
              label: "Toplam Ziyaretçi",
              value: data?.stats.total || 0,
              icon: Users,
              color: "text-blue-500",
            },
            {
              label: "Farklı Ülke",
              value: data?.stats.uniqueCountries || 0,
              icon: Globe,
              color: "text-purple-500",
            },
          ].map((stat, i) => (
            <Card key={i} className="bg-card/40 border-primary/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-black">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visitors List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-black">
              Aktif Ziyaretçiler
            </CardTitle>
            <CardDescription>
              {data?.visitors.length || 0} aktif kullanıcı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.visitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  {/* Flag & Location */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-3xl">{visitor.flag}</span>
                    <div>
                      <p className="font-bold text-sm">
                        {visitor.location || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {visitor.ipAddress}
                      </p>
                    </div>
                  </div>

                  {/* Current Page */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                      Sayfa
                    </p>
                    <p className="text-sm truncate">{visitor.currentPage}</p>
                  </div>

                  {/* Device & Browser */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Monitor className="h-3 w-3 mr-1" />
                      {getDeviceType(visitor.userAgent)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getBrowser(visitor.userAgent)}
                    </Badge>
                  </div>

                  {/* Last Activity */}
                  <div className="text-right min-w-[80px]">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                      Son Aktivite
                    </p>
                    <p className="text-sm font-bold text-green-500">
                      {getTimeAgo(visitor.lastActivity)}
                    </p>
                  </div>
                </div>
              ))}

              {data?.visitors.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Şu anda aktif ziyaretçi yok
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Country Distribution */}
        {data && data.visitors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black">
                Ülke Dağılımı
              </CardTitle>
              <CardDescription>
                Aktif ziyaretçilerin ülkelere göre dağılımı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(
                  data.visitors.reduce(
                    (acc, visitor) => {
                      const country = visitor.country || "Unknown";
                      const flag = visitor.flag;
                      const key = `${flag} ${country}`;
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>,
                  ),
                )
                  .sort(([, a], [, b]) => b - a)
                  .map(([country, count]) => (
                    <div
                      key={country}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <span className="text-2xl">{country.split(" ")[0]}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">
                          {country.split(" ").slice(1).join(" ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
