"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  FileText,
  Eye,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    articles: number;
  };
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  views: number;
  category: {
    name: string;
    slug: string;
  };
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [categoryArticles, setCategoryArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    order: 0,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab) {
      fetchCategoryArticles(activeTab);
    }
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/categories");
      const result = await response.json();

      if (result.success) {
        setCategories(result.data);
        if (result.data.length > 0 && !activeTab) {
          setActiveTab(result.data[0].slug);
        }
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryArticles = async (slug: string) => {
    try {
      setArticlesLoading(true);
      const response = await fetch(
        `/api/admin/articles?category=${slug}&sortBy=publishedAt&sortOrder=desc&limit=50`
      );
      const result = await response.json();

      if (result.success) {
        setCategoryArticles(result.data.articles || []);
      }
    } catch (error) {
      console.error("Failed to fetch category articles:", error);
    } finally {
      setArticlesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = "/api/admin/categories";
      const method = editingCategory ? "PATCH" : "POST";
      const body = editingCategory
        ? { id: editingCategory.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        fetchCategories();
        resetForm();
        toast({
          title: "Başarılı",
          description: editingCategory ? "Kategori güncellendi" : "Kategori oluşturuldu",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: result.error || "Bir hata oluştu",
        });
      }
    } catch (error) {
      console.error("Failed to save category:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu",
      });
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    const { id } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const response = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        fetchCategories();
        toast({
          title: "Başarılı",
          description: "Kategori silindi",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: result.error || "Kategori silinemedi",
        });
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu",
      });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      order: category.order,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "", order: 0 });
    setShowForm(false);
  };

  const generateSlug = (name: string) => {
    const turkishMap: Record<string, string> = {
      ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
      Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
    };

    return name
      .toLowerCase()
      .split("")
      .map((char) => turkishMap[char] || char)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.name} kategorisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Haber <span className="text-primary italic">Kategorileri</span>
            </h1>
            <p className="text-muted-foreground">
              Kategori yönetimi ve haber listesi
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kategori
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/40 border-blue-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Toplam Kategori
                </span>
                <Tags className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black">{categories.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-green-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Toplam Haber
                </span>
                <FileText className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-black">
                {categories.reduce((sum, cat) => sum + cat._count.articles, 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-purple-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ortalama Haber
                </span>
                <FileText className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black">
                {categories.length > 0
                  ? Math.round(
                    categories.reduce((sum, cat) => sum + cat._count.articles, 0) /
                    categories.length
                  )
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg font-black">
                {editingCategory ? "Kategori Düzenle" : "Yeni Kategori Ekle"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category-name" className="text-sm font-bold mb-2 block">
                      Kategori Adı *
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          name: e.target.value,
                          slug: generateSlug(e.target.value),
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Kategori adı girin"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="category-slug" className="text-sm font-bold mb-2 block">
                      Slug *
                    </label>
                    <input
                      id="category-slug"
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="kategori-slug"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category-description" className="text-sm font-bold mb-2 block">
                    Açıklama
                  </label>
                  <textarea
                    id="category-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Kategori açıklaması"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="category-order" className="text-sm font-bold mb-2 block">
                    Sıralama
                  </label>
                  <input
                    id="category-order"
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="0"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="font-bold">
                    {editingCategory ? "Güncelle" : "Ekle"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="font-bold"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Category Tabs with Articles */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black">Kategori Haberleri</CardTitle>
                <CardDescription>
                  Kategoriye tıklayarak haberleri görüntüleyin
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {categories.length > 0 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category.slug}
                      value={category.slug}
                      className="relative data-[state=active]:bg-primary data-[state=active]:text-white font-medium text-sm px-4 py-2"
                    >
                      {category.name}
                      <Badge
                        variant="secondary"
                        className="ml-2 h-5 px-1.5 text-xs data-[state=active]:bg-white/20"
                      >
                        {category._count.articles}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {categories.map((category) => (
                  <TabsContent key={category.slug} value={category.slug} className="mt-4">
                    {/* Category Info & Actions */}
                    <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/30">
                      <div>
                        <h3 className="font-bold text-lg">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editCategory(category)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Düzenle
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteCategory(category.id, category.name)}
                          disabled={category._count.articles > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Articles Table */}
                    {articlesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : categoryArticles.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="font-bold">Başlık</TableHead>
                              <TableHead className="font-bold w-[100px]">Durum</TableHead>
                              <TableHead className="font-bold w-[100px]">Okuma</TableHead>
                              <TableHead className="font-bold w-[150px]">Tarih</TableHead>
                              <TableHead className="font-bold w-[80px]">İşlem</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryArticles.map((article) => (
                              <TableRow key={article.id} className="hover:bg-muted/30">
                                <TableCell>
                                  <div className="max-w-md">
                                    <p className="font-medium line-clamp-1">{article.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      /{article.slug}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      article.status === "PUBLISHED"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {article.status === "PUBLISHED" ? "Yayında" : "Taslak"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {article.views?.toLocaleString("tr-TR") || 0}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {article.publishedAt
                                      ? formatDistanceToNow(new Date(article.publishedAt), {
                                        addSuffix: true,
                                        locale: tr,
                                      })
                                      : formatDistanceToNow(new Date(article.createdAt), {
                                        addSuffix: true,
                                        locale: tr,
                                      })}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Link href={`/admin/articles/${article.id}`}>
                                      <Button variant="ghost" size="sm">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                    <Link
                                      href={`/haberler/${article.slug}`}
                                      target="_blank"
                                    >
                                      <Button variant="ghost" size="sm">
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          Bu kategoride henüz haber yok
                        </p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Tags className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Kategori bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
