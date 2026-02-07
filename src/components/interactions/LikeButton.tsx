"use client";

import { useState, useEffect } from "react";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  articleId: string;
  initialLikes?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LikeButton({
  articleId,
  initialLikes = 0,
  className,
  size = "md",
}: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check local storage on mount to see if user liked this specific article
  useEffect(() => {
    const storedLikes = localStorage.getItem("liked_articles");
    if (storedLikes) {
      const likedArticles = JSON.parse(storedLikes);
      if (likedArticles.includes(articleId)) {
        setHasLiked(true);
      }
    }
  }, [articleId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation if inside a link
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    // Optimistic update
    const newHasLiked = !hasLiked;
    setHasLiked(newHasLiked);
    setLikes((prev) => (newHasLiked ? prev + 1 : Math.max(0, prev - 1)));

    // Update local storage
    const storedLikes = localStorage.getItem("liked_articles");
    let likedArticles = storedLikes ? JSON.parse(storedLikes) : [];

    if (newHasLiked) {
      if (!likedArticles.includes(articleId)) {
        likedArticles.push(articleId);
      }
    } else {
      likedArticles = likedArticles.filter((id: string) => id !== articleId);
    }
    localStorage.setItem("liked_articles", JSON.stringify(likedArticles));

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, type: "LIKE" }),
      });

      const data = await res.json();
      if (data.likes !== undefined) {
        setLikes(data.likes);
      }
    } catch (error) {
      console.error("Like failed", error);
      // Revert on error
      setHasLiked(!newHasLiked);
      setLikes((prev) => (!newHasLiked ? prev + 1 : Math.max(0, prev - 1)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-1.5 transition-all active:scale-95 group",
        hasLiked
          ? "text-blue-600 dark:text-blue-400"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label={hasLiked ? "Beğenmekten vazgeç" : "Beğen"}
    >
      <div
        className={cn(
          "p-1.5 rounded-full transition-colors",
          hasLiked ? "bg-blue-50 dark:bg-blue-900/30" : "group-hover:bg-muted",
        )}
      >
        <ThumbsUp
          className={cn(
            "transition-transform",
            hasLiked ? "fill-current scale-110" : "scale-100",
            size === "sm"
              ? "w-3.5 h-3.5"
              : size === "lg"
                ? "w-5 h-5"
                : "w-4 h-4",
          )}
        />
      </div>
      <span
        className={cn(
          "font-medium tabular-nums",
          size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm",
        )}
      >
        {likes > 0 ? likes : "Beğen"}
      </span>
    </button>
  );
}
