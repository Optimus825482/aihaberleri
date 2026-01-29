"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Info,
    RefreshCw,
    TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SEORecommendation {
    id: string;
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    suggestion: string;
    isResolved: boolean;
}

interface SEOPanelProps {
    articleId: string;
    initialScore?: number;
    initialRecommendations?: SEORecommendation[];
}

/**
 * SEO Analysis Panel
 * Shows SEO score and recommendations for articles
 */
export function SEOPanel({
    articleId,
    initialScore = 0,
    initialRecommendations = [],
}: SEOPanelProps) {
    const [score, setScore] = useState(initialScore);
    const [recommendations, setRecommendations] = useState<SEORecommendation[]>(
        initialRecommendations
    );
    const [analyzing, setAnalyzing] = useState(false);
    const { toast } = useToast();

    const analyzeSEO = async () => {
        setAnalyzing(true);

        try {
            const response = await fetch(`/api/admin/articles/${articleId}/seo`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("SEO analysis failed");
            }

            const data = await response.json();
            setScore(data.score);
            setRecommendations(data.recommendations);

            toast({
                title: "SEO Analizi Tamamlandı ✅",
                description: `Skor: ${data.score}/100`,
            });
        } catch (error) {
            toast({
                title: "Hata ❌",
                description: "SEO analizi başarısız oldu",
                variant: "destructive",
            });
        } finally {
            setAnalyzing(false);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "critical":
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case "high":
                return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case "medium":
                return <Info className="h-4 w-4 text-yellow-500" />;
            case "low":
                return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
            default:
                return null;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            case "high":
                return "bg-orange-500/10 text-orange-500 border-orange-500/20";
            case "medium":
                return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case "low":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            default:
                return "";
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-yellow-500";
        if (score >= 40) return "text-orange-500";
        return "text-red-500";
    };

    const unresolvedCount = recommendations.filter((r) => !r.isResolved).length;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        SEO Analizi
                    </CardTitle>
                    <Button
                        onClick={analyzeSEO}
                        disabled={analyzing}
                        size="sm"
                        variant="outline"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
                        {analyzing ? "Analiz Ediliyor..." : "Yeniden Analiz Et"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* SEO Score */}
                <div className="text-center p-6 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">SEO Skoru</div>
                    <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
                        {score}/100
                    </div>
                    {unresolvedCount > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            {unresolvedCount} iyileştirme önerisi
                        </p>
                    )}
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 ? (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Öneriler</h4>
                        {recommendations.map((rec) => (
                            <div
                                key={rec.id}
                                className={`p-4 rounded-lg border ${rec.isResolved ? "opacity-50" : ""}`}
                            >
                                <div className="flex items-start gap-3">
                                    {getSeverityIcon(rec.severity)}
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">{rec.message}</p>
                                            <Badge
                                                variant="outline"
                                                className={getSeverityColor(rec.severity)}
                                            >
                                                {rec.severity}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {rec.suggestion}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Henüz SEO analizi yapılmadı</p>
                        <p className="text-sm mt-2">
                            Yukarıdaki butona tıklayarak analiz başlatın
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
