"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  TrendingUp,
  FileText,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { SEOPanel } from "@/components/admin/SEOPanel";

interface SEORecommendation {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  suggestion: string;
  isResolved: boolean;
}

interface ArticleSEO {
  id: string;
  title: string;
  slug: string;
  seoScore: number;
  status: string;
  category: { name: string } | null;
  _count: { seoRecommendations: number };
  seoRecommendations?: SEORecommendation[];
}

export default function SEOPage() {
  const [articles, setArticles] = useState<ArticleSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSEO | null>(
    null,
  );
  const [stats, setStats] = useState({
    avgScore: 0,
    optimized: 0,
    needsWork: 0,
    total: 0,
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/articles?include=seo");
      if (response.ok) {
        const data = await response.json();
        const articlesData = data.articles || [];
        setArticles(articlesData);

        // Calculate stats
        const total = articlesData.length;
        const avgScore =
          total > 0
            ? Math.round(
                articlesData.reduce(
                  (sum: number, a: ArticleSEO) => sum + (a.seoScore || 0),
                  0,
                ) / total,
              )
            : 0;
        const optimized = articlesData.filter(
          (a: ArticleSEO) => (a.seoScore || 0) >= 80,
        ).length;
        const needsWork = articlesData.filter(
          (a: ArticleSEO) => (a.seoScore || 0) < 60,
        ).length;

        setStats({ avgScore, optimized, needsWork, total });

        // Auto-select first article with low score
        if (articlesData.length > 0 && !selectedArticle) {
          const lowScoreArticle = articlesData
            .sort(
              (a: ArticleSEO, b: ArticleSEO) =>
                (a.seoScore || 0) - (b.seoScore || 0),
            )
            .find((a: ArticleSEO) => (a.seoScore || 0) < 80);
          if (lowScoreArticle) {
            setSelectedArticle(lowScoreArticle);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SEO Dashboard</h1>
            <p className="text-muted-foreground">
              Makale SEO performansını izleyin ve optimize edin
            </p>
          </div>
          <Button onClick={fetchArticles} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Yenile
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ortalama SEO Skoru
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}/100</div>
              <p className="text-xs text-muted-foreground">
                Tüm makaleler ortalaması
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Optimize Edilmiş
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.optimized}</div>
              <p className="text-xs text-muted-foreground">
                80+ skor (Toplam: {stats.total})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                İyileştirme Gerekli
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.needsWork}</div>
              <p className="text-xs text-muted-foreground">60 altı skor</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Arama Görünürlüğü
              </CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0
                  ? Math.round((stats.optimized / stats.total) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Optimize edilmiş oran
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Article List */}
          <Card>
            <CardHeader>
              <CardTitle>Makale SEO Skorları</CardTitle>
              <p className="text-sm text-muted-foreground">
                Düşük skorlu makaleleri optimize edin
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Yükleniyor...
                  </p>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Henüz makale yok
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {articles
                    .sort((a, b) => (a.seoScore || 0) - (b.seoScore || 0))
                    .slice(0, 20)
                    .map((article) => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedArticle?.id === article.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm truncate">
                                {article.title}
                              </h3>
                              {article.category && (
                                <Badge variant="outline" className="text-xs">
                                  {article.category.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>/{article.slug}</span>
                              {article._count.seoRecommendations > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Lightbulb className="h-3 w-3 mr-1" />
                                  {article._count.seoRecommendations}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div
                            className={`text-center px-3 py-1 rounded-lg border text-sm font-bold ${getScoreColor(article.seoScore || 0)}`}
                          >
                            {article.seoScore || 0}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO Recommendations Panel */}
          <div className="space-y-4">
            {selectedArticle ? (
              <>
                <Card className="bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {selectedArticle.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>/{selectedArticle.slug}</span>
                          {selectedArticle.category && (
                            <Badge variant="outline">
                              {selectedArticle.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Link href={`/admin/articles/${selectedArticle.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Düzenle
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <SEOPanel
                  articleId={selectedArticle.id}
                  initialScore={selectedArticle.seoScore || 0}
                  initialRecommendations={
                    selectedArticle.seoRecommendations || []
                  }
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      SEO önerilerini görmek için bir makale seçin
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
