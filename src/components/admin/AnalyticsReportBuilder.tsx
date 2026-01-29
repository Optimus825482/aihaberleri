"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, TrendingUp, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ExportButton } from "./ExportButton";

interface DateRange {
    from: Date | undefined;
    to: Date | undefined;
}

/**
 * Analytics Report Builder
 * Custom date range and format selection for reports
 */
export function AnalyticsReportBuilder() {
    const [dateRange, setDateRange] = useState<DateRange>({
        from: undefined,
        to: undefined,
    });
    const [reportType, setReportType] = useState<string>("summary");
    const [loading, setLoading] = useState(false);

    const handleGenerateReport = async (format: "excel" | "pdf") => {
        setLoading(true);

        try {
            const params = new URLSearchParams({
                type: reportType,
                format,
                ...(dateRange.from && { from: dateRange.from.toISOString() }),
                ...(dateRange.to && { to: dateRange.to.toISOString() }),
            });

            const response = await fetch(`/api/admin/reports?${params}`);

            if (!response.ok) {
                throw new Error("Report generation failed");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `report_${Date.now()}.${format === "excel" ? "xlsx" : "pdf"}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Report generation error:", error);
        } finally {
            setLoading(false);
        }
    };

    const isValidDateRange = dateRange.from && dateRange.to;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Rapor Oluştur
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Report Type */}
                <div className="space-y-2">
                    <Label>Rapor Türü</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="summary">Özet Rapor</SelectItem>
                            <SelectItem value="detailed">Detaylı Analiz</SelectItem>
                            <SelectItem value="articles">Makale Performansı</SelectItem>
                            <SelectItem value="categories">Kategori Analizi</SelectItem>
                            <SelectItem value="traffic">Trafik Analizi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                    <Label>Tarih Aralığı</Label>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "flex-1 justify-start text-left font-normal",
                                        !dateRange.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                        format(dateRange.from, "PPP", { locale: tr })
                                    ) : (
                                        <span>Başlangıç</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateRange.from}
                                    onSelect={(date) =>
                                        setDateRange({ ...dateRange, from: date })
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
                                        !dateRange.to && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.to ? (
                                        format(dateRange.to, "PPP", { locale: tr })
                                    ) : (
                                        <span>Bitiş</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateRange.to}
                                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                    <Label>Hızlı Seçim</Label>
                    <div className="flex flex-wrap gap-2">
                        <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                                const today = new Date();
                                const lastWeek = new Date(today);
                                lastWeek.setDate(today.getDate() - 7);
                                setDateRange({ from: lastWeek, to: today });
                            }}
                        >
                            Son 7 Gün
                        </Badge>
                        <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                                const today = new Date();
                                const lastMonth = new Date(today);
                                lastMonth.setDate(today.getDate() - 30);
                                setDateRange({ from: lastMonth, to: today });
                            }}
                        >
                            Son 30 Gün
                        </Badge>
                        <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                                const today = new Date();
                                const lastQuarter = new Date(today);
                                lastQuarter.setDate(today.getDate() - 90);
                                setDateRange({ from: lastQuarter, to: today });
                            }}
                        >
                            Son 3 Ay
                        </Badge>
                        <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                                const today = new Date();
                                const start = new Date(today.getFullYear(), 0, 1);
                                setDateRange({ from: start, to: today });
                            }}
                        >
                            Bu Yıl
                        </Badge>
                    </div>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-2 pt-4">
                    <Button
                        onClick={() => handleGenerateReport("excel")}
                        disabled={!isValidDateRange || loading}
                        className="flex-1"
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Excel İndir
                    </Button>
                    <Button
                        onClick={() => handleGenerateReport("pdf")}
                        disabled={!isValidDateRange || loading}
                        variant="outline"
                        className="flex-1"
                    >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        PDF İndir
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
