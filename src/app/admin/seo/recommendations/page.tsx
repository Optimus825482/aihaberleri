"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { SEOOptimizationModal } from "@/components/admin/SEOOptimizationModal";
import { useVirtualizer } from "@tanstack/react-virtual";

interface PendingRecommendation {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  seoScore: number;
  recommendations: Array<{
    id: string;
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    suggestion: string | null;
  }>;
}

interface GroupedRecommendations {
  critical: PendingRecommendation[];
  high: PendingRecommendation[];
  medium: PendingRecommendation[];
  low: PendingRecommendation[];
}

const SEVERITY_CONFIG = {
  critical: {
    label: "Kritik",
    icon: "🔴",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  high: {
    label: "Yüksek",
    icon: "🟠",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  medium: {
    label: "Orta",
    icon: "🟡",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  low: {
    label: "Düşük",
    icon: "🟢",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
};

export default function SEORecommendationsPage() {
  const [recommendations, setRecommendations] =
    useState<GroupedRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSeverity, setExpandedSeverity] = useState<string[]>([
    "critical",
    "high",
  ]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
    new Set(),
  );
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeModalOpen, setOptimizeModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const fetchRecommendations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const response = await fetch("/api/admin/seo/pending-recommendations");
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.data);
      }
    } catch (error) {
      console.error("Öneriler yüklenemedi:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const toggleSeverity = (severity: string) => {
    setExpandedSeverity((prev) =>
      prev.includes(severity)
        ? prev.filter((s) => s !== severity)
        : [...prev, severity],
    );
  };

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  // FIX #2: Race condition fix - Guard clause + proper error handling
  // Skill: clean-code → Guard Clauses + vercel-react-best-practices → rerender-functional-setstate
  const handleBulkOptimize = useCallback(async () => {
    // Guard clause - prevent concurrent execution
    if (optimizing) return;

    if (selectedArticles.size === 0) {
      alert("Lütfen optimize edilecek makaleleri seçin");
      return;
    }

    if (
      !confirm(
        `${selectedArticles.size} makale optimize edilecek. Devam etmek istiyor musunuz?`,
      )
    ) {
      return;
    }

    setOptimizing(true);
    try {
      const response = await fetch("/api/admin/seo/bulk-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: Array.from(selectedArticles),
          mode: "review",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "API isteği başarısız",
        }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        alert(`${data.processed} makale optimize edildi!`);
        setSelectedArticles(new Set());
        await fetchRecommendations(true); // Await to ensure sequential execution
      } else {
        throw new Error(data.error || "İşlem başarısız");
      }
    } catch (error) {
      console.error("Toplu optimizasyon hatası:", error);
      alert(
        `❌ Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
      );
    } finally {
      setOptimizing(false);
    }
  }, [optimizing, selectedArticles, fetchRecommendations]);

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

  const totalRecommendations =
    (recommendations?.critical.length || 0) +
    (recommendations?.high.length || 0) +
    (recommendations?.medium.length || 0) +
    (recommendations?.low.length || 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              Bekleyen SEO Önerileri
            </h1>
            <p className="text-muted-foreground mt-2">
              {totalRecommendations} öneri bekliyor
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecommendations()}
              disabled={refreshing}
              aria-label="SEO önerilerini yenile"
              aria-busy={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Yenile
            </Button>
            {selectedArticles.size > 0 && (
              <Button
                onClick={handleBulkOptimize}
                disabled={optimizing}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                aria-label={`${selectedArticles.size} makaleyi toplu optimize et`}
                aria-busy={optimizing}
              >
                <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                {optimizing
                  ? "Optimize Ediliyor..."
                  : `${selectedArticles.size} Makaleyi Optimize Et`}
              </Button>
            )}
          </div>
        </div>

        {/* Severity Groups */}
        {(["critical", "high", "medium", "low"] as const).map((severity) => {
          const articles = recommendations?.[severity] || [];
          if (articles.length === 0) return null;

          const config = SEVERITY_CONFIG[severity];
          const isExpanded = expandedSeverity.includes(severity);

          return (
            <Card key={severity} className={config.borderColor}>
              <CardHeader
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleSeverity(severity)}
                role="button"
                aria-expanded={isExpanded}
                aria-label={`${config.label} öneri grubunu ${isExpanded ? "kapat" : "aç"}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSeverity(severity);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    <span className={config.color}>
                      {config.label.toUpperCase()} ({articles.length})
                    </span>
                  </CardTitle>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <VirtualizedArticleList
                    articles={articles}
                    severity={severity}
                    config={config}
                    selectedArticles={selectedArticles}
                    toggleArticleSelection={toggleArticleSelection}
                    setSelectedArticle={setSelectedArticle}
                    setOptimizeModalOpen={setOptimizeModalOpen}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}

        {totalRecommendations === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-bold mb-2">
                  Tüm Öneriler Çözüldü!
                </h3>
                <p className="text-muted-foreground">
                  Bekleyen SEO önerisi bulunmuyor.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SEO Optimization Modal */}
        {selectedArticle && (
          <SEOOptimizationModal
            open={optimizeModalOpen}
            onOpenChange={setOptimizeModalOpen}
            articleId={selectedArticle.id}
            articleTitle={selectedArticle.title}
            onSuccess={() => {
              // Refresh recommendations
              fetchRecommendations(true);
              setSelectedArticle(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// FIX #7: Virtualized Article List Component
// Skill: rendering-content-visibility → Defer off-screen rendering
interface VirtualizedArticleListProps {
  articles: PendingRecommendation[];
  severity: string;
  config: (typeof SEVERITY_CONFIG)[keyof typeof SEVERITY_CONFIG];
  selectedArticles: Set<string>;
  toggleArticleSelection: (articleId: string) => void;
  setSelectedArticle: (article: { id: string; title: string }) => void;
  setOptimizeModalOpen: (open: boolean) => void;
}

function VirtualizedArticleList({
  articles,
  severity,
  config,
  selectedArticles,
  toggleArticleSelection,
  setSelectedArticle,
  setOptimizeModalOpen,
}: VirtualizedArticleListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer configuration
  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Estimated height per item (in pixels)
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="max-h-[600px] overflow-auto"
      style={{
        // FIX #7: content-visibility for performance
        contain: "strict",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const article = articles[virtualItem.index];

          return (
            <div
              key={article.articleId}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
                // FIX #7: content-visibility CSS for off-screen rendering optimization
                contentVisibility: "auto",
                containIntrinsicSize: "0 180px",
              }}
              className="pb-4"
            >
              <div
                className={`p-4 border rounded-lg ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedArticles.has(article.articleId)}
                    onCheckedChange={() =>
                      toggleArticleSelection(article.articleId)
                    }
                    className="mt-1"
                    aria-label={`Makaleyi seç: ${article.articleTitle}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant="outline"
                        className={`font-bold tabular-nums ${
                          article.seoScore >= 70
                            ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                            : article.seoScore >= 50
                              ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
                              : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                        }`}
                      >
                        {article.seoScore}
                      </Badge>
                      <Link
                        href={`/admin/articles/${article.articleId}/edit`}
                        className="font-medium hover:text-primary transition-colors line-clamp-1"
                        aria-label={`Makaleyi düzenle: ${article.articleTitle}`}
                      >
                        {article.articleTitle}
                      </Link>
                    </div>

                    <div className="space-y-2 ml-4">
                      {article.recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="text-sm flex items-start gap-2"
                        >
                          <span className="text-muted-foreground">❌</span>
                          <div>
                            <p className="font-medium">{rec.message}</p>
                            {rec.suggestion && (
                              <p className="text-muted-foreground text-xs mt-1">
                                💡 {rec.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/news/${article.articleSlug}`} target="_blank">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Makaleyi görüntüle: ${article.articleTitle}`}
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Link href={`/admin/articles/${article.articleId}/edit`}>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Makaleyi düzenle: ${article.articleTitle}`}
                      >
                        Düzenle
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                      onClick={() => {
                        setSelectedArticle({
                          id: article.articleId,
                          title: article.articleTitle,
                        });
                        setOptimizeModalOpen(true);
                      }}
                      aria-label={`Makaleyi optimize et: ${article.articleTitle}`}
                    >
                      <Sparkles className="h-4 w-4 mr-1" aria-hidden="true" />
                      Optimize Et
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
