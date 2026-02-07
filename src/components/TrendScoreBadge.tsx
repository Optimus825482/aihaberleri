import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrendScoreBadgeProps {
  trendScore: number | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function TrendScoreBadge({
  trendScore,
  size = "sm",
  showIcon = true,
}: TrendScoreBadgeProps) {
  // Don't render if no trend score
  if ((trendScore ?? 0) <= 0) {
    return null;
  }

  const score = trendScore ?? 0;

  // Determine badge color based on score
  const getBadgeColor = () => {
    if (score >= 80) {
      return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30";
    } else if (score >= 60) {
      return "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30";
    } else if (score >= 40) {
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30";
    } else {
      return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30";
    }
  };

  // Size variants
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <Badge
      className={`${sizeClasses[size]} font-bold tabular-nums ${getBadgeColor()}`}
      variant="outline"
    >
      {showIcon && <TrendingUp className="h-3 w-3 mr-1" />}
      {score}
    </Badge>
  );
}
