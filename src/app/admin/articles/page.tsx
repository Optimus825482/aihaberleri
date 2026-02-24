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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  Twitter,
  Globe,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import {
  BatchSelectionProvider,
  BatchCheckbox,
  BatchSelectAll,
  useBatchSelection,
} from "@/components/admin/batch-operations";
import { Loader2, Facebook } from "lucide-react";

// Icons for social platforms
const BlueskyIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const MastodonIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
  </svg>
);

interface SocialShare {
  platform: string;
  language: string;
  status: string;
  sharedAt: string | null;
  postUrl: string | null;
}

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
  seoScore: number | null;
  trendScore: number | null;
  facebookShared: boolean;
  socialShares?: SocialShare[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

// Helper component to show social share status
const SocialShareBadges = ({
  shares,
  facebookShared,
}: {
  shares?: SocialShare[];
  facebookShared: boolean;
}) => {
  // Platform configs
  const platforms = [
    {
      key: "FACEBOOK",
      label: "FB",
      icon: Facebook,
      color: "text-blue-600",
      lang: "tr",
    },
    {
      key: "TWITTER",
      label: "X",
      icon: Twitter,
      color: "text-sky-500",
      lang: "tr",
    },
    {
      key: "BLUESKY",
      label: "BS",
      icon: BlueskyIcon,
      color: "text-blue-400",
      lang: "tr",
    },
    {
      key: "MASTODON",
      label: "M",
      icon: MastodonIcon,
      color: "text-purple-500",
      lang: "tr",
    },
    {
      key: "FACEBOOK_EN",
      label: "FB-EN",
      icon: Facebook,
      color: "text-blue-600",
      lang: "en",
    },
    {
      key: "BLUESKY",
      label: "BS-EN",
      icon: BlueskyIcon,
      color: "text-blue-400",
      lang: "en",
    },
    {
      key: "MASTODON",
      label: "M-EN",
      icon: MastodonIcon,
      color: "text-purple-500",
      lang: "en",
    },
  ];

  const getShareStatus = (platform: string, lang: string) => {
    if (!shares || shares.length === 0) {
      // Fallback to facebookShared for backward compatibility
      if (platform === "FACEBOOK" && lang === "tr") {
        return facebookShared ? "SHARED" : null;
      }
      return null;
    }
    const share = shares.find(
      (s) => s.platform === platform && s.language === lang,
    );
    return share?.status || null;
  };

  // Group by language
  const trShares = platforms.filter((p) => p.lang === "tr");
  const enShares = platforms.filter((p) => p.lang === "en");

  const renderPlatform = (p: (typeof platforms)[0]) => {
    const status = getShareStatus(p.key, p.lang);
    const Icon = p.icon;

    if (status === "SHARED") {
      return (
        <span
          key={`${p.key}-${p.lang}`}
          className={`${p.color} flex-shrink-0`}
          title={`${p.label} paylaşıldı`}
        >
          <Icon />
        </span>
      );
    }
    if (status === "FAILED") {
      return (
        <span
          key={`${p.key}-${p.lang}`}
          className="text-red-400 flex-shrink-0 opacity-50"
          title={`${p.label} başarısız`}
        >
          <Icon />
        </span>
      );
    }
    return null;
  };

  const trIcons = trShares.map(renderPlatform).filter(Boolean);
  const enIcons = enShares.map(renderPlatform).filter(Boolean);

  return (
    <div className="flex flex-col gap-0.5">
      {trIcons.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">TR:</span>
          <div className="flex items-center gap-1">{trIcons}</div>
        </div>
      )}
      {enIcons.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">EN:</span>
          <div className="flex items-center gap-1">{enIcons}</div>
        </div>
      )}
      {trIcons.length === 0 && enIcons.length === 0 && (
        <span className="text-xs text-muted-foreground">-</span>
      )}
    </div>
  );
};

