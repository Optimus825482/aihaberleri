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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Image from "next/image";
import { SEOPanel } from "@/components/admin/SEOPanel";
import { SchedulePublish } from "@/components/admin/SchedulePublish";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  status: string;
  categoryId: string;
  keywords: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  seoScore?: number;
  scheduledPublishAt?: string | null;
}

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [articleId, setArticleId] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    categoryId: "",
    status: "DRAFT",
    keywords: "",
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    params.then((p) => {
      setArticleId(p.id);
      fetchData(p.id);
    });
  }, []);

  const fetchData = async (id: string) => {
    try {
      // Fetch categories
      const categoriesRes = await fetch("/api/categories");
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }

      // Fetch article
      const articleRes = await fetch(`/api/articles/${id}`);
      const articleData = await articleRes.json();
      if (articleData.success) {
        const art = articleData.data;
        setArticle(art);
        setFormData({
          title: art.title,
          excerpt: art.excerpt,
          content: art.content,
          imageUrl: art.imageUrl || "",
          categoryId: art.categoryId,
          status: art.status,
          keywords: art.keywords?.join(", ") || "",
          metaTitle: art.metaTitle || "",
          metaDescription: art.metaDescription || "",
        });
      }
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
      alert("Haber yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          keywords: formData.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      if (response.ok) {
        alert("Haber güncellendi!");
        router.push("/admin/articles");
      } else {
        const data = await response.json();
        alert(data.error || "Haber güncellenemedi");
      }
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      alert("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!article) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Haber bulunamadı</p>
          <Button
            onClick={() => router.push("/admin/articles")}
            className="mt-4"
          >
            Geri Dön
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/articles")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Haber Düzenle</h1>
            <p className="text-muted-foreground mt-2">
              Haber bilgilerini güncelleyin
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Temel Bilgiler */}
            <Card>
              <CardHeader>
                <CardTitle>Temel Bilgiler</CardTitle>
                <CardDescription>
                  Haberin başlık, özet ve içerik bilgileri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Başlık *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="Haber başlığı"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Özet *</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData({ ...formData, excerpt: e.target.value })
                    }
                    required
                    rows={3}
                    placeholder="Kısa özet (150-200 karakter)"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.excerpt.length} karakter
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">İçerik *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    required
                    rows={15}
                    placeholder="Haber içeriği (Markdown destekli)"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.content.length} karakter
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Görsel ve Kategori */}
            <Card>
              <CardHeader>
                <CardTitle>Görsel ve Kategori</CardTitle>
                <CardDescription>Haberin görseli ve kategorisi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Görsel URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    placeholder="https://images.unsplash.com/..."
                  />
                  {formData.imageUrl && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <Image
                        src={formData.imageUrl}
                        alt="Önizleme"
                        fill
                        className="object-cover"
                        unoptimized={formData.imageUrl.includes('pollinations.ai')}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Durum *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Taslak</SelectItem>
                      <SelectItem value="PUBLISHED">Yayında</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* SEO Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Bilgileri</CardTitle>
                <CardDescription>
                  Arama motoru optimizasyonu için meta bilgiler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keywords">Anahtar Kelimeler</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) =>
                      setFormData({ ...formData, keywords: e.target.value })
                    }
                    placeholder="yapay zeka, AI, teknoloji (virgülle ayırın)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Virgülle ayırarak birden fazla kelime girebilirsiniz
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Başlık</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, metaTitle: e.target.value })
                    }
                    placeholder="SEO için özel başlık (boş bırakılırsa otomatik)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Açıklama</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metaDescription: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="SEO için özel açıklama (boş bırakılırsa otomatik)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO Analizi */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Analizi</CardTitle>
                <CardDescription>
                  Makale SEO performansını analiz edin ve önerileri görün
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SEOPanel
                  articleId={id}
                  initialScore={article.seoScore}
                  initialRecommendations={[]}
                />
              </CardContent>
            </Card>

            {/* Zamanlanmış Yayın */}
            <Card>
              <CardHeader>
                <CardTitle>Zamanlanmış Yayın</CardTitle>
                <CardDescription>
                  Makaleyi gelecek bir tarihte otomatik olarak yayınlayın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SchedulePublish
                  articleId={id}
                  currentSchedule={article.scheduledPublishAt}
                  onScheduled={() => {
                    // Refresh article data
                    fetch(`/api/admin/articles/${id}`)
                      .then((res) => res.json())
                      .then((data) => setArticle(data.article));
                  }}
                />
              </CardContent>
            </Card>

            {/* Kaydet Butonu */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/articles")}
                disabled={saving}
              >
                İptal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
