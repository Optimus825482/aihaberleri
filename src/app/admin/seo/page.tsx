"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";

export default function SEODashboard() {
  const [loading, setLoading] = useState(false);
  const [indexNowStatus, setIndexNowStatus] = useState<{
    success: boolean;
    count: number;
  } | null>(null);
  const { toast } = useToast();

  const handleSubmitAllToIndexNow = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/seo/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit-all" }),
      });

      const data = await response.json();
      setIndexNowStatus(data);

      if (data.success) {
        toast({
          title: "Başarılı!",
          description: `${data.count} makale IndexNow'a gönderildi`,
        });
      } else {
        toast({
          title: "Hata",
          description: "Makaleler gönderilemedi",
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
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">SEO Yönetimi</h1>
          <p className="text-muted-foreground">
            Site SEO durumunu izleyin ve optimizasyonları yönetin
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* IndexNow Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                IndexNow
              </CardTitle>
              <CardDescription>Instant indexing (Bing, Yandex)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Durum:</span>
                  <Badge variant="outline">Aktif</Badge>
                </div>

                {indexNowStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Son Gönderim:</span>
                    <div className="flex items-center gap-2">
                      {indexNowStatus.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {indexNowStatus.count} makale
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmitAllToIndexNow}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tüm Makaleleri Gönder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sitemap Status */}
          <Card>
            <CardHeader>
              <CardTitle>Sitemap</CardTitle>
              <CardDescription>XML sitemap durumu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ana Sitemap:</span>
                    <Badge variant="outline">Aktif</Badge>
                  </div>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    sitemap.xml
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">News Sitemap:</span>
                    <Badge variant="outline">Aktif</Badge>
                  </div>
                  <a
                    href="/news-sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    news-sitemap.xml
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Structured Data */}
          <Card>
            <CardHeader>
              <CardTitle>Structured Data</CardTitle>
              <CardDescription>Schema.org implementasyonu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Organization:</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">WebSite:</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">NewsArticle:</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">BreadcrumbList:</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Search Console */}
          <Card>
            <CardHeader>
              <CardTitle>Google Search Console</CardTitle>
              <CardDescription>Search Console entegrasyonu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Google Search Console'da sitenizi doğrulayın ve sitemap'leri
                  gönderin.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Search Console'u Aç
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Core Web Vitals */}
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>Performance metrikleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">LCP:</span>
                  <Badge variant="outline">{"< 2.5s"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">INP:</span>
                  <Badge variant="outline">{"< 200ms"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">CLS:</span>
                  <Badge variant="outline">{"< 0.1"}</Badge>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://pagespeed.web.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PageSpeed Test
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Robots.txt */}
          <Card>
            <CardHeader>
              <CardTitle>Robots.txt</CardTitle>
              <CardDescription>Crawler direktifleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Durum:</span>
                  <Badge variant="outline">Aktif</Badge>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    robots.txt'yi Görüntüle
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEO Checklist */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>SEO Checklist</CardTitle>
            <CardDescription>
              Tamamlanması gereken SEO görevleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Structured Data (JSON-LD) implementasyonu
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">IndexNow API entegrasyonu</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">Google News Sitemap</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">Canonical URLs</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">Meta tags optimization</span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Google Search Console doğrulaması (Manuel)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Google News'e başvuru (Manuel)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
