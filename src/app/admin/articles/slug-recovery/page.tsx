"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Wand2,
    Search,
    Loader2,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Trash2,
    Play,
    RefreshCw,
} from "lucide-react";

// ─── Tipler ──────────────────────────────────────────────────────────────────

type SlugStatus = "pending" | "researching" | "generating" | "done" | "failed";

interface SlugRow {
    slug: string;
    status: SlugStatus;
    categoryId: string;
    error?: string;
    result?: {
        articleId: string;
        trUrl: string;
        enUrl: string;
        trTitle: string;
        enTitle: string;
        sourcesUsed: number;
    };
}

interface Category {
    id: string;
    name: string;
    slug: string;
}

// ─── Yardımcı bileşenler ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SlugStatus }) {
    const map: Record<SlugStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        pending: { label: "Bekliyor", variant: "outline" },
        researching: { label: "Araştırılıyor...", variant: "secondary" },
        generating: { label: "Üretiliyor...", variant: "secondary" },
        done: { label: "Yayınlandı ✅", variant: "default" },
        failed: { label: "Hata ❌", variant: "destructive" },
    };
    const { label, variant } = map[status];
    return <Badge variant={variant}>{label}</Badge>;
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────

export default function SlugRecoveryPage() {
    const { toast } = useToast();
    const [slugInput, setSlugInput] = useState("");
    const [queue, setQueue] = useState<SlugRow[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [defaultCategory, setDefaultCategory] = useState("");
    const [isRunning, setIsRunning] = useState(false);

    // Kategorileri yükle
    useEffect(() => {
        fetch("/api/categories", { credentials: "include" })
            .then((r) => r.json())
            .then((data) => {
                const cats: Category[] = data.data ?? data ?? [];
                setCategories(cats);
                if (cats.length > 0) setDefaultCategory(cats[0].id);
            })
            .catch(() => {/* silent */});
    }, []);

    // Slug'ları kuyruğa ekle
    const addToQueue = () => {
        const slugs = slugInput
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !queue.some((r) => r.slug === s));

        if (slugs.length === 0) {
            toast({ variant: "destructive", title: "Slug bulunamadı", description: "En az bir geçerli slug girin." });
            return;
        }

        const newRows: SlugRow[] = slugs.map((slug) => ({
            slug,
            status: "pending",
            categoryId: defaultCategory,
        }));

        setQueue((prev) => [...prev, ...newRows]);
        setSlugInput("");
        toast({ title: `${slugs.length} slug kuyruğa eklendi` });
    };

    // Bir slug'ı işle
    const processSlug = async (slug: string): Promise<void> => {
        const categoryId = queue.find((r) => r.slug === slug)?.categoryId ?? defaultCategory;

        // Araştırma aşaması
        setQueue((prev) =>
            prev.map((r) => (r.slug === slug ? { ...r, status: "researching" } : r)),
        );

        let response: Response;
        let data: Record<string, unknown>;

        try {
            response = await fetch(
                `/api/admin/articles/slug-recovery?slug=${encodeURIComponent(slug)}`,
                { credentials: "include" },
            );
            data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error((data.error as string) ?? "Araştırma başarısız");
            }
        } catch (err) {
            setQueue((prev) =>
                prev.map((r) =>
                    r.slug === slug
                        ? { ...r, status: "failed", error: err instanceof Error ? err.message : "Araştırma hatası" }
                        : r,
                ),
            );
            return;
        }

        // Üretim + yayın aşaması
        setQueue((prev) =>
            prev.map((r) => (r.slug === slug ? { ...r, status: "generating" } : r)),
        );

        try {
            response = await fetch("/api/admin/articles/slug-recovery", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, categoryId }),
            });
            data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error((data.error as string) ?? "Yayınlama başarısız");
            }

            setQueue((prev) =>
                prev.map((r) =>
                    r.slug === slug
                        ? {
                            ...r,
                            status: "done",
                            result: {
                                articleId: data.articleId as string,
                                trUrl: data.trUrl as string,
                                enUrl: data.enUrl as string,
                                trTitle: data.trTitle as string,
                                enTitle: data.enTitle as string,
                                sourcesUsed: data.sourcesUsed as number,
                            },
                        }
                        : r,
                ),
            );
        } catch (err) {
            setQueue((prev) =>
                prev.map((r) =>
                    r.slug === slug
                        ? { ...r, status: "failed", error: err instanceof Error ? err.message : "Üretim hatası" }
                        : r,
                ),
            );
        }
    };

    // Tek slug işle
    const runSingle = async (slug: string) => {
        setIsRunning(true);
        await processSlug(slug);
        setIsRunning(false);
    };

    // Tüm bekleyenleri sırayla işle
    const runAll = async () => {
        setIsRunning(true);
        const pending = queue.filter((r) => r.status === "pending" || r.status === "failed");
        for (const row of pending) {
            await processSlug(row.slug);
        }
        setIsRunning(false);
        toast({ title: "Tüm slug'lar işlendi" });
    };

    // Kuyruktan sil
    const removeSlug = (slug: string) =>
        setQueue((prev) => prev.filter((r) => r.slug !== slug));

    // Kategori güncelle
    const updateCategory = (slug: string, categoryId: string) =>
        setQueue((prev) =>
            prev.map((r) => (r.slug === slug ? { ...r, categoryId } : r)),
        );

    const pendingCount = queue.filter((r) => r.status === "pending" || r.status === "failed").length;
    const doneCount = queue.filter((r) => r.status === "done").length;

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">

                {/* Başlık */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Wand2 className="h-7 w-7 text-primary" />
                        404 Slug Kurtarma
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Google&apos;da 404 dönen slug&apos;lar için web&apos;de araştırma yap,
                        yeni Türkçe + İngilizce makale üret ve{" "}
                        <strong>aynı slug</strong> ile yayınla.
                    </p>
                </div>

                {/* Slug girişi */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Slug Listesi Gir
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={slugInput}
                            onChange={(e) => setSlugInput(e.target.value)}
                            placeholder={"Slug'ları yapıştırın (her satıra bir tane veya virgülle ayırın):\n\nqwen35-35b-a3b-turkiyede-devrim\nstanford-education-reform\nnvidia-ai-stratejisi-2026"}
                            rows={6}
                            className="font-mono text-sm"
                        />
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Varsayılan kategori:</span>
                                <Select
                                    value={defaultCategory}
                                    onValueChange={setDefaultCategory}
                                >
                                    <SelectTrigger className="w-52">
                                        <SelectValue placeholder="Kategori seç" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={addToQueue} disabled={!slugInput.trim()}>
                                Kuyruğa Ekle
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Kuyruk */}
                {queue.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="text-base">
                                    İşlem Kuyruğu — {doneCount}/{queue.length} tamamlandı
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setQueue([])}
                                        disabled={isRunning}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                        Temizle
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={runAll}
                                        disabled={isRunning || pendingCount === 0}
                                    >
                                        {isRunning ? (
                                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                        ) : (
                                            <Play className="h-3.5 w-3.5 mr-1" />
                                        )}
                                        Tümünü Çalıştır ({pendingCount})
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3">Slug</th>
                                            <th className="text-left p-3 w-44">Kategori</th>
                                            <th className="text-left p-3 w-36">Durum</th>
                                            <th className="text-left p-3">Sonuç</th>
                                            <th className="text-right p-3 w-28">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queue.map((row) => (
                                            <tr key={row.slug} className="border-t align-top">
                                                {/* Slug */}
                                                <td className="p-3">
                                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                                                        {row.slug}
                                                    </code>
                                                </td>

                                                {/* Kategori */}
                                                <td className="p-3">
                                                    <Select
                                                        value={row.categoryId || defaultCategory}
                                                        onValueChange={(val) => updateCategory(row.slug, val)}
                                                        disabled={row.status !== "pending" && row.status !== "failed"}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.map((c) => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    {c.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>

                                                {/* Durum */}
                                                <td className="p-3">
                                                    <StatusBadge status={row.status} />
                                                    {(row.status === "researching" || row.status === "generating") && (
                                                        <Loader2 className="h-3 w-3 animate-spin inline ml-2 text-muted-foreground" />
                                                    )}
                                                </td>

                                                {/* Sonuç */}
                                                <td className="p-3">
                                                    {row.status === "done" && row.result && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1">
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                                                <span className="text-xs font-medium line-clamp-1">
                                                                    {row.result.trTitle}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-2 text-xs">
                                                                <a
                                                                    href={row.result.trUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-0.5 text-blue-500 hover:underline"
                                                                >
                                                                    TR <ExternalLink className="h-2.5 w-2.5" />
                                                                </a>
                                                                <a
                                                                    href={row.result.enUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-0.5 text-blue-500 hover:underline"
                                                                >
                                                                    EN <ExternalLink className="h-2.5 w-2.5" />
                                                                </a>
                                                                <span className="text-muted-foreground">
                                                                    {row.result.sourcesUsed} kaynak
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {row.status === "failed" && row.error && (
                                                        <div className="flex items-start gap-1 text-xs text-destructive">
                                                            <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                            <span>{row.error}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Aksiyon */}
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {(row.status === "pending" || row.status === "failed") && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => runSingle(row.slug)}
                                                                disabled={isRunning}
                                                            >
                                                                <Wand2 className="h-3 w-3 mr-1" />
                                                                Üret
                                                            </Button>
                                                        )}
                                                        {row.status === "done" && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => runSingle(row.slug)}
                                                                disabled={isRunning}
                                                                title="Yeniden üret"
                                                            >
                                                                <RefreshCw className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() => removeSlug(row.slug)}
                                                            disabled={
                                                                row.status === "researching" ||
                                                                row.status === "generating"
                                                            }
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Boş durum */}
                {queue.length === 0 && (
                    <div className="border border-dashed rounded-lg py-16 text-center text-muted-foreground">
                        <Wand2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">
                            Yukarıya 404 slug&apos;larını yapıştırın ve{" "}
                            <strong>Kuyruğa Ekle</strong>&apos;ye tıklayın.
                        </p>
                        <p className="text-xs mt-1 opacity-70">
                            Her slug için web araştırması yapılır, AI ile makale üretilir ve aynı slug ile yayınlanır.
                        </p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
