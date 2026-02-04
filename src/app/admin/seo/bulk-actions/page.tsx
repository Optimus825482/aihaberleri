"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface BulkResult {
  success: boolean;
  processed: number;
  failed: number;
  duration: number;
  errors?: string[];
}

export default function BulkActionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkResult | null>(null);
  const { toast } = useToast();

  // FIX #4: useState misuse fix - Convert to useEffect
  // Skill: vercel-react-best-practices → rerender-move-effect-to-event
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories");

        if (!response.ok) {
          throw new Error("Kategoriler yüklenemedi");
        }

        const data = await response.json();

        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error("Kategoriler yüklenemedi:", error);
        toast({
          title: "Hata",
          description: "Kategoriler yüklenemedi",
          variant: "destructive",
        });
      }
    };

    loadCategories();
  }, [toast]);

  const handleRecalculate = async () => {
    if (
      !confirm(
        selectedCategory === "all"
          ? "Tüm makaleler için SEO skorları yeniden hesaplanacak. Devam etmek istiyor musunuz?"
          : "Seçili kategori için SEO skorları yeniden hesaplanacak. Devam etmek istiyor musunuz?",
      )
    ) {
      return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }

      const response = await fetch(
        `/api/admin/seo/bulk-recalculate?${params}`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        toast({
          title: "Başarılı",
          description: `${data.data.processed} makale işlendi`,
        });
      } else {
        throw new Error(data.error || "İşlem başarısız");
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ format });
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }

      const response = await fetch(`/api/admin/seo/export?${params}`);

      if (!response.ok) {
        throw new Error("Export başarısız");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seo-report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Başarılı",
        description: "Rapor indirildi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link
              href="/admin/seo"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              SEO Dashboard&apos;a Dön
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold">
              SEO Toplu İşlemler
            </h1>
            <p className="text-muted-foreground mt-2">
              Toplu SEO hesaplama ve raporlama işlemleri
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Kategori Seçimi
            </CardTitle>
            <CardDescription>İşlem yapılacak kategoriyi seçin</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Kategori Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Recalculate Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              SEO Skorlarını Yeniden Hesapla
            </CardTitle>
            <CardDescription>
              Seçili kategorideki tüm makaleler için SEO skorları ve önerileri
              yeniden hesaplanır
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRecalculate}
                disabled={loading}
                className="font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Hesaplamayı Başlat
                  </>
                )}
              </Button>
              <Badge variant="outline" className="font-bold">
                {selectedCategory === "all"
                  ? "Tüm Makaleler"
                  : categories.find((c) => c.slug === selectedCategory)?.name ||
                    "Seçili Kategori"}
              </Badge>
            </div>

            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Makaleler işleniyor...
                </p>
              </div>
            )}

            {result && (
              <div className="p-4 border rounded-lg bg-card space-y-3">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-bold">İşlem Tamamlandı</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">İşlenen</p>
                    <p className="text-2xl font-bold text-green-500">
                      {result.processed}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Başarısız</p>
                    <p className="text-2xl font-bold text-red-500">
                      {result.failed}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Süre</p>
                    <p className="text-2xl font-bold">
                      {(result.duration / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-destructive">
                      Hatalar:
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <p
                          key={index}
                          className="text-xs text-muted-foreground p-2 bg-destructive/10 rounded"
                        >
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              SEO Raporu İndir
            </CardTitle>
            <CardDescription>
              Seçili kategorideki makalelerin SEO raporunu indirin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <FileJson className="h-4 w-4 mr-2" />
                JSON Olarak İndir
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV Olarak İndir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Bilgilendirme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Toplu hesaplama işlemi makale sayısına bağlı olarak birkaç
              dakika sürebilir
            </p>
            <p>
              • Hesaplama sırasında mevcut SEO skorları ve önerileri
              güncellenecektir
            </p>
            <p>
              • Export işlemi seçili kategorideki tüm makalelerin güncel SEO
              verilerini içerir
            </p>
            <p>
              • JSON formatı detaylı veri analizi için, CSV formatı
              Excel&apos;de görüntüleme için uygundur
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
