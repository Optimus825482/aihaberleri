"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  articleId: string;
  initialRating?: number;
  initialCount?: number;
  readOnly?: boolean;
}

export function StarRating({
  articleId,
  initialRating = 0,
  initialCount = 0,
  readOnly = false,
}: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [count, setCount] = useState(initialCount);
  const [hoverRating, setHoverRating] = useState(0);
  const [userRated, setUserRated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check local storage
  useEffect(() => {
    const ratedArticles = JSON.parse(
      localStorage.getItem("rated_articles") || "[]",
    );
    if (ratedArticles.includes(articleId)) {
      setUserRated(true);
    }
  }, [articleId]);

  const handleRate = async (value: number) => {
    if (readOnly || userRated || isLoading) return;

    setIsLoading(true);
    setUserRated(true);

    // Save to local storage immediately
    const ratedArticles = JSON.parse(
      localStorage.getItem("rated_articles") || "[]",
    );
    if (!ratedArticles.includes(articleId)) {
      ratedArticles.push(articleId);
      localStorage.setItem("rated_articles", JSON.stringify(ratedArticles));
    }

    // Optimistic update
    // Simple average calculation for immediate feedback
    // newAverage = ((currentAverage * count) + newValue) / (count + 1)
    const currentTotal = rating * count;
    const newCount = count + 1;
    const newRating = (currentTotal + value) / newCount;

    setRating(newRating);
    setCount(newCount);

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          type: "RATING",
          value: value,
        }),
      });

      const data = await res.json();
      if (data.rating !== undefined) {
        setRating(data.rating);
        setCount(data.ratingCount);
      }
    } catch (error) {
      console.error("Rate failed", error);
      // Revert on error? Maybe not necessary for ratings as server is source of truth
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 items-start bg-card/50 p-3 rounded-lg border border-border/50">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={readOnly || userRated || isLoading}
            onMouseEnter={() => !readOnly && !userRated && setHoverRating(star)}
            onMouseLeave={() => !readOnly && !userRated && setHoverRating(0)}
            onClick={() => handleRate(star)}
            className={cn(
              "transition-all focus:outline-none p-0.5 group relative",
              readOnly || userRated
                ? "cursor-default"
                : "cursor-pointer hover:scale-110",
            )}
            title={`${star} Yıldız Ver`}
            aria-label={`${star} Yıldız Ver`}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                (hoverRating || Math.round(rating)) >= star
                  ? "fill-yellow-400 text-yellow-500 drop-shadow-sm"
                  : "text-muted-foreground/30 group-hover:text-yellow-200",
              )}
            />
          </button>
        ))}
        {count > 0 && (
          <span className="ml-2 text-lg font-bold text-foreground">
            {rating.toFixed(1)}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {count === 0 ? "İlk oylayan siz olun!" : `${count} kişi puan verdi`}
        {userRated && " • Puanınız kaydedildi"}
      </span>
    </div>
  );
}
