"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface SEOBadgeProps {
  score: number;
  recommendationCount?: number;
  showTooltip?: boolean;
  recommendations?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
}

export function SEOBadge({
  score,
  recommendationCount = 0,
  showTooltip = true,
  recommendations = [],
}: SEOBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90)
      return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30";
    if (score >= 70)
      return "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30";
    if (score >= 50)
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30";
    if (score >= 30)
      return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30";
    return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (score >= 70) return <CheckCircle2 className="h-3 w-3 text-lime-500" />;
    if (score >= 50)
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return <AlertCircle className="h-3 w-3 text-red-500" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Mükemmel";
    if (score >= 70) return "İyi";
    if (score >= 50) return "Orta";
    if (score >= 30) return "Zayıf";
    return "Kritik";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  const badgeContent = (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`font-bold tabular-nums ${getScoreColor(score)}`}
      >
        <span className="flex items-center gap-1">
          {getScoreIcon(score)}
          {score}
        </span>
      </Badge>

      {recommendationCount > 0 && (
        <Badge
          variant="outline"
          className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30 font-bold"
        >
          {recommendationCount} öneri
        </Badge>
      )}
    </div>
  );

  if (!showTooltip || recommendations.length === 0) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{badgeContent}</div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="max-w-md p-4 space-y-3"
        >
          <div className="space-y-1">
            <p className="font-bold text-sm">
              SEO Skoru: {score} ({getScoreLabel(score)})
            </p>
            {recommendationCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {recommendationCount} iyileştirme önerisi
              </p>
            )}
          </div>

          {recommendations.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Öneriler:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recommendations.slice(0, 5).map((rec, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 bg-accent/50 rounded border"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`font-bold uppercase text-[10px] ${getSeverityColor(rec.severity)}`}
                      >
                        {rec.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{rec.type}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {rec.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {recommendations.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{recommendations.length - 5} öneri daha
                  </p>
                )}
              </div>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
