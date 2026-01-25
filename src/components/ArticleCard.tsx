import Link from "next/link";
import Image from "next/image";
import { formatRelativeTime, calculateReadingTime } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Clock, Eye } from "lucide-react";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    imageUrl: string | null;
    publishedAt: Date | null;
    views: number;
    content: string;
    category: {
      name: string;
      slug: string;
    };
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const readingTime = calculateReadingTime(article.content);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/news/${article.slug}`}>
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
          href={`/category/${article.category.slug}`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {article.category.name}
        </Link>

        <Link href={`/news/${article.slug}`}>
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
            <span>{readingTime} dk okuma</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="h-3 w-3" />
            <span>{article.views} görüntülenme</span>
          </div>
        </div>
        {article.publishedAt && (
          <span>{formatRelativeTime(article.publishedAt)}</span>
        )}
      </CardFooter>
    </Card>
  );
}
