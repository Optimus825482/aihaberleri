"use client";

import Link from "next/link";
import Image from "next/image";
import { formatRelativeTime, calculateReadingTime } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Clock, Eye, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    imageUrl: string | null;
    publishedAt: Date | null;
    views: number;
    content?: string;
    category: {
      name: string;
      slug: string;
    };
  };
  locale?: "tr" | "en";
}

// Localized text
const texts = {
  tr: {
    readingTime: "dk okuma",
    views: "görüntülenme",
    share: "Paylaş",
    linkCopied: "Link kopyalandı!",
  },
  en: {
    readingTime: "min read",
    views: "views",
    share: "Share",
    linkCopied: "Link copied!",
  },
};

export function ArticleCard({ article, locale = "tr" }: ArticleCardProps) {
  const readingTime = article.content
    ? calculateReadingTime(article.content)
    : 3;
  const t = texts[locale];

  // Build URLs based on locale
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const newsPath = locale === "en" ? "en/news" : "news";
  const categoryPath = locale === "en" ? "en/category" : "category";
  const articleUrl = `${baseUrl}/${newsPath}/${article.slug}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: articleUrl,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(articleUrl);
        alert(t.linkCopied);
      } catch (error) {
        console.error("Copy error:", error);
      }
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <Link href={`/${newsPath}/${article.slug}`}>
        {article.imageUrl && (
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover transition-transform hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
      </Link>

      <CardContent className="p-6">
        <Link
          href={`/${categoryPath}/${article.category.slug}`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {article.category.name}
        </Link>

        <Link href={`/${newsPath}/${article.slug}`}>
          <h3 className="mt-2 text-xl font-bold line-clamp-2 hover:text-primary transition-colors">
            {article.title}
          </h3>
        </Link>

        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
          {article.excerpt}
        </p>
      </CardContent>

      <CardFooter className="px-6 pb-6 pt-0 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {readingTime} {t.readingTime}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="h-3 w-3" />
            <span>
              {article.views} {t.views}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {article.publishedAt && (
            <span>{formatRelativeTime(article.publishedAt)}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="h-8 w-8 p-0 hover:bg-primary/10"
            title={t.share}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
