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
      return "bg-green-500/20 text-green-400 border-green-500/30";
    } else if (score >= 60) {
      return "bg-lime-500/20 text-lime-400 border-lime-500/30";
    } else if (score >= 40) {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    } else {
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    }
  };

  // Size variants
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-2.5 py-1",
  };

  const iconSizes = {
    sm: "text-[12px]",
    md: "text-[14px]",
    lg: "text-[16px]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClasses[size]} font-bold tabular-nums rounded-md border ${getBadgeColor()}`}
    >
      {showIcon && <span className={`material-symbols-outlined ${iconSizes[size]}`}>trending_up</span>}
      {score}
    </span>
  );
}
