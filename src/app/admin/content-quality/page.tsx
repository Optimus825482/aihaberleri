"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ImageOff, RefreshCw, Sparkles, Wand2 } from "lucide-react";

type QualityItem = {
    id: string;
    slug: string;
    title: string;
    publishedAt: string | null;
    imageUrl?: string | null;
    contentLength?: number;
};

type ResponseShape = {
    generatedAt: string;
    params: {
        limit: number;
        minContentLength: number;
    };
    summary: {
        publishedTotal: number;
        imagelessTotal: number;
        lowContentTotal: number;
        imagelessRatio: number;
        lowContentRatio: number;
    };
    lists: {
        imageless: QualityItem[];
        lowContent: QualityItem[];
    };
    recommendations: string[];
};

export default function AdminContentQualityPage() {
    const [data, setData] = useState<ResponseShape | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [runningBackfill, setRunningBackfill] = useState(false);
    const [runningRewrite, setRunningRewrite] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
    const [rewriteMessage, setRewriteMessage] = useState<string | null>(null);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            const response = await fetch(`/api/admin/content-quality?ts=${Date.now()}`, {
                cache: "no-store",
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "İçerik kalite verisi alınamadı");
            }

            setData(payload.data);
        } catch (fetchError) {
            setError(
                fetchError instanceof Error
                    ? fetchError.message
                    : "İçerik kalite verisi alınamadı",
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const runBackfill = async () => {
        if (!data) return;

        setRunningBackfill(true);
        setBackfillMessage(null);
        try {
            const response = await fetch("/api/admin/images/backfill", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    limit: Math.min(200, Math.max(1, data.summary.imagelessTotal)),
                    dryRun: false,
                }),
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Backfill işlemi başarısız");
            }

            const result = payload.data;
            setBackfillMessage(
                `Backfill tamamlandı: ${result.updated} güncellendi, ${result.failed} hata, ${result.backupProviderUsed} backup provider.`,
            );
            await fetchData(true);
        } catch (runError) {
            setBackfillMessage(
                runError instanceof Error ? runError.message : "Backfill çalıştırılamadı",
            );
        } finally {
            setRunningBackfill(false);
        }
    };

    const runLowContentRewrite = async () => {
        if (!data) return;

        setRunningRewrite(true);
        setRewriteMessage(null);
        try {
            const response = await fetch("/api/admin/content-quality/rewrite-low-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    limit: Math.min(20, Math.max(1, data.summary.lowContentTotal)),
                    minContentLength: data.params.minContentLength,
                    dryRun: false,
                }),
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "AI rewrite işlemi başarısız");
            }

            const result = payload.data;
            setRewriteMessage(
                `AI derleme tamamlandı: ${result.updated} güncellendi, ${result.failed} hata (limit ${result.requestedLimit}).`,
            );
            await fetchData(true);
        } catch (runError) {
            setRewriteMessage(
                runError instanceof Error ? runError.message : "AI rewrite çalıştırılamadı",
            );
        } finally {
            setRunningRewrite(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                            <Sparkles className="h-7 w-7 text-cyan-400" />
                            İçerik Kalite Merkezi
                        </h1>
                        <p className="text-sm text-ai-text-secondary mt-1">
                            Görselsiz ve düşük içerik haberleri ayrı listelerde takip edin, tek tıkla düzeltin.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => fetchData(true)}
                            disabled={loading || refreshing}
                            className="inline-flex items-center gap-2"
                            variant="outline"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            Yeniden Listele
                        </Button>

                        <Button
                            onClick={runBackfill}
                            disabled={runningBackfill || !data || data.summary.imagelessTotal === 0}
                            className="inline-flex items-center gap-2"
                        >
                            <Wand2 className={`h-4 w-4 ${runningBackfill ? "animate-spin" : ""}`} />
                            {runningBackfill ? "Backfill Çalışıyor..." : "Görselsizleri Düzelt"}
                        </Button>
                    </div>
                </div>

                {error ? (
                    <Card className="border-red-500/30 bg-red-500/10">
                        <CardContent className="pt-6 text-red-200">{error}</CardContent>
                    </Card>
                ) : null}

                {backfillMessage ? (
                    <Card className="border-cyan-500/30 bg-cyan-500/10">
                        <CardContent className="pt-6 text-cyan-100">{backfillMessage}</CardContent>
                    </Card>
                ) : null}

                {rewriteMessage ? (
                    <Card className="border-violet-500/30 bg-violet-500/10">
                        <CardContent className="pt-6 text-violet-100">{rewriteMessage}</CardContent>
                    </Card>
                ) : null}

                {loading && !data ? (
                    <Card>
                        <CardContent className="pt-6 text-ai-text-secondary">Veriler yükleniyor...</CardContent>
                    </Card>
                ) : null}

                {data ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Toplam Yayın</CardDescription>
                                    <CardTitle className="text-3xl">{data.summary.publishedTotal}</CardTitle>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Görselsiz Haber</CardDescription>
                                    <CardTitle className="text-3xl text-amber-400">
                                        {data.summary.imagelessTotal}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-ai-text-secondary">Oran: %{data.summary.imagelessRatio}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Düşük İçerik Haber</CardDescription>
                                    <CardTitle className="text-3xl text-orange-400">
                                        {data.summary.lowContentTotal}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-ai-text-secondary">Oran: %{data.summary.lowContentRatio}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Minimum İçerik Eşiği</CardDescription>
                                    <CardTitle className="text-3xl">{data.params.minContentLength}</CardTitle>
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
                                <CardTitle className="flex items-center gap-2">
                                    <ImageOff className="h-5 w-5 text-amber-400" /> Görselsiz Haberler
                                </CardTitle>
                                <CardDescription>İlk {data.params.limit} kayıt gösteriliyor.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {data.lists.imageless.length === 0 ? (
                                    <p className="text-emerald-400">Görselsiz haber bulunmuyor.</p>
                                ) : (
                                    data.lists.imageless.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-lg border border-ai-surface-border bg-ai-surface-card p-3"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{item.title}</p>
                                                    <p className="text-xs text-ai-text-secondary mt-1">/{item.slug}</p>
                                                </div>
                                                <Badge variant="destructive">Görsel Eksik</Badge>
                                            </div>
                                            <div className="mt-2">
                                                <Link
                                                    href={`/news/${item.slug}`}
                                                    target="_blank"
                                                    className="text-xs font-semibold text-ai-primary hover:text-ai-primary-hover"
                                                >
                                                    Haberi aç
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-400" /> Düşük İçerik Haberler
                                </CardTitle>
                                <CardDescription>
                                    İçerik uzunluğu {data.params.minContentLength} karakter altındaki kayıtlar.
                                </CardDescription>
                                <div className="pt-2">
                                    <Button
                                        onClick={runLowContentRewrite}
                                        disabled={runningRewrite || data.summary.lowContentTotal === 0}
                                        className="inline-flex items-center gap-2"
                                    >
                                        <Sparkles className={`h-4 w-4 ${runningRewrite ? "animate-spin" : ""}`} />
                                        {runningRewrite
                                            ? "AI Derleme Çalışıyor..."
                                            : "Düşük İçeriği AI ile Derle"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {data.lists.lowContent.length === 0 ? (
                                    <p className="text-emerald-400">Düşük içerik haber bulunmuyor.</p>
                                ) : (
                                    data.lists.lowContent.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-lg border border-ai-surface-border bg-ai-surface-card p-3"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{item.title}</p>
                                                    <p className="text-xs text-ai-text-secondary mt-1">/{item.slug}</p>
                                                </div>
                                                <Badge variant="secondary">{item.contentLength} karakter</Badge>
                                            </div>
                                            <div className="mt-2">
                                                <Link
                                                    href={`/news/${item.slug}`}
                                                    target="_blank"
                                                    className="text-xs font-semibold text-ai-primary hover:text-ai-primary-hover"
                                                >
                                                    Haberi aç
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Aksiyon Planı</CardTitle>
                                <CardDescription>
                                    Eksikleri düzeltmek için önerilen sırayla ilerleyin.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
                                    {data.recommendations.map((item, index) => (
                                        <li key={`${item}-${index}`}>{item}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </div>
        </AdminLayout>
    );
}
