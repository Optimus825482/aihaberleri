"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertTriangle,
    RefreshCw,
    Search,
    Languages,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface InconsistentArticle {
    id: string;
    title: string;
    slug: string;
    status: string;
    categoryName: string | null;
    trUpdatedAt: string;
    enTranslationId: string | null;
    enTitle: string | null;
    enSlug: string | null;
    enUpdatedAt: string | null;
    isMissingEnTranslation: boolean;
    isOutdated: boolean;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function EnglishSyncAdminPage() {
    const { toast } = useToast();
    const [rows, setRows] = useState<InconsistentArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });

    const allSelectedOnPage = useMemo(() => {
        if (rows.length === 0) {
            return false;
        }
        return rows.every((row) => selectedIds.includes(row.id));
    }, [rows, selectedIds]);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.page),
                limit: String(pagination.limit),
            });
            if (search.trim()) {
                params.set("search", search.trim());
            }

            const response = await fetch(`/api/admin/articles/en-sync?${params.toString()}`, {
                credentials: "include",
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Tutarsız makaleler alınamadı");
            }

            setRows(data.data || []);
            setPagination(data.pagination);
            setSelectedIds((prev) => prev.filter((id) => (data.data || []).some((row: InconsistentArticle) => row.id === id)));
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Hata",
                description:
                    error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu",
            });
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, toast]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    const toggleSelectAllOnPage = () => {
        if (allSelectedOnPage) {
            const currentPageIds = rows.map((row) => row.id);
            setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
            return;
        }

        setSelectedIds((prev) => {
            const next = new Set(prev);
            rows.forEach((row) => next.add(row.id));
            return Array.from(next);
        });
    };

    const syncArticles = async (mode: "single" | "selected" | "all", articleId?: string) => {
        setSyncing(true);
        try {
            let payload: Record<string, unknown> = {};

            if (mode === "single" && articleId) {
                payload = { articleIds: [articleId] };
            } else if (mode === "selected") {
                payload = { articleIds: selectedIds };
            } else {
                payload = {
                    syncAllInconsistent: true,
                    search: search.trim() || undefined,
                    limit: 500,
                };
            }

            const response = await fetch("/api/admin/articles/en-sync", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Senkron işlemi başarısız");
            }

            toast({
                title: "Senkron tamamlandı",
                description: data.message,
            });

            if (mode !== "single") {
                setSelectedIds([]);
            }

            await fetchRows();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Senkron hatası",
                description:
                    error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu",
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Languages className="h-7 w-7 text-primary" />
                            TR → EN Senkron Kontrolü
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            TR güncellemelerini EN çevirilere tek tek veya toplu olarak yansıtın.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => fetchRows()}
                            disabled={loading || syncing}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Yenile
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => syncArticles("selected")}
                            disabled={syncing || selectedIds.length === 0}
                        >
                            {syncing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Languages className="mr-2 h-4 w-4" />
                            )}
                            Seçilenleri Senkronla ({selectedIds.length})
                        </Button>
                        <Button onClick={() => syncArticles("all")} disabled={syncing || loading}>
                            {syncing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Languages className="mr-2 h-4 w-4" />
                            )}
                            Tüm Tutarsızları Senkronla
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Filtreler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Başlık veya slug ile ara"
                                    className="pl-9"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            setPagination((prev) => ({ ...prev, page: 1 }));
                                            setSearch(searchInput.trim());
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                    setSearch(searchInput.trim());
                                }}
                                disabled={loading}
                            >
                                Ara
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Tutarsız Makaleler ({pagination.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-16 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                Tutarsız makale bulunamadı.
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3 w-10">
                                                    <Checkbox
                                                        checked={allSelectedOnPage}
                                                        onCheckedChange={toggleSelectAllOnPage}
                                                        aria-label="Tüm satırları seç"
                                                    />
                                                </th>
                                                <th className="text-left p-3">Makale</th>
                                                <th className="text-left p-3">Durum</th>
                                                <th className="text-left p-3">TR Güncelleme</th>
                                                <th className="text-left p-3">EN Güncelleme</th>
                                                <th className="text-left p-3">Sorun</th>
                                                <th className="text-right p-3">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr key={row.id} className="border-t">
                                                    <td className="p-3 align-top">
                                                        <Checkbox
                                                            checked={selectedIds.includes(row.id)}
                                                            onCheckedChange={() => toggleSelect(row.id)}
                                                            aria-label={`${row.title} seç`}
                                                        />
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <div className="font-medium text-foreground line-clamp-2">
                                                            {row.title}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            /news/{row.slug}
                                                        </div>
                                                        {row.categoryName && (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {row.categoryName}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <Badge variant={row.status === "PUBLISHED" ? "default" : "secondary"}>
                                                            {row.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 align-top text-xs text-muted-foreground">
                                                        {new Date(row.trUpdatedAt).toLocaleString("tr-TR")}
                                                    </td>
                                                    <td className="p-3 align-top text-xs text-muted-foreground">
                                                        {row.enUpdatedAt
                                                            ? new Date(row.enUpdatedAt).toLocaleString("tr-TR")
                                                            : "-"}
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        {row.isMissingEnTranslation ? (
                                                            <Badge variant="destructive">EN Çeviri Yok</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">EN Eski</Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-3 align-top text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => syncArticles("single", row.id)}
                                                            disabled={syncing}
                                                        >
                                                            Senkronla
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-xs text-muted-foreground">
                                        Sayfa {pagination.page} / {pagination.totalPages}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page <= 1 || loading}
                                            onClick={() =>
                                                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                                            }
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page >= pagination.totalPages || loading}
                                            onClick={() =>
                                                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
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
