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
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, RefreshCw, Eye, Search, Plus } from "lucide-react";
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
  category: {
    name: string;
  };
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshingImage, setRefreshingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch("/api/articles");
      const data = await response.json();
      if (data.success) {
        setArticles(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Bu haberi silmek istediğinizden emin misiniz?")) return;

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Haber başarıyla silindi");
        fetchArticles();
      } else {
        console.error("Silme hatası:", data);
        alert(`Haber silinemedi: ${data.error || "Bilinmeyen hata"}`);
      }
    } catch (error) {
      console.error("Silme hatası:", error);
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
        fetchArticles();
      } else {
        alert("Görsel güncellenemedi");
      }
    } catch (error) {
      alert("Bir hata oluştu");
    } finally {
      setRefreshingImage(null);
    }
  };

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(search.toLowerCase()),
  );

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
                  Toplam {articles.length} haber
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
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
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">
                          Görüntülenme
                        </TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArticles.map((article) => (
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

            {filteredArticles.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {search
                  ? "Arama sonucu bulunamadı"
                  : "Henüz haber yok. Haber tarama veya manuel ekleme yapabilirsiniz."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
