"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  Target,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  id: string;
  type: string;
  severity: string;
  message: string;
  suggestion: string | null;
  isResolved: boolean;
  createdAt: string;
}

interface SEORecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle: string;
  recommendations: Recommendation[];
  onUpdate: () => void;
}

export function SEORecommendationsModal({
  isOpen,
  onClose,
  articleId,
  articleTitle,
  recommendations,
  onUpdate,
}: SEORecommendationsModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30";
      case "low":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const handleResolve = async (recommendationId: string) => {
    setLoading(recommendationId);

    try {
      const response = await fetch(
        `/api/admin/seo/recommendations/${recommendationId}/resolve`,
        {
          method: "PATCH",
        },
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Öneri çözüldü olarak işaretlendi",
        });
        onUpdate();
      } else {
        throw new Error(data.error || "İşlem başarısız");
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (recommendationId: string) => {
    if (!confirm("Bu öneriyi silmek istediğinizden emin misiniz?")) return;

    setLoading(recommendationId);

    try {
      const response = await fetch(
        `/api/admin/seo/recommendations/${recommendationId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Öneri silindi",
        });
        onUpdate();
      } else {
        throw new Error(data.error || "İşlem başarısız");
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const unresolvedCount = recommendations.filter((r) => !r.isResolved).length;
  const resolvedCount = recommendations.filter((r) => r.isResolved).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            SEO Önerileri
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {articleTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 py-4 border-y">
          <div className="text-center">
            <p className="text-2xl font-bold">{recommendations.length}</p>
            <p className="text-xs text-muted-foreground">Toplam</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">
              {unresolvedCount}
            </p>
            <p className="text-xs text-muted-foreground">Bekleyen</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground">Çözülen</p>
          </div>
        </div>

        {/* Recommendations List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="text-muted-foreground">
                  Bu makale için öneri bulunmuyor
                </p>
              </div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 border rounded-lg space-y-3 ${
                    rec.isResolved ? "opacity-60 bg-accent/30" : "bg-card"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getSeverityIcon(rec.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`font-bold text-xs ${getSeverityColor(rec.severity)}`}
                          >
                            {rec.severity.toUpperCase()}
                          </Badge>
                          <span className="font-bold text-sm">{rec.type}</span>
                          {rec.isResolved && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Çözüldü
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="pl-7">
                    <p className="text-sm text-muted-foreground">
                      {rec.message}
                    </p>
                    {rec.suggestion && (
                      <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                          Öneri:
                        </p>
                        <p className="text-sm">{rec.suggestion}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!rec.isResolved && (
                    <div className="flex items-center gap-2 pl-7">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(rec.id)}
                        disabled={loading === rec.id}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        {loading === rec.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Çözüldü Olarak İşaretle
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(rec.id)}
                        disabled={loading === rec.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="pl-7">
                    <p className="text-xs text-muted-foreground">
                      {new Date(rec.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
