"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, CircleX, ExternalLink, RefreshCw } from "lucide-react";

type CheckItem = {
    key: string;
    label: string;
    url: string;
    ok: boolean;
    detail: string;
    debug?: {
        status?: number;
        path?: string;
        hasScript?: boolean;
        hasSlot?: boolean;
        hasFormat?: boolean;
        hasLayout?: boolean;
        missing?: string[];
        snippet?: string;
    };
};

type GlobalCheckItem = {
    key: string;
    label: string;
    ok: boolean;
    detail: string;
};

type LiveCheckResponse = {
    generatedAt: string;
    score: number;
    summary: {
        globalOkCount: number;
        globalTotal: number;
        okCount: number;
        total: number;
    };
    globalChecks: GlobalCheckItem[];
    checks: CheckItem[];
    recommendations: string[];
};

export default function AdsenseReadinessClient() {
    const [data, setData] = useState<LiveCheckResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLiveCheck = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            const response = await fetch(`/api/adsense/live-check?ts=${Date.now()}`, {
                cache: "no-store",
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Canlı kontrol alınamadı");
            }

            setData(payload.data);
        } catch (fetchError) {
            setError(
                fetchError instanceof Error ? fetchError.message : "Canlı kontrol alınamadı",
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLiveCheck();
    }, []);

    const scoreText = useMemo(() => {
        if (!data) return "-";
        return `${data.score}%`;
    }, [data]);

    return (
        <main className="min-h-screen bg-ai-background-dark">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                            AdSense Canlı Slot Kontrolü
                        </h1>
                        <p className="mt-1 text-sm text-ai-text-secondary">
                            Admin paneline girmeden script ve slot doğrulamasını kontrol edin.
                        </p>
                    </div>

                    <Button
                        onClick={() => fetchLiveCheck(true)}
                        disabled={loading || refreshing}
                        className="inline-flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        {refreshing ? "Kontrol ediliyor..." : "Yeniden Kontrol Et"}
                    </Button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Genel Durum</CardDescription>
                            <CardTitle className="text-3xl text-white">{scoreText}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-ai-text-secondary">
                                {data
                                    ? `${data.summary.globalOkCount + data.summary.okCount}/${data.summary.globalTotal + data.summary.total} kontrol doğrulandı`
                                    : "Veri bekleniyor"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Son Çalışma</CardDescription>
                            <CardTitle className="text-lg text-white">
                                {data
                                    ? new Date(data.generatedAt).toLocaleString("tr-TR")
                                    : "-"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-ai-text-secondary">
                                Global + rota bazlı kontrol: env, ads.txt, TR/EN ana ve detay
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {error ? (
                    <Card className="mt-4 border-red-500/30 bg-red-500/10">
                        <CardContent className="pt-6 text-red-200">{error}</CardContent>
                    </Card>
                ) : null}

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Global Kontroller</CardTitle>
                        <CardDescription>
                            Ortam değişkenleri ve ads.txt doğrulaması.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data?.globalChecks.map((item) => (
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
                                    <Badge variant={item.ok ? "default" : "destructive"}>
                                        {item.ok ? "Doğrulandı" : "Eksik"}
                                    </Badge>
                                </div>
                                <p className="mt-2 text-sm text-ai-text-secondary">{item.detail}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Slot Sonuçları</CardTitle>
                        <CardDescription>
                            Her rota için script, slot, format ve gerekli yerlerde layout kontrol edilir.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading && !data ? (
                            <p className="text-sm text-ai-text-secondary">Kontrol verisi yükleniyor...</p>
                        ) : null}

                        {data?.checks.map((item) => (
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

                                    <Badge variant={item.ok ? "default" : "destructive"}>
                                        {item.ok ? "Doğrulandı" : "Eksik"}
                                    </Badge>
                                </div>

                                <p className="mt-2 text-sm text-ai-text-secondary">{item.detail}</p>

                                {item.debug ? (
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-ai-text-muted sm:grid-cols-4">
                                        <p>script: {item.debug.hasScript ? "ok" : "-"}</p>
                                        <p>slot: {item.debug.hasSlot ? "ok" : "-"}</p>
                                        <p>format: {item.debug.hasFormat ? "ok" : "-"}</p>
                                        <p>layout: {item.debug.hasLayout ? "ok" : "-"}</p>
                                    </div>
                                ) : null}

                                {item.debug?.snippet ? (
                                    <p className="mt-2 break-all rounded bg-ai-surface-dark px-2 py-1 text-[11px] text-ai-text-muted">
                                        snippet: {item.debug.snippet}
                                    </p>
                                ) : null}

                                {item.url !== "-" ? (
                                    <Link
                                        href={item.url}
                                        target="_blank"
                                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ai-primary hover:text-ai-primary-hover"
                                    >
                                        Sayfayı aç
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                ) : null}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {data?.recommendations?.length ? (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Aksiyon Önerileri</CardTitle>
                            <CardDescription>
                                Eksik kalan maddeler için otomatik öneriler.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {data.recommendations.map((item) => (
                                <p key={item} className="text-sm text-ai-text-secondary">
                                    • {item}
                                </p>
                            ))}
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </main>
    );
}
