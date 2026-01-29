"use client";

import { useEffect, useState } from "react";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Users, Clock } from "lucide-react";

interface AuditLog {
    id: string;
    action: string;
    resource: string;
    resourceId?: string | null;
    details?: any;
    createdAt: Date;
    user: {
        name: string | null;
        email: string;
        role: string;
    };
}

interface AuditStats {
    total: number;
    actionCounts: Record<string, number>;
    resourceCounts: Record<string, number>;
    topUsers: Array<{ userId: string; count: number }>;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [logsRes, statsRes] = await Promise.all([
                    fetch("/api/admin/audit-logs?limit=100"),
                    fetch("/api/admin/audit-logs?stats=true"),
                ]);

                if (logsRes.ok) {
                    const data = await logsRes.json();
                    setLogs(data.logs);
                }

                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch audit logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-primary/20 p-8 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">
                            Aktivite Geçmişi
                        </h1>
                        <p className="text-muted-foreground">
                            Tüm admin eylemlerinin güvenlik logu
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Toplam İşlem
                            </CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">Son 7 gün</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">En Çok İşlem</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {Object.entries(stats.actionCounts)[0]?.[0] || "N/A"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {Object.entries(stats.actionCounts)[0]?.[1] || 0} kez
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">En Çok Kaynak</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {Object.entries(stats.resourceCounts)[0]?.[0] || "N/A"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {Object.entries(stats.resourceCounts)[0]?.[1] || 0} işlem
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Aktif Kullanıcı
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.topUsers.length}
                            </div>
                            <p className="text-xs text-muted-foreground">Toplam kullanıcı</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Activity Log */}
            <ActivityLog logs={logs} maxHeight="800px" />

            {/* Action Types */}
            {stats && (
                <Card>
                    <CardHeader>
                        <CardTitle>İşlem Türleri</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.actionCounts).map(([action, count]) => (
                                <Badge key={action} variant="secondary">
                                    {action}: {count}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
