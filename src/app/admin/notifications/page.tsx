"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, Bell, Mail, Eye, Calendar, RefreshCw, Loader2, Smartphone } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";

// =====================================================
// NEWSLETTER PREVIEW COMPONENT
// =====================================================

interface NewsletterPreview {
  subject: string;
  articleCount: number;
  articles: Array<{
    id: string;
    title: string;
    excerpt: string;
    category: string;
    publishedAt: string;
    imageUrl: string | null;
  }>;
  subscriberCount: number;
  scheduledTime: string;
}

function NewsletterPreviewSection() {
  const [preview, setPreview] = useState<NewsletterPreview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/newsletter/preview");
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch preview:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPreview, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preview || preview.articleCount === 0) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-500" />
            Bugünkü Bülten Önizlemesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Bugün henüz yayınlanan haber yok.</p>
            <p className="text-sm mt-2">Haberler yayınlandıkça burada görünecek.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Eye className="h-5 w-5" />
              Bugünkü Bülten Önizlemesi
            </CardTitle>
            <CardDescription className="mt-1">
              Saat 19:00'da {preview.subscriberCount} aboneye gönderilecek
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchPreview}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Subject */}
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <div className="text-xs text-muted-foreground mb-1">Konu Satırı</div>
          <div className="font-medium">{preview.subject}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-2xl font-bold text-purple-600">{preview.articleCount}</div>
            <div className="text-xs text-muted-foreground">Haber</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-2xl font-bold text-blue-600">{preview.subscriberCount}</div>
            <div className="text-xs text-muted-foreground">Abone</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-lg font-bold text-green-600">19:00</div>
            <div className="text-xs text-muted-foreground">Gönderim</div>
          </div>
        </div>

        {/* Articles List */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Dahil Edilecek Haberler</div>
          {preview.articles.map((article, idx) => (
            <div
              key={article.id}
              className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-600">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium line-clamp-2">{article.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{article.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.publishedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// NEWSLETTER CARD COMPONENT
// =====================================================

function NewsletterCard() {
  const [status, setStatus] = useState<{
    lastSent: string | null;
    subscriberCount: number;
    todayArticleCount: number;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/newsletter/send-daily");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch newsletter status:", error);
    }
  };

  const triggerNewsletter = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/admin/newsletter/send-daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useQueue: true }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Newsletter kuyruğa eklendi",
        });
        fetchStatus();
      } else {
        toast({
          title: "Hata",
          description: data.error || "Newsletter gönderilemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Mail className="h-5 w-5" />
          Newsletter Durumu
        </CardTitle>
        <CardDescription>
          Her gün saat 19:00'da otomatik günlük bülten
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <div className="text-lg font-bold">{status?.subscriberCount || 0}</div>
            <div className="text-xs text-muted-foreground">Abone</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="text-lg font-bold">{status?.todayArticleCount || 0}</div>
            <div className="text-xs text-muted-foreground">Bugünkü Haber</div>
          </div>
        </div>

        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground">Planlanan Gönderim</div>
          <div className="font-medium">Her gün 19:00 (Türkiye)</div>
          {status?.lastSent && (
            <div className="text-xs text-muted-foreground mt-1">
              Son: {new Date(status.lastSent).toLocaleString("tr-TR")}
            </div>
          )}
        </div>

        <Button
          onClick={triggerNewsletter}
          disabled={sending}
          className="w-full"
          variant="outline"
        >
          <Send className="h-4 w-4 mr-2" />
          {sending ? "Gönderiliyor..." : "Şimdi Gönder"}
        </Button>
      </CardContent>
    </Card>
  );
}

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    url: "https://aihaberleri.org",
  });
  const { toast } = useToast();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: `${data.sent || 0} aboneye bildirim gönderildi`,
        });
        setFormData({ ...formData, message: "", title: "" });
      } else {
        toast({
          title: "Hata",
          description: data.error || "Gönderim başarısız",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bir hata oluştu: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
            <p className="text-muted-foreground">
              Newsletter ve push bildirim yönetimi
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="newsletter" className="space-y-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="newsletter" className="gap-2">
              <Mail className="h-4 w-4" />
              Newsletter
            </TabsTrigger>
            <TabsTrigger value="push" className="gap-2">
              <Bell className="h-4 w-4" />
              Push
            </TabsTrigger>
          </TabsList>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview */}
              <NewsletterPreviewSection />
              
              {/* Status & Controls */}
              <div className="space-y-6">
                <NewsletterCard />
                
                {/* Info Card */}
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      📧 Newsletter Sistemi Hakkında
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• Her gün saat 19:00'da (Türkiye) otomatik gönderim yapılır</p>
                    <p>• Sadece o gün yayınlanan haberler dahil edilir</p>
                    <p>• Abone sayısı /api/subscribers endpoint'i ile yönetilir</p>
                    <p>• Manuel gönderim butonu acil durumlar içindir</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Push Tab */}
          <TabsContent value="push" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Push Form Card */}
              <Card className="border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <Bell className="h-5 w-5" />
                    Push Bildirim Gönder
                  </CardTitle>
                  <CardDescription>
                    Tüm kayıtlı cihazlara anlık bildirim gönderin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSend} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="push-title">Bildirim Başlığı</Label>
                      <Input
                        id="push-title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="Örn: 🚨 Son Dakika: GPT-5 Duyuruldu!"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="push-message">Mesaj İçeriği</Label>
                      <Textarea
                        id="push-message"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        placeholder="Kullanıcıların göreceği kısa özet..."
                        required
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="push-url">Yönlendirilecek URL</Label>
                      <Input
                        id="push-url"
                        value={formData.url}
                        onChange={(e) =>
                          setFormData({ ...formData, url: e.target.value })
                        }
                        placeholder="https://aihaberleri.org/news/..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Bildirime tıklayan kullanıcı bu adrese gidecek.
                      </p>
                    </div>

                    <Button
                      disabled={loading}
                      type="submit"
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Tüm Cihazlara Gönder
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card className="bg-muted/50 border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Önizleme
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center">
                  <div className="w-[280px] bg-background border rounded-2xl shadow-2xl overflow-hidden">
                    <div className="h-6 bg-muted border-b flex items-center justify-center text-[10px] text-muted-foreground">
                      Phone Screen
                    </div>
                    <div className="p-4 h-[350px] relative">
                      {/* Mock Notification */}
                      <div className="absolute top-4 left-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-xl p-3 shadow-lg border animate-in slide-in-from-top duration-700">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                            <Bell className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-sm truncate pr-2">
                                {formData.title || "Bildirim Başlığı"}
                              </h4>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                Şimdi
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {formData.message || "Mesaj içeriği burada görünecek..."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info Card */}
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  🔔 Push Bildirim Sistemi Hakkında
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Kullanıcılar site üzerinden abone olabilir</p>
                <p>• Yeni haberler yayınlandığında otomatik bildirim gider</p>
                <p>• Manuel bildirim önemli duyurular için kullanılabilir</p>
                <p>• Firebase Cloud Messaging (FCM) kullanılır</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
