"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
    Globe,
    RefreshCw,
    Search,
    Languages,
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
} from "lucide-react";

interface Article {
    id: string;
    title: string;
    slug: string;
    status: string;
    categoryName: string | null;
    publishedAt: string | null;
    updatedAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface Progress {
    active: boolean;
    total: number;
    completed: number;
    success: number;
    failed: number;
    currentTitle: string;
}

export default function MissingEnPage() {
    const { toast } = useToast();
    const [rows, setRows] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [translating, setTranslating] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });
    const [progress, setProgress] = useState<Progress>({
        active: false,
        total: 0,
        completed: 0,
        success: 0,
        failed: 0,
        currentTitle: "",
    });

    const allSelectedOnPage = useMemo(
        () => rows.length > 0 && rows.every((r) => selectedIds.includes(r.id)),
        [rows, selectedIds],
    );

    const progressPercent = useMemo(
        () => (progress.total ? Math.floor((progress.completed / progress.total) * 100) : 0),
        [progress.completed, progress.total],
    );

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.page),
                limit: String(pagination.limit),
            });
            if (search.trim()) params.set("search", search.trim());

            const res = await fetch(`/api/admin/articles/missing-en?${params}`, {
                credentials: "include",
            });
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.error || "Makale listesi alınamadı");

            setRows(data.data ?? []);
            setPagination(data.pagination);
            setSelectedIds((prev) =>
                prev.filter((id) => (data.data ?? []).some((r: Article) => r.id === id)),
            );
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: err instanceof Error ? err.message : "Beklenmeyen hata",
            });
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, toast]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const toggleSelect = (id: string) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const toggleSelectAll = () => {
        if (allSelectedOnPage) {
            const pageIds = rows.map((r) => r.id);
            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...rows.map((r) => r.id)])));
        }
    };

    const getTargets = async (
        mode: "single" | "selected" | "all",
        articleId?: string,
    ): Promise<Array<{ id: string; title: string }>> => {
        if (mode === "single" && articleId) {
            const found = rows.find((r) => r.id === articleId);
            return [{ id: articleId, title: found?.title ?? "Makale" }];
        }
        if (mode === "selected") {
            return selectedIds.map((id) => {
                const found = rows.find((r) => r.id === id);
                return { id, title: found?.title ?? "Makale" };
            });
        }

        // all — sunucudan id listesini al
        const params = new URLSearchParams({ idsOnly: "true", limit: "1000" });
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/admin/articles/missing-en?${params}`, {
            credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "ID listesi alınamadı");
        return data.data ?? [];
    };

    const translate = async (
        mode: "single" | "selected" | "all",
        articleId?: string,
    ) => {
        setTranslating(true);
        try {
            const targets = await getTargets(mode, articleId);
            if (!targets.length) throw new Error("Çevrilecek makale bulunamadı");

            setProgress({
                active: true,
                total: targets.length,
                completed: 0,
                success: 0,
                failed: 0,
                currentTitle: targets[0]?.title ?? "",
            });

            let success = 0;
            let failed = 0;

            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                setProgress((prev) => ({ ...prev, currentTitle: target.title }));

                try {
                    const res = await fetch("/api/admin/articles/missing-en", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ articleIds: [target.id] }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success || data.successCount !== 1) {
                        failed++;
                    } else {
                        success++;
                    }
                } catch {
                    failed++;
                }

                setProgress((prev) => ({
                    ...prev,
                    completed: i + 1,
                    success,
                    failed,
                }));
            }

            toast({
                title: "Çeviri tamamlandı",
                description: `✅ ${success} başarılı  ❌ ${failed} başarısız`,
            });

            if (mode !== "single") setSelectedIds([]);
            await fetchRows();
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: err instanceof Error ? err.message : "Beklenmeyen hata",
            });
        } finally {
            setTranslating(false);
            setProgress((prev) => ({ ...prev, active: false, currentTitle: "" }));
        }
    };

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                {/* Başlık */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Globe className="h-7 w-7 text-primary" />
                            EN Çevirisi Eksik Makaleler
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Türkçe içeriği olup hiç İngilizce çevirisi bulunmayan yayınlanmış makaleler.
                            Seçili makaleleri veya tümünü tek tıkla otomatik çevirin.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => fetchRows()}
                            disabled={loading || translating}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Yenile
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => translate("selected")}
                            disabled={translating || selectedIds.length === 0}
                        >
                            {translating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Languages className="mr-2 h-4 w-4" />
                            )}
                            Seçilenleri Çevir ({selectedIds.length})
                        </Button>
                        <Button
                            onClick={() => translate("all")}
                            disabled={translating || loading || pagination.total === 0}
                        >
                            {translating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Languages className="mr-2 h-4 w-4" />
                            )}
                            Tümünü Çevir ({pagination.total})
                        </Button>
                    </div>
                </div>

                {/* İlerleme */}
                {progress.active && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Çeviri İlerlemesi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Progress value={progressPercent} />
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>
                                    {progress.completed}/{progress.total} (%{progressPercent})
                                </span>
                                <span>
                                    ✅ {progress.success} / ❌ {progress.failed}
                                </span>
                            </div>
                            {progress.currentTitle && (
                                <p className="text-xs text-muted-foreground">
                                    İşleniyor: {progress.currentTitle}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Arama */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Başlık veya slug ile ara"
                                    className="pl-9"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            setPagination((p) => ({ ...p, page: 1 }));
                                            setSearch(searchInput.trim());
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPagination((p) => ({ ...p, page: 1 }));
                                    setSearch(searchInput.trim());
                                }}
                                disabled={loading}
                            >
                                Ara
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tablo */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="h-4 w-4 text-blue-500" />
                            EN Çevirisi Eksik ({pagination.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-16 flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="py-12 text-center">
                                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                                <p className="text-muted-foreground">
                                    Tüm makalelerin İngilizce çevirisi mevcut.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <Checkbox
                                                        checked={allSelectedOnPage}
                                                        onCheckedChange={toggleSelectAll}
                                                    />
                                                </th>
                                                <th className="text-left p-3">Makale</th>
                                                <th className="text-left p-3">Kategori</th>
                                                <th className="text-left p-3">Güncellenme</th>
                                                <th className="text-right p-3">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr key={row.id} className="border-t hover:bg-muted/30">
                                                    <td className="p-3">
                                                        <Checkbox
                                                            checked={selectedIds.includes(row.id)}
                                                            onCheckedChange={() => toggleSelect(row.id)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-medium line-clamp-2">
                                                            {row.title}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            /news/{row.slug}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        {row.categoryName ? (
                                                            <Badge variant="secondary">
                                                                {row.categoryName}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                                                        {new Date(row.updatedAt).toLocaleDateString("tr-TR")}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => translate("single", row.id)}
                                                            disabled={translating}
                                                        >
                                                            {translating ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <Languages className="h-3 w-3" />
                                                            )}
                                                            <span className="ml-1">Çevir</span>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Sayfalama */}
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-xs text-muted-foreground">
                                        Sayfa {pagination.page} / {pagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page <= 1 || loading}
                                            onClick={() =>
                                                setPagination((p) => ({ ...p, page: p.page - 1 }))
                                            }
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page >= pagination.totalPages || loading}
                                            onClick={() =>
                                                setPagination((p) => ({ ...p, page: p.page + 1 }))
                                            }
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
