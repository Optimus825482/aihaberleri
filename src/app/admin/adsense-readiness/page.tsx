"use client";

import { useEffect, useMemo, useState } from "react";
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
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    CircleX,
    Minus,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

type CheckItem = {
    key: string;
    label: string;
    required: boolean;
    ok: boolean;
    detail: string;
};

type ReadinessResponse = {
    generatedAt: string;
    score: number;
    summary: {
        readyChecks: number;
        totalChecks: number;
        requiredReady: number;
        requiredTotal: number;
        published30d: number;
        publishedTotal: number;
        thinCount: number;
        missingImage: number;
    };
    checks: CheckItem[];
    recommendations: string[];
};

const scoreTone = (score: number) => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 65) return "text-amber-500";
    return "text-red-500";
};

export default function AdsenseReadinessPage() {
    const [data, setData] = useState<ReadinessResponse | null>(null);
    const [previousData, setPreviousData] = useState<ReadinessResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRunAt, setLastRunAt] = useState<string | null>(null);

    const fetchReadiness = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            if (isRefresh && data) {
                setPreviousData(data);
            }

            const response = await fetch(`/api/admin/adsense-readiness?ts=${Date.now()}`, {
                cache: "no-store",
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Hazırlık verisi alınamadı");
            }

            setData(payload.data);
            setLastRunAt(new Date().toISOString());
        } catch (fetchError) {
            const message =
                fetchError instanceof Error
                    ? fetchError.message
                    : "Hazırlık verisi alınamadı";
            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReadiness();
    }, []);

    const requiredFailed = useMemo(() => {
        if (!data) return [];
        return data.checks.filter((item) => item.required && !item.ok);
    }, [data]);

    const deltaByKey = useMemo(() => {
        if (!data || !previousData) return new Map<string, "up" | "down" | "same" | "new">();

        const previousMap = new Map(previousData.checks.map((item) => [item.key, item]));
        const map = new Map<string, "up" | "down" | "same" | "new">();

        data.checks.forEach((item) => {
            const previous = previousMap.get(item.key);
            if (!previous) {
                map.set(item.key, "new");
                return;
            }

            if (!previous.ok && item.ok) {
                map.set(item.key, "up");
                return;
            }

            if (previous.ok && !item.ok) {
                map.set(item.key, "down");
                return;
            }

            map.set(item.key, "same");
        });

        return map;
    }, [data, previousData]);

    return (
        <AdminLayout>
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                            <ShieldCheck className="h-7 w-7 text-emerald-500" />
                            AdSense Hazırlık Merkezi
                        </h1>
                        <p className="text-sm text-ai-text-secondary mt-1">
                            Başvuru öncesi minimum uygunluk kontrolleri ve kalite sinyalleri.
                        </p>
                    </div>

                    <Button
                        onClick={() => fetchReadiness(true)}
                        disabled={refreshing || loading}
                        className="inline-flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        {refreshing ? "Yeniden denetleniyor..." : "Yeniden Denetle"}
                    </Button>
                </div>

                {lastRunAt ? (
                    <p className="text-xs text-ai-text-muted">
                        Son yeniden denetim: {new Date(lastRunAt).toLocaleString("tr-TR")}
                    </p>
                ) : null}

                {error && (
                    <Card className="border-red-500/30 bg-red-500/10">
                        <CardContent className="pt-6 text-red-200">{error}</CardContent>
                    </Card>
                )}

                {loading && !data ? (
                    <Card>
                        <CardContent className="pt-6 text-ai-text-secondary">Hazırlık verisi yükleniyor...</CardContent>
                    </Card>
                ) : null}

                {data ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Genel Skor</CardDescription>
                                    <CardTitle className={`text-3xl ${scoreTone(data.score)}`}>{data.score}%</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Progress value={data.score} />
                                    {previousData ? (
                                        <p className="mt-2 text-xs text-ai-text-muted">
                                            Önceki skor: {previousData.score}%
                                        </p>
                                    ) : null}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Zorunlu Kontroller</CardDescription>
                                    <CardTitle className="text-3xl">
                                        {data.summary.requiredReady}/{data.summary.requiredTotal}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Badge variant={requiredFailed.length === 0 ? "default" : "destructive"}>
                                        {requiredFailed.length === 0 ? "Hazır" : `${requiredFailed.length} eksik`}
                                    </Badge>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Son 30 Gün Yayın</CardDescription>
                                    <CardTitle className="text-3xl">{data.summary.published30d}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-ai-text-secondary">Hedef: en az 20</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Toplam Yayın</CardDescription>
                                    <CardTitle className="text-3xl">{data.summary.publishedTotal}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-ai-text-secondary">
                                        Son kontrol: {new Date(data.generatedAt).toLocaleString("tr-TR")}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Kontrol Listesi</CardTitle>
                                <CardDescription>
                                    AdSense başvurusu için zorunlu ve önerilen maddelerin mevcut durumu.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.checks.map((item) => (
                                    <div
                                        key={item.key}
                                        className="rounded-lg border border-ai-surface-border bg-ai-surface-card p-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {item.ok ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                ) : (
                                                    <CircleX className="h-4 w-4 text-red-500" />
                                                )}
                                                <p className="font-semibold text-white">{item.label}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={item.required ? "outline" : "secondary"}>
                                                    {item.required ? "Zorunlu" : "Önerilen"}
                                                </Badge>
                                                <Badge variant={item.ok ? "default" : "destructive"}>
                                                    {item.ok ? "Uygun" : "Eksik"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-sm text-ai-text-secondary mt-2">{item.detail}</p>

                                        {previousData ? (
                                            <div className="mt-2">
                                                {deltaByKey.get(item.key) === "up" ? (
                                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                                        <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                                                        İyileşti
                                                    </Badge>
                                                ) : deltaByKey.get(item.key) === "down" ? (
                                                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                                        <ArrowDownRight className="h-3.5 w-3.5 mr-1" />
                                                        Geriledi
                                                    </Badge>
                                                ) : deltaByKey.get(item.key) === "new" ? (
                                                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                                                        Yeni kriter
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        <Minus className="h-3.5 w-3.5 mr-1" />
                                                        Değişmedi
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Aksiyon Önerileri</CardTitle>
                                <CardDescription>
                                    Eksik kalan maddeleri hızlıca tamamlamak için önerilen adımlar.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.recommendations.length === 0 ? (
                                    <p className="text-emerald-400">Tüm kritik kontroller uygun görünüyor.</p>
                                ) : (
                                    <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
                                        {data.recommendations.map((item, index) => (
                                            <li key={`${item}-${index}`}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </div>
        </AdminLayout>
    );
}
