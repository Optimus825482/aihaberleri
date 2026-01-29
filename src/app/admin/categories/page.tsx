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
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  FileText,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    order: 0,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/categories");
      const result = await response.json();

      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
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
      } else {
        alert(result.error || "Bir hata oluştu");
      }
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Bir hata oluştu");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;

    try {
      const response = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        fetchCategories();
      } else {
        alert(result.error || "Kategori silinemedi");
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Bir hata oluştu");
    }
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
      ç: "c",
      ğ: "g",
      ı: "i",
      ö: "o",
      ş: "s",
      ü: "u",
      Ç: "c",
      Ğ: "g",
      İ: "i",
      Ö: "o",
      Ş: "s",
      Ü: "u",
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Haber <span className="text-primary italic">Kategorileri</span>
            </h1>
            <p className="text-muted-foreground">
              Kategori yönetimi ve düzenleme
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kategori
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/40 border-primary/10">
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

          <Card className="bg-card/40 border-primary/10">
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

          <Card className="bg-card/40 border-primary/10">
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
                      categories.reduce(
                        (sum, cat) => sum + cat._count.articles,
                        0,
                      ) / categories.length,
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
                    <label className="text-sm font-bold mb-2 block">
                      Kategori Adı *
                    </label>
                    <input
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
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold mb-2 block">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-bold mb-2 block">
                    Sıralama
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
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

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-black">Kategoriler</CardTitle>
            <CardDescription>
              {categories.length} kategori bulundu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold">{category.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        /{category.slug}
                      </Badge>
                      <Badge className="text-xs">
                        {category._count.articles} haber
                      </Badge>
                    </div>
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
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                      disabled={category._count.articles > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <div className="text-center py-12">
                  <Tags className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Kategori bulunamadı</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
