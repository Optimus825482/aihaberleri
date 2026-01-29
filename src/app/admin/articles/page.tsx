"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Search,
  Plus,
  Facebook,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Image from "next/image";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string | null;
  status: string;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  category: {
    name: string;
    slug: string;
  };
  score: number;
  facebookShared: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [refreshingImage, setRefreshingImage] = useState<string | null>(null);
  const [sharingFacebook, setSharingFacebook] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalArticles, setTotalArticles] = useState(0);

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, search, categoryFilter]); // Add search and categoryFilter

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (search) {
        params.append("search", search);
      }

      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }

      const [articlesRes, categoriesRes] = await Promise.all([
        fetch(`/api/articles?${params}`),
        fetch("/api/categories"),
      ]);

      const articlesData = await articlesRes.json();
      const categoriesData = await categoriesRes.json();

      if (articlesData.success) {
        setArticles(articlesData.data);
        if (articlesData.pagination) {
          setTotalArticles(articlesData.pagination.total);
        } else {
          // Fallback for non-paginated API response
          setTotalArticles(articlesData.data.length);
        }
      }
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Bu haberi silmek istediğinizden emin misiniz?")) return;

    // Optimistic update - immediately remove from UI
    const previousArticles = [...articles];
    setArticles((prev) => prev.filter((article) => article.id !== id));

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - show confirmation
        alert("Haber başarıyla silindi");
        // Refresh to get updated counts
        fetchData();
      } else {
        // Rollback on error
        console.error("Silme hatası:", data);
        setArticles(previousArticles);
        alert(`Haber silinemedi: ${data.error || "Bilinmeyen hata"}`);
      }
    } catch (error) {
      // Rollback on error
      console.error("Silme hatası:", error);
      setArticles(previousArticles);
      alert("Bir hata oluştu");
    }
  };

  const refreshImage = async (id: string) => {
    setRefreshingImage(id);

    try {
      const response = await fetch(`/api/articles/${id}/refresh-image`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Görsel güncellendi");
        // Optimistic update - refresh only this article
        const updatedArticle = await fetch(`/api/articles/${id}`).then((r) =>
          r.json(),
        );
        if (updatedArticle.success) {
          setArticles((prev) =>
            prev.map((a) =>
              a.id === id
                ? { ...a, imageUrl: updatedArticle.data.imageUrl }
                : a,
            ),
          );
        }
      } else {
        alert("Görsel güncellenemedi");
      }
    } catch (error) {
      alert("Bir hata oluştu");
    } finally {
      setRefreshingImage(null);
    }
  };

  const shareFacebook = async (id: string) => {
    setSharingFacebook(id);

    // Optimistic update - mark as shared immediately
    const previousArticles = [...articles];
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, facebookShared: true } : a)),
    );

    try {
      const response = await fetch(`/api/admin/articles/${id}/share-facebook`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Facebook'ta başarıyla paylaşıldı!");
      } else {
        // Rollback on error
        setArticles(previousArticles);
        alert(data.error || "Facebook paylaşımı başarısız");
      }
    } catch (error) {
      // Rollback on error
      console.error("Facebook share error:", error);
      setArticles(previousArticles);
      alert("Bir hata oluştu");
    } finally {
      setSharingFacebook(null);
    }
  };

  // Server-side filtering - no client-side filtering needed
  const displayArticles = articles;
  const totalPages = Math.ceil(totalArticles / pageSize);

  // Reset to page 1 when filters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [search, categoryFilter, pageSize]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Haberler</h1>
            <p className="text-muted-foreground mt-2">
              Tüm haberleri görüntüle ve yönet
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push("/admin/articles/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Haber Ekle
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Haber Listesi</CardTitle>
                <CardDescription>
                  {totalArticles > 0 ? (
                    <>
                      {(currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, totalArticles)} arası
                      gösteriliyor (Toplam {totalArticles} haber)
                    </>
                  ) : (
                    "Toplam 0 haber"
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / sayfa</SelectItem>
                    <SelectItem value="25">25 / sayfa</SelectItem>
                    <SelectItem value="50">50 / sayfa</SelectItem>
                    <SelectItem value="100">100 / sayfa</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
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
                <div className="relative flex-1 sm:flex-initial w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Haber ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Görsel</TableHead>
                        <TableHead>Başlık</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Eklenme Tarihi</TableHead>
                        <TableHead>Skor</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-center">Facebook</TableHead>
                        <TableHead className="text-right">
                          Görüntülenme
                        </TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayArticles.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell>
                            {article.imageUrl ? (
                              <div className="relative w-16 h-16 rounded overflow-hidden">
                                <Image
                                  src={article.imageUrl}
                                  alt={article.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  Yok
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium line-clamp-1">
                                {article.title}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {article.excerpt}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {article.category.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(
                                  article.publishedAt || article.createdAt,
                                ).toLocaleDateString("tr-TR")}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {new Date(
                                  article.publishedAt || article.createdAt,
                                ).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span
                                className={`font-bold ${
                                  (article.score || 0) >= 800
                                    ? "text-green-600"
                                    : (article.score || 0) >= 500
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                }`}
                              >
                                {article.score || 0}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                /1000
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                article.status === "PUBLISHED"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {article.status === "PUBLISHED"
                                ? "Yayında"
                                : "Taslak"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {article.facebookShared ? (
                                <Badge
                                  variant="default"
                                  className="gap-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Paylaşıldı
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => shareFacebook(article.id)}
                                  disabled={
                                    sharingFacebook === article.id ||
                                    article.status !== "PUBLISHED"
                                  }
                                  className="gap-1"
                                  title={
                                    article.status !== "PUBLISHED"
                                      ? "Sadece yayında olan haberler paylaşılabilir"
                                      : "Facebook'ta paylaş"
                                  }
                                >
                                  {sharingFacebook === article.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Facebook className="h-4 w-4" />
                                  )}
                                  Paylaş
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span>{article.views}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => refreshImage(article.id)}
                                disabled={refreshingImage === article.id}
                                title="Görseli Güncelle"
                              >
                                <RefreshCw
                                  className={`h-4 w-4 ${refreshingImage === article.id ? "animate-spin" : ""}`}
                                />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  window.open(`/news/${article.slug}`, "_blank")
                                }
                                title="Görüntüle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  router.push(
                                    `/admin/articles/${article.id}/edit`,
                                  )
                                }
                                title="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteArticle(article.id)}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {displayArticles.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                {search || categoryFilter !== "all"
                  ? "Arama sonucu bulunamadı"
                  : "Henüz haber yok. Haber tarama veya manuel ekleme yapabilirsiniz."}
              </div>
            )}

            {/* Pagination Controls */}
            {totalArticles > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Sayfa {currentPage} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Son
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
