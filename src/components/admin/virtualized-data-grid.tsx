"use client";

import { useRef, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
    key: keyof T | string;
    header: string;
    width?: number;
    minWidth?: number;
    render?: (item: T, index: number) => React.ReactNode;
    className?: string;
}

interface VirtualizedDataGridProps<T> {
    data: T[];
    columns: Column<T>[];
    rowHeight?: number;
    maxHeight?: number;
    loading?: boolean;
    loadingRows?: number;
    emptyMessage?: string;
    onRowClick?: (item: T, index: number) => void;
    rowClassName?: (item: T, index: number) => string;
    stickyHeader?: boolean;
}

export function VirtualizedDataGrid<T extends Record<string, any>>({
    data,
    columns,
    rowHeight = 52,
    maxHeight = 600,
    loading = false,
    loadingRows = 10,
    emptyMessage = "Veri bulunamadı",
    onRowClick,
    rowClassName,
    stickyHeader = true,
}: VirtualizedDataGridProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: loading ? loadingRows : data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 5,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    const getCellValue = useCallback((item: T, column: Column<T>) => {
        if (column.render) {
            return column.render(item, data.indexOf(item));
        }
        const key = column.key as keyof T;
        const value = item[key];
        if (value === null || value === undefined) return "-";
        if (typeof value === "boolean") return value ? "Evet" : "Hayır";
        if (typeof value === "object" && value !== null && Object.prototype.toString.call(value) === "[object Date]") {
            return (value as Date).toLocaleDateString("tr-TR");
        }
        return String(value);
    }, [data]);

    // Calculate column widths
    const totalWidth = useMemo(() => {
        return columns.reduce((sum, col) => sum + (col.width || col.minWidth || 150), 0);
    }, [columns]);

    if (!loading && data.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            {/* Header */}
            {stickyHeader && (
                <div className="bg-muted/50 border-b">
                    <div
                        className="flex"
                        style={{ minWidth: totalWidth }}
                    >
                        {columns.map((column) => (
                            <div
                                key={String(column.key)}
                                className={cn(
                                    "px-4 py-3 text-sm font-semibold text-muted-foreground",
                                    column.className
                                )}
                                style={{
                                    width: column.width || column.minWidth || 150,
                                    minWidth: column.minWidth || 100,
                                    flexShrink: column.width ? 0 : 1,
                                }}
                            >
                                {column.header}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Virtualized Body */}
            <div
                ref={parentRef}
                className="overflow-auto"
                style={{ maxHeight: maxHeight - (stickyHeader ? 48 : 0) }}
            >
                <div
                    style={{
                        height: `${totalSize}px`,
                        width: "100%",
                        position: "relative",
                        minWidth: totalWidth,
                    }}
                >
                    {virtualRows.map((virtualRow) => {
                        const item = data[virtualRow.index];
                        const isLoading = loading || !item;

                        return (
                            <div
                                key={virtualRow.key}
                                className={cn(
                                    "absolute top-0 left-0 w-full flex items-center border-b transition-colors",
                                    !isLoading && onRowClick && "cursor-pointer hover:bg-muted/50",
                                    !isLoading && rowClassName?.(item, virtualRow.index)
                                )}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                onClick={() => !isLoading && onRowClick?.(item, virtualRow.index)}
                            >
                                {columns.map((column) => (
                                    <div
                                        key={String(column.key)}
                                        className={cn("px-4 py-3 text-sm truncate", column.className)}
                                        style={{
                                            width: column.width || column.minWidth || 150,
                                            minWidth: column.minWidth || 100,
                                            flexShrink: column.width ? 0 : 1,
                                        }}
                                    >
                                        {isLoading ? (
                                            <Skeleton className="h-4 w-3/4" />
                                        ) : (
                                            getCellValue(item, column)
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Stats */}
            {!loading && data.length > 0 && (
                <div className="bg-muted/30 border-t px-4 py-2 text-xs text-muted-foreground">
                    Toplam {data.length.toLocaleString("tr-TR")} kayıt
                    {data.length > 100 && " (virtualized görüntüleme)"}
                </div>
            )}
        </div>
    );
}

/**
 * Simple virtualized list for non-table data
 */
interface VirtualizedListProps<T> {
    items: T[];
    itemHeight: number;
    maxHeight?: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
}

export function VirtualizedList<T>({
    items,
    itemHeight,
    maxHeight = 400,
    renderItem,
    className,
}: VirtualizedListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemHeight,
        overscan: 3,
    });

    return (
        <div
            ref={parentRef}
            className={cn("overflow-auto", className)}
            style={{ maxHeight }}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                        key={virtualItem.key}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                        }}
                    >
                        {renderItem(items[virtualItem.index], virtualItem.index)}
                    </div>
                ))}
            </div>
        </div>
    );
}
