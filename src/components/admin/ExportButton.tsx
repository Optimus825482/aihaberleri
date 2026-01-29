"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
    onExportExcel?: () => Promise<void>;
    onExportPDF?: () => Promise<void>;
    onExportPNG?: () => Promise<void>;
    onExportSVG?: () => Promise<void>;
    loading?: boolean;
    disabled?: boolean;
}

/**
 * Export Button with Dropdown Menu
 * Provides multiple export format options
 * 
 * Usage:
 * ```tsx
 * <ExportButton
 *   onExportExcel={handleExportExcel}
 *   onExportPDF={handleExportPDF}
 *   onExportPNG={handleExportPNG}
 * />
 * ```
 */
export function ExportButton({
    onExportExcel,
    onExportPDF,
    onExportPNG,
    onExportSVG,
    loading = false,
    disabled = false,
}: ExportButtonProps) {
    const { toast } = useToast();

    const handleExport = async (
        exportFn: (() => Promise<void>) | undefined,
        format: string
    ) => {
        if (!exportFn) {
            toast({
                title: "Hata",
                description: `${format} dışa aktarımı mevcut değil`,
                variant: "destructive",
            });
            return;
        }

        try {
            await exportFn();
            toast({
                title: "Başarılı ✅",
                description: `${format} dosyası indirildi`,
            });
        } catch (error) {
            toast({
                title: "Hata ❌",
                description: `${format} dışa aktarımı başarısız oldu`,
                variant: "destructive",
            });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled || loading}
                    className="gap-2"
                >
                    <Download className="h-4 w-4" />
                    Dışa Aktar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {onExportExcel && (
                    <DropdownMenuItem
                        onClick={() => handleExport(onExportExcel, "Excel")}
                        disabled={loading}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                        Excel (.xlsx)
                    </DropdownMenuItem>
                )}
                {onExportPDF && (
                    <DropdownMenuItem
                        onClick={() => handleExport(onExportPDF, "PDF")}
                        disabled={loading}
                    >
                        <FileText className="mr-2 h-4 w-4 text-red-600" />
                        PDF (.pdf)
                    </DropdownMenuItem>
                )}
                {onExportPNG && (
                    <DropdownMenuItem
                        onClick={() => handleExport(onExportPNG, "PNG")}
                        disabled={loading}
                    >
                        <Image className="mr-2 h-4 w-4 text-blue-600" />
                        PNG (.png)
                    </DropdownMenuItem>
                )}
                {onExportSVG && (
                    <DropdownMenuItem
                        onClick={() => handleExport(onExportSVG, "SVG")}
                        disabled={loading}
                    >
                        <Image className="mr-2 h-4 w-4 text-purple-600" />
                        SVG (.svg)
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