export default function ArticlesPage() {
  const router = useRouter();
  const { toast } = useToast();
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
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [reEvaluate, setReEvaluate] = useState<{
    id: string;
    title: string;
    note: string;
    loading: boolean;
    regenerateImage: boolean;
  } | null>(null);



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

  const deleteArticle = async (id: string, title: string) => {
    // Show confirm dialog
    setDeleteConfirm({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    const { id } = deleteConfirm;
    const previousArticles = [...articles];

    // Optimistic update - immediately remove from UI
    setArticles((prev) => prev.filter((article) => article.id !== id));
    setDeleteConfirm(null);

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Başarılı",
          description: "Haber başarıyla silindi",
        });
        // Refresh to get updated counts
        fetchData();
      } else {
        // Rollback on error
        console.error("Silme hatası:", data);
        setArticles(previousArticles);
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error || "Haber silinemedi",
        });
      }
    } catch (error) {
      // Rollback on error
      console.error("Silme hatası:", error);
      setArticles(previousArticles);
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

  const refreshImage = async (id: string) => {
    setRefreshingImage(id);

    try {
      const response = await fetch(`/api/articles/${id}/refresh-image`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Check if fallback was used
        if (data.usedFallback) {
          toast({
            variant: "destructive",
            title: "⚠️ Görsel Servisi Hatası",
            description:
              "Görsel servisi yanıt vermedi. Varsayılan görsel kullanıldı. Birkaç dakika sonra tekrar deneyin.",
          });
        } else {
          toast({
            title: "Başarılı",
            description: "Görsel başarıyla güncellendi",
          });
        }
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
        toast({
          variant: "destructive",
          title: "Hata",
          description:
            "Görsel güncellenemedi: " + (data.error || "Bilinmeyen hata"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu",
      });
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
        toast({
          title: "Başarılı",
          description: "Facebook'ta başarıyla paylaşıldı",
        });
      } else {
        // Rollback on error
        setArticles(previousArticles);
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error || "Facebook paylaşımı başarısız",
        });
      }
    } catch (error) {
      // Rollback on error
      console.error("Facebook share error:", error);
      setArticles(previousArticles);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu",
      });
    } finally {
      setSharingFacebook(null);
    }
  };

  // Re-evaluate handlers
  const openReEvaluate = (id: string, title: string) => {
    setReEvaluate({
      id,
      title,
      note: "",
      loading: false,
      regenerateImage: false,
    });
  };

  const cancelReEvaluate = () => {
    setReEvaluate(null);
  };

  const confirmReEvaluate = async () => {
    if (!reEvaluate || !reEvaluate.note.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen bir not girin",
      });
      return;
    }

    setReEvaluate((prev) => (prev ? { ...prev, loading: true } : null));

    try {
      const response = await fetch(
        `/api/admin/articles/${reEvaluate.id}/re-evaluate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: reEvaluate.note,
            regenerateImage: reEvaluate.regenerateImage,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "✅ Başarılı",
          description: `"${data.article?.title?.substring(0, 30)}..." yeniden değerlendirildi`,
        });
        fetchData(); // Refresh list
        setReEvaluate(null);
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error || "Yeniden değerlendirme başarısız",
        });
        setReEvaluate((prev) => (prev ? { ...prev, loading: false } : null));
      }
    } catch (error) {
      console.error("Re-evaluate error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu",
      });
      setReEvaluate((prev) => (prev ? { ...prev, loading: false } : null));
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
    <BatchSelectionProvider>
      <ArticlesPageContent
        articles={articles}
        categories={categories}
        loading={loading}
        totalArticles={totalArticles}
        currentPage={currentPage}
        pageSize={pageSize}
        search={search}
        categoryFilter={categoryFilter}
        refreshingImage={refreshingImage}
        sharingFacebook={sharingFacebook}
        deleteConfirm={deleteConfirm}
        setSearch={setSearch}
        setCategoryFilter={setCategoryFilter}
        setPageSize={setPageSize}
        setCurrentPage={setCurrentPage}
        setDeleteConfirm={setDeleteConfirm}
        setRefreshingImage={setRefreshingImage}
        setSharingFacebook={setSharingFacebook}
        setArticles={setArticles}
        fetchData={fetchData}
        cancelDelete={cancelDelete}
        confirmDelete={confirmDelete}
        deleteArticle={deleteArticle}
        refreshImage={refreshImage}
        shareFacebook={shareFacebook}
        reEvaluate={reEvaluate}
        setReEvaluate={setReEvaluate}
        openReEvaluate={openReEvaluate}
        cancelReEvaluate={cancelReEvaluate}
        confirmReEvaluate={confirmReEvaluate}
        router={router}
      />
    </BatchSelectionProvider>
  );
}

interface ArticlesPageContentProps {
  articles: Article[];
  categories: Category[];
  loading: boolean;
  totalArticles: number;
  currentPage: number;
  pageSize: number;
  search: string;
  categoryFilter: string;
  refreshingImage: string | null;
  sharingFacebook: string | null;
  deleteConfirm: { id: string; title: string } | null;
  setSearch: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setPageSize: (value: number) => void;
  setCurrentPage: (value: number) => void;
  setDeleteConfirm: (value: { id: string; title: string } | null) => void;
  setRefreshingImage: (value: string | null) => void;
  setSharingFacebook: (value: string | null) => void;
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  fetchData: () => Promise<void>;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
  deleteArticle: (id: string, title: string) => void;
  refreshImage: (id: string) => Promise<void>;
  shareFacebook: (id: string) => Promise<void>;
  reEvaluate: {
    id: string;
    title: string;
    note: string;
    loading: boolean;
    regenerateImage: boolean;
  } | null;
  setReEvaluate: React.Dispatch<
    React.SetStateAction<{
      id: string;
      title: string;
      note: string;
      loading: boolean;
      regenerateImage: boolean;
    } | null>
  >;
  openReEvaluate: (id: string, title: string) => void;
  cancelReEvaluate: () => void;
  confirmReEvaluate: () => Promise<void>;
  router: any;
}

// Inner component to access BatchSelectionContext
function ArticlesPageContent({
  articles,
  categories,
  loading,
  totalArticles,
  currentPage,
  pageSize,
  search,
  categoryFilter,
  refreshingImage,
  sharingFacebook,
  deleteConfirm,
  setSearch,
  setCategoryFilter,
  setPageSize,
  setCurrentPage,
  setDeleteConfirm,
  setRefreshingImage,
  setSharingFacebook,
  setArticles,
  fetchData,
  cancelDelete,
  confirmDelete,
  deleteArticle,
  refreshImage,
  shareFacebook,
  reEvaluate,
  setReEvaluate,
  openReEvaluate,
  cancelReEvaluate,
  confirmReEvaluate,
  router,
}: ArticlesPageContentProps) {
  const { toast } = useToast();

  const displayArticles = articles;
  const totalPages = Math.ceil(totalArticles / pageSize);

  return (
    <AdminLayout>
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && cancelDelete()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Haberi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.title ||
                "Bu haberi silmek istediğinizden emin misiniz?"}{" "}
              başlıklı haberi silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-Evaluate Dialog */}
      <AlertDialog
        open={!!reEvaluate}
        onOpenChange={(open) => !open && cancelReEvaluate()}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Yeniden Değerlendir</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  <span className="font-medium">{reEvaluate?.title}</span>{" "}
                  başlıklı haber yapay zeka tarafından yeniden
                  değerlendirilecek.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Not (yapay zekaya talimat)
                  </label>
                  <Textarea
                    placeholder="Örn: Haberde 2024 yazıyor ama 2026 olmalı, tarihleri güncelle..."
                    value={reEvaluate?.note || ""}
                    onChange={(e) =>
                      setReEvaluate((prev) =>
                        prev ? { ...prev, note: e.target.value } : null,
                      )
                    }
                    className="min-h-[100px]"
                    disabled={reEvaluate?.loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 karakter
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="regenerateImage"
                    checked={reEvaluate?.regenerateImage || false}
                    onChange={(e) =>
                      setReEvaluate((prev) =>
                        prev
                          ? { ...prev, regenerateImage: e.target.checked }
                          : null,
                      )
                    }
                    disabled={reEvaluate?.loading}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="regenerateImage" className="text-sm">
                    Görseli de yeniden oluştur
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={cancelReEvaluate}
              disabled={reEvaluate?.loading}
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReEvaluate}
              disabled={
                reEvaluate?.loading || (reEvaluate?.note?.length || 0) < 10
              }
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {reEvaluate?.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Yeniden Değerlendir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          <CardContent className="p-0 sm:p-6">
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-3 p-4">
              {displayArticles.map((article) => (
                <div
                  key={article.id}
                  className="border rounded-xl p-4 bg-card/50 space-y-3"
                >
                  {/* Header: Image + Title */}
                  <div className="flex gap-3">
                    {article.imageUrl ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          className="object-cover"
                          unoptimized={
                            article.imageUrl.includes("pollinations.ai") ||
                            article.imageUrl.includes("r2.dev") ||
                            article.imageUrl.includes("images.aihaberleri.org")
                          }
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          Yok
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="font-semibold text-sm line-clamp-2 leading-tight flex-1">
                          {article.title}
                        </p>
                        <SocialShareBadges
                          shares={article.socialShares}
                          facebookShared={article.facebookShared}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge
                          className={`text-xs font-bold ${
                            article.category.slug === "yapay-zeka"
                              ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
                              : article.category.slug === "robotik"
                                ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                                : article.category.slug === "otomasyon"
                                  ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
                                  : article.category.slug === "makine-ogrenimi"
                                    ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                                    : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30"
                          }`}
                          variant="outline"
                        >
                          {article.category.name}
                        </Badge>
                        <Badge
                          className={`text-xs font-bold tabular-nums ${
                            (article.score || 0) >= 800
                              ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                              : (article.score || 0) >= 700
                                ? "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30"
                                : (article.score || 0) >= 600
                                  ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
                                  : (article.score || 0) >= 500
                                    ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
                                    : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                          }`}
                          variant="outline"
                        >
                          {article.score || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-b py-2">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{article.views}</span>
                    </div>
                    <div>
                      {new Date(
                        article.publishedAt || article.createdAt,
                      ).toLocaleDateString("tr-TR")}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(`/news/${article.slug}`, "_blank")
                      }
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Görüntüle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/admin/articles/${article.id}/edit`)
                      }
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refreshImage(article.id)}
                      disabled={refreshingImage === article.id}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshingImage === article.id ? "animate-spin" : ""}`}
                      />
                    </Button>
                    {!article.facebookShared &&
                      article.status === "PUBLISHED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shareFacebook(article.id)}
                          disabled={sharingFacebook === article.id}
                        >
                          {sharingFacebook === article.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Facebook className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReEvaluate(article.id, article.title)}
                      title="Yeniden Değerlendir"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteArticle(article.id, article.title)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table className="min-w-[750px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <BatchSelectAll
                        allIds={displayArticles.map((a: any) => a.id)}
                      />
                    </TableHead>
                    <TableHead className="w-[60px]">Görsel</TableHead>
                    <TableHead className="w-auto min-w-[200px]">
                      Başlık
                    </TableHead>
                    <TableHead className="w-[100px]">Sosyal</TableHead>
                    <TableHead className="w-[110px]">Kategori</TableHead>
                    <TableHead className="w-[85px]">Tarih</TableHead>
                    <TableHead className="w-[70px]">Skor</TableHead>
                    <TableHead className="w-[70px]">Trend</TableHead>
                    <TableHead className="w-[75px] text-right">
                      Görüntü
                    </TableHead>
                    <TableHead className="w-[130px] text-right sticky right-0 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                      İşlemler
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <BatchCheckbox id={article.id} />
                      </TableCell>
                      <TableCell>
                        {article.imageUrl ? (
                          <div className="relative w-16 h-16 rounded overflow-hidden">
                            <Image
                              src={article.imageUrl}
                              alt={article.title}
                              fill
                              className="object-cover"
                              unoptimized={
                                article.imageUrl.includes("pollinations.ai") ||
                                article.imageUrl.includes("r2.dev") ||
                                article.imageUrl.includes(
                                  "images.aihaberleri.org",
                                )
                              }
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
                        <SocialShareBadges
                          shares={article.socialShares}
                          facebookShared={article.facebookShared}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs font-bold ${
                            article.category.slug === "yapay-zeka"
                              ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
                              : article.category.slug === "robotik"
                                ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                                : article.category.slug === "otomasyon"
                                  ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
                                  : article.category.slug === "makine-ogrenimi"
                                    ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                                    : article.category.slug === "derin-ogrenme"
                                      ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                                      : article.category.slug === "nlp"
                                        ? "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30"
                                        : article.category.slug ===
                                            "bilgisayarli-goru"
                                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                          : article.category.slug === "etik"
                                            ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                                            : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30"
                          }`}
                          variant="outline"
                        >
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
                        <Badge
                          className={`text-xs font-bold tabular-nums ${
                            (article.score || 0) >= 800
                              ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                              : (article.score || 0) >= 700
                                ? "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30"
                                : (article.score || 0) >= 600
                                  ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
                                  : (article.score || 0) >= 500
                                    ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
                                    : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                          }`}
                          variant="outline"
                        >
                          {article.score || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(article.trendScore ?? 0) > 0 ? (
                          <Badge
                            className={`text-xs font-bold tabular-nums ${
                              (article.trendScore ?? 0) >= 80
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : (article.trendScore ?? 0) >= 60
                                  ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                                  : (article.trendScore ?? 0) >= 40
                                    ? "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30"
                                    : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30"
                            }`}
                            variant="outline"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {article.trendScore}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{article.views}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right sticky right-0 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-end gap-1">
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
                              router.push(`/admin/articles/${article.id}/edit`)
                            }
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              openReEvaluate(article.id, article.title)
                            }
                            title="Yeniden Değerlendir"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deleteArticle(article.id, article.title)
                            }
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

            {displayArticles.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                {search || categoryFilter !== "all"
                  ? "Arama sonucu bulunamadı"
                  : "Henüz haber yok. Haber tarama veya manuel ekleme yapabilirsiniz."}
              </div>
            )}

            {/* Pagination Controls */}
            {totalArticles > 0 && totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-6 pt-6 border-t px-4 lg:px-0">
                <div className="text-sm text-muted-foreground">
                  Sayfa {currentPage} / {totalPages} ({totalArticles} haber)
                </div>

                {/* Mobile Pagination */}
                <div className="flex lg:hidden items-center gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex-1"
                  >
                    ← Önceki
                  </Button>
                  <span className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium">
                    {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex-1"
                  >
                    Sonraki →
                  </Button>
                </div>

                {/* Desktop Pagination */}
                <div className="hidden lg:flex items-center gap-2">
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
