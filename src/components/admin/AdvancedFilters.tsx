"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterValues {
    search: string;
    category: string;
    status: "all" | "PUBLISHED" | "DRAFT";
    dateRange: {
        from: Date | undefined;
        to: Date | undefined;
    };
    scoreRange: [number, number];
    viewsRange: [number, number];
    sortBy: "newest" | "oldest" | "popular" | "score" | "views";
}

interface AdvancedFiltersProps {
    filters: FilterValues;
    onFiltersChange: (filters: FilterValues) => void;
    categories: Array<{ id: string; name: string }>;
    stats?: {
        maxScore: number;
        maxViews: number;
    };
}

/**
 * Advanced Filters Panel for Articles
 * 
 * Features:
 * - Search by title
 * - Filter by category
 * - Filter by status (published/draft)
 * - Date range picker
 * - Score range slider
 * - Views range slider
 * - Sort options
 * - Clear all filters
 */
export function AdvancedFilters({
    filters,
    onFiltersChange,
    categories,
    stats = { maxScore: 1000, maxViews: 100000 },
}: AdvancedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);

    const updateFilter = (key: keyof FilterValues, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFiltersChange({
            search: "",
            category: "all",
            status: "all",
            dateRange: { from: undefined, to: undefined },
            scoreRange: [0, stats.maxScore],
            viewsRange: [0, stats.maxViews],
            sortBy: "newest",
        });
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.search) count++;
        if (filters.category !== "all") count++;
        if (filters.status !== "all") count++;
        if (filters.dateRange.from || filters.dateRange.to) count++;
        if (filters.scoreRange[0] > 0 || filters.scoreRange[1] < stats.maxScore) count++;
        if (filters.viewsRange[0] > 0 || filters.viewsRange[1] < stats.maxViews) count++;
        return count;
    };

    const activeFilterCount = getActiveFilterCount();

    return (
        <div className="space-y-4">
            {/* Filter Toggle Button */}
            <div className="flex items-center justify-between gap-2">
                <Button
                    variant="outline"
                    onClick={() => setIsOpen(!isOpen)}
                    className="gap-2"
                >
                    <Filter className="h-4 w-4" />
                    Gelişmiş Filtreler
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>

                {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" />
                        Filtreleri Temizle
                    </Button>
                )}
            </div>

            {/* Filter Panel */}
            {isOpen && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Filtreler</CardTitle>
                        <CardDescription>
                            Makaleleri detaylı kriterlere göre filtreleyin
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Search */}
                        <div className="space-y-2">
                            <Label htmlFor="search">Ara</Label>
                            <Input
                                id="search"
                                placeholder="Başlık veya içerik..."
                                value={filters.search}
                                onChange={(e) => updateFilter("search", e.target.value)}
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Select
                                value={filters.category}
                                onValueChange={(value) => updateFilter("category", value)}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Kategori seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Durum</Label>
                            <Select
                                value={filters.status}
                                onValueChange={(value: any) => updateFilter("status", value)}
                            >
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Durum seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tümü</SelectItem>
                                    <SelectItem value="PUBLISHED">Yayında</SelectItem>
                                    <SelectItem value="DRAFT">Taslak</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2 md:col-span-2">
                            <Label>Tarih Aralığı</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal",
                                                !filters.dateRange.from && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.dateRange.from ? (
                                                format(filters.dateRange.from, "PPP", { locale: tr })
                                            ) : (
                                                <span>Başlangıç</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={filters.dateRange.from}
                                            onSelect={(date) =>
                                                updateFilter("dateRange", {
                                                    ...filters.dateRange,
                                                    from: date,
                                                })
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal",
                                                !filters.dateRange.to && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.dateRange.to ? (
                                                format(filters.dateRange.to, "PPP", { locale: tr })
                                            ) : (
                                                <span>Bitiş</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={filters.dateRange.to}
                                            onSelect={(date) =>
                                                updateFilter("dateRange", {
                                                    ...filters.dateRange,
                                                    to: date,
                                                })
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Sort By */}
                        <div className="space-y-2">
                            <Label htmlFor="sortBy">Sıralama</Label>
                            <Select
                                value={filters.sortBy}
                                onValueChange={(value: any) => updateFilter("sortBy", value)}
                            >
                                <SelectTrigger id="sortBy">
                                    <SelectValue placeholder="Sıralama seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">En Yeni</SelectItem>
                                    <SelectItem value="oldest">En Eski</SelectItem>
                                    <SelectItem value="popular">En Popüler</SelectItem>
                                    <SelectItem value="score">En Yüksek Skor</SelectItem>
                                    <SelectItem value="views">En Çok Görüntülenen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Score Range */}
                        <div className="space-y-2 md:col-span-2">
                            <Label>
                                Skor Aralığı: {filters.scoreRange[0]} - {filters.scoreRange[1]}
                            </Label>
                            <Slider
                                min={0}
                                max={stats.maxScore}
                                step={10}
                                value={filters.scoreRange}
                                onValueChange={(value) =>
                                    updateFilter("scoreRange", value as [number, number])
                                }
                                className="mt-2"
                            />
                        </div>

                        {/* Views Range */}
                        <div className="space-y-2 md:col-span-2">
                            <Label>
                                Görüntüleme Aralığı: {filters.viewsRange[0]} -{" "}
                                {filters.viewsRange[1]}
                            </Label>
                            <Slider
                                min={0}
                                max={stats.maxViews}
                                step={100}
                                value={filters.viewsRange}
                                onValueChange={(value) =>
                                    updateFilter("viewsRange", value as [number, number])
                                }
                                className="mt-2"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Filters Display */}
            {activeFilterCount > 0 && !isOpen && (
                <div className="flex flex-wrap gap-2">
                    {filters.search && (
                        <Badge variant="secondary">
                            Arama: {filters.search}
                            <button
                                className="ml-2 hover:text-destructive"
                                onClick={() => updateFilter("search", "")}
                                aria-label="Arama filtresini kaldır"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {filters.category !== "all" && (
                        <Badge variant="secondary">
                            Kategori: {categories.find((c) => c.id === filters.category)?.name}
                            <button
                                className="ml-2 hover:text-destructive"
                                onClick={() => updateFilter("category", "all")}
                                aria-label="Kategori filtresini kaldır"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {filters.status !== "all" && (
                        <Badge variant="secondary">
                            Durum: {filters.status === "PUBLISHED" ? "Yayında" : "Taslak"}
                            <button
                                className="ml-2 hover:text-destructive"
                                onClick={() => updateFilter("status", "all")}
                                aria-label="Durum filtresini kaldır"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {(filters.dateRange.from || filters.dateRange.to) && (
                        <Badge variant="secondary">
                            Tarih Aralığı
                            <button
                                className="ml-2 hover:text-destructive"
                                onClick={() =>
                                    updateFilter("dateRange", { from: undefined, to: undefined })
                                }
                                aria-label="Tarih filtresini kaldır"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
