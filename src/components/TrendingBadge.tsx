"use client";

import { memo } from "react";

/**
 * TrendingBadge Component
 *
 * Displays a visually stunning trending badge for articles
 * that match current social media trends.
 *
 * DESIGN:
 * - Animated gradient background
 * - Pulse/glow effect
 * - Responsive sizing
 * - Dark/Light mode support
 */

interface TrendingBadgeProps {
  isTrending: boolean;
  badgeText?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "glow";
  locale?: "tr" | "en";
  className?: string;
  score?: number; // Trend score for tooltip display
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

const TrendingBadge = memo(function TrendingBadge({
  isTrending,
  badgeText,
  size = "sm",
  variant = "glow",
  locale = "tr",
  className = "",
  score,
}: TrendingBadgeProps) {
  if (!isTrending) return null;

  // Default badge text based on locale
  const displayText =
    badgeText || (locale === "tr" ? "🔥 Gündem" : "🔥 Trending");

  // Base classes
  const baseClasses = `
    inline-flex items-center gap-1 font-semibold rounded-full
    transition-all duration-300 select-none
    ${sizeClasses[size]}
  `;

  // Variant-specific classes
  const variantClasses = {
    solid: `
      bg-gradient-to-r from-orange-500 to-red-500
      text-white shadow-md
      hover:shadow-lg hover:scale-105
    `,
    outline: `
      border-2 border-orange-500
      text-orange-600 dark:text-orange-400
      bg-orange-50 dark:bg-orange-950/30
      hover:bg-orange-100 dark:hover:bg-orange-900/30
    `,
    glow: `
      bg-gradient-to-r from-orange-500 via-red-500 to-pink-500
      text-white shadow-lg
      hover:shadow-2xl hover:scale-105
      animate-trending-pulse
      relative overflow-hidden
    `,
  };

  // Tooltip text with optional score
  const tooltipText = score
    ? locale === "tr"
      ? `Bu haber gündemde! (Skor: ${score})`
      : `This article is trending! (Score: ${score})`
    : locale === "tr"
      ? "Bu haber gündemde!"
      : "This article is trending!";

  return (
    <span
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${className}
      `}
      title={tooltipText}
    >
      {variant === "glow" && (
        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 animate-shimmer" />
      )}
      <span className="relative z-10 whitespace-nowrap">{displayText}</span>
    </span>
  );
});

export default TrendingBadge;

// Also export as named export
export { TrendingBadge };
