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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Calendar,
  Globe,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface Article {
  id: string;
  title: string;
  slug: string;
  language: "tr" | "en";
  publishedAt: string;
  category: string;
  googleIndexed: boolean;
  googleIndexedAt: string | null;
  googleIndexStatus: "PENDING" | "SUBMITTED" | "FAILED";
  googleIndexingScheduled: boolean;
  googleIndexingScheduledAt: string | null;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

interface QuotaInfo {
  todayUsed: number;
  limit: number;
  remaining: number;
}

export default function GoogleIndexingBatchPage() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null,
  );
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);

  // Filters
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all", "indexed", "not_indexed"
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch unindexed articles
  useEffect(() => {
    fetchUnindexedArticles();
  }, [languageFilter, statusFilter, dateFrom, dateTo]);

  const fetchUnindexedArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (languageFilter !== "all") params.append("language", languageFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const response = await fetch(
        `/api/admin/google-indexing/unindexed?${params.toString()}`,
      );
      const data = await response.json();

      if (data.success) {
        setArticles(data.articles);
      } else {
        toast({
          title: "Hata",
          description: data.error || "Haberler yüklenemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      toast({
        title: "Hata",
        description: "Haberler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle article selection
  const toggleArticle = (articleId: string) => {
    const newSelection = new Set(selectedArticles);
    if (newSelection.has(articleId)) {
      newSelection.delete(articleId);
    } else {
      newSelection.add(articleId);
    }
    setSelectedArticles(newSelection);
  };

  // Select all filtered articles
  const toggleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map((a) => a.id)));
    }
  };

  // Filter articles by search query
  const filteredArticles = articles.filter((article) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(query) ||
        article.slug.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Submit batch for tomorrow
  const handleBatchSubmit = async () => {
    if (selectedArticles.size === 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen en az bir haber seçin",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setBatchProgress({
      total: selectedArticles.size,
      completed: 0,
      failed: 0,
      inProgress: true,
    });

    try {
      const response = await fetch("/api/admin/google-indexing/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: Array.from(selectedArticles),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: `${selectedArticles.size} haber yarın için planlandı`,
        });

        // Clear selection and refresh
        setSelectedArticles(new Set());
        fetchUnindexedArticles();

        // Simulate progress (in real app, use WebSocket or polling)
        simulateProgress();
      } else {
        toast({
          title: "Hata",
          description: data.error || "Batch işlemi başarısız",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Batch submit failed:", error);
      toast({
        title: "Hata",
        description: "Batch işlemi sırasında bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Simulate progress (replace with real polling/WebSocket)
  const simulateProgress = () => {
    let completed = 0;
    const total = selectedArticles.size;

    const interval = setInterval(() => {
      completed += 1;
      setBatchProgress({
        total,
        completed,
        failed: 0,
        inProgress: completed < total,
      });

      if (completed >= total) {
        clearInterval(interval);
        setTimeout(() => {
          setBatchProgress(null);
        }, 3000);
      }
    }, 500);
  };

  // Reset filters
  const resetFilters = () => {
    setLanguageFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  // Check Google indexing status for selected articles
  const handleCheckStatus = async () => {
    if (selectedArticles.size === 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen en az bir haber seçin",
        variant: "destructive",
      });
      return;
    }

    setCheckingStatus(true);

    try {
      const response = await fetch("/api/admin/google-indexing/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: Array.from(selectedArticles),
        }),
      });

      const data = await response.json();

      // Quota bilgisini güncelle
      if (data.quotaRemaining !== undefined) {
        setQuotaInfo({
          todayUsed: 50 - data.quotaRemaining,
          limit: 50,
          remaining: data.quotaRemaining,
        });
      }

      if (response.status === 429) {
        // Quota aşıldı
        toast({
          title: "Günlük Limit Doldu",
          description: data.error || "Yarın tekrar deneyin",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        const skippedMsg = data.skipped > 0 ? `, ${data.skipped} atlandı (cache)` : "";
        toast({
          title: "Kontrol Tamamlandı",
          description: `✅ ${data.indexed} bildirilmiş, ❌ ${data.notIndexed} bildirilmemiş${skippedMsg}`,
        });

        // Clear selection and refresh
        setSelectedArticles(new Set());
        fetchUnindexedArticles();
      } else {
        toast({
          title: "Hata",
          description: data.error || "Durum kontrolü başarısız",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Status check failed:", error);
      toast({
        title: "Hata",
        description: "Durum kontrolü sırasında bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  // Get status badge
  const getStatusBadge = (article: Article) => {
    if (article.googleIndexed && article.googleIndexedAt) {
      // Bildirilmiş ve onaylanmış
      return (
        <Badge className="border-green-500/30 text-green-600 bg-green-500/10">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Bildirildi
        </Badge>
      );
    } else if (article.googleIndexingScheduled) {
      // Batch'e eklendi, yarın gönderilecek
      return (
        <Badge className="border-blue-500/30 text-blue-600 bg-blue-500/10">
          <Clock className="h-3 w-3 mr-1" />
          Planlandı
        </Badge>
      );
    } else {
      // Henüz bildirilmedi
      return (
        <Badge className="border-yellow-500/30 text-yellow-600 bg-yellow-500/10">
          <XCircle className="h-3 w-3 mr-1" />
          Bekliyor
        </Badge>
      );
    }
  };

  const progressPercentage = batchProgress
    ? (batchProgress.completed / batchProgress.total) * 100
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Google Indexing <span className="text-primary italic">Batch</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Toplu Google bildirim yönetimi
            </p>
            {quotaInfo && (
              <Badge
                variant={quotaInfo.remaining > 10 ? "outline" : "destructive"}
                className="mt-1"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Status Check: {quotaInfo.remaining}/{quotaInfo.limit} kaldı
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCheckStatus}
              disabled={selectedArticles.size === 0 || checkingStatus}
              variant="outline"
              className="font-bold"
            >
              {checkingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kontrol Ediliyor...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Google Durumunu Kontrol Et ({selectedArticles.size})
                </>
              )}
            </Button>
            <Button
              onClick={handleBatchSubmit}
              disabled={selectedArticles.size === 0 || submitting}
              className="font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Yarın İçin Planla ({selectedArticles.size})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Batch Progress */}
        {batchProgress && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-bold">Batch İşlemi Devam Ediyor</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {batchProgress.completed} / {batchProgress.total}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>✅ Tamamlanan: {batchProgress.completed}</span>
                  {batchProgress.failed > 0 && (
                    <span className="text-destructive">
                      ❌ Başarısız: {batchProgress.failed}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Filtreler</CardTitle>
            </div>
            <CardDescription>Haberleri filtrele ve arama yap</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Language Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Dil
                </Label>
                <Select
                  value={languageFilter}
                  onValueChange={setLanguageFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                    <SelectItem value="en">🇬🇧 İngilizce</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Durum
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="indexed">✅ Bildirildi</SelectItem>
                    <SelectItem value="not_indexed">⏳ Bekliyor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Başlangıç Tarihi
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Bitiş Tarihi
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Arama
                </Label>
                <Input
                  placeholder="Başlık, slug, kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {filteredArticles.length} haber bulundu
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="font-bold"
              >
                Filtreleri Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Articles Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tüm Haberler</CardTitle>
                <CardDescription>
                  Yayınlanmış tüm haberlerin Google bildirim durumu
                </CardDescription>
              </div>
              {filteredArticles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="font-bold"
                >
                  {selectedArticles.size === filteredArticles.length
                    ? "Tümünü Kaldır"
                    : "Tümünü Seç"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  Haber bulunamadı
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedArticles.size === filteredArticles.length
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Dil</TableHead>
                      <TableHead>Yayın Tarihi</TableHead>
                      <TableHead>Google Bildirimi</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map((article) => (
                      <TableRow
                        key={article.id}
                        className={
                          selectedArticles.has(article.id) ? "bg-primary/5" : ""
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedArticles.has(article.id)}
                            onCheckedChange={() => toggleArticle(article.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="font-medium truncate">
                              {article.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              /{article.slug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{article.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              article.language === "tr"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {article.language === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(
                              new Date(article.publishedAt),
                              "dd MMM yyyy HH:mm",
                              { locale: tr },
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {article.googleIndexedAt ? (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {format(
                                new Date(article.googleIndexedAt),
                                "dd MMM yyyy HH:mm",
                                { locale: tr },
                              )}
                            </div>
                          ) : article.googleIndexingScheduledAt ? (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <Clock className="h-3 w-3" />
                              {format(
                                new Date(article.googleIndexingScheduledAt),
                                "dd MMM yyyy HH:mm",
                                { locale: tr },
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(article)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
