"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Trash2, Edit, Globe, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BulkActionBarProps {
    count: number;
    onPublish?: () => void;
    onUnpublish?: () => void;
    onDelete?: () => void;
    onChangeCategory?: () => void;
    onClear: () => void;
    loading?: boolean;
}

/**
 * Bulk Action Bar Component
 * Appears when items are selected
 * 
 * Usage:
 * ```tsx
 * {count > 0 && (
 *   <BulkActionBar
 *     count={count}
 *     onPublish={handleBulkPublish}
 *     onDelete={handleBulkDelete}
 *     onClear={clearSelection}
 *   />
 * )}
 * ```
 */
export function BulkActionBar({
    count,
    onPublish,
    onUnpublish,
    onDelete,
    onChangeCategory,
    onClear,
    loading = false,
}: BulkActionBarProps) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
            <Card className="shadow-2xl border-primary/20">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-base font-bold">
                            {count}
                        </Badge>
                        <span className="text-sm font-medium">
                            {count === 1 ? "öğe seçildi" : "öğe seçildi"}
                        </span>
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {onPublish && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={onPublish}
                                disabled={loading}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Yayınla
                            </Button>
                        )}

                        {onUnpublish && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onUnpublish}
                                disabled={loading}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Yayından Kaldır
                            </Button>
                        )}

                        {onChangeCategory && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onChangeCategory}
                                disabled={loading}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Kategori Değiştir
                            </Button>
                        )}

                        {onDelete && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={onDelete}
                                disabled={loading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                            </Button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Clear */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClear}
                        disabled={loading}
                    >
                        İptal
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Bulk Action Confirmation Dialog Hook
 */
export function useBulkActions() {
    const { toast } = useToast();

    const confirmAction = async (
        action: string,
        count: number,
        execute: () => Promise<void>
    ) => {
        const confirmed = confirm(
            `${count} öğe için ${action} işlemi yapılacak. Emin misiniz?`
        );

        if (!confirmed) return false;

        try {
            await execute();

            toast({
                title: "Başarılı ✅",
                description: `${count} öğe için ${action} işlemi tamamlandı`,
            });

            return true;
        } catch (error) {
            toast({
                title: "Hata ❌",
                description:
                    error instanceof Error ? error.message : "İşlem başarısız oldu",
                variant: "destructive",
            });

            return false;
        }
    };

    return { confirmAction };
}
