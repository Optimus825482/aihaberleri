/**
 * InlineRelatedArticles
 *
 * Makale içeriğinin ortasına enjekte edilir.
 * SEO internal linking stratejisi: okuyucu henüz içerik tüketirken
 * alakalı sayfalara contextual anchor metinleri ile bağlantı sağlar.
 *
 * Google PageRank akışı: mevcut makale → ilgili 3 makale
 */
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";

/**
 * Veritabanında bazen "/news/slug.jpg" gibi relative path saklanıyor.
 * Bu dosyalar sunucuda mevcut olmadığından 404 + sonsuz retry döngüsüne yol açar.
 * Sadece gerçek external CDN URL'lerini geçerli say.
 */
const isValidImageUrl = (url: string | null | undefined): url is string =>
    !!url && (url.startsWith("http://") || url.startsWith("https://"));

interface RelatedArticleItem {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    imageUrl: string | null;
    publishedAt: Date | null;
    category: {
        name: string;
        slug: string;
    };
}

interface InlineRelatedArticlesProps {
    articles: RelatedArticleItem[];
    currentCategoryName?: string;
}

export function InlineRelatedArticles({
    articles,
    currentCategoryName,
}: InlineRelatedArticlesProps) {
    if (!articles || articles.length === 0) return null;

    return (
        <aside
            className="not-prose my-10 rounded-2xl border border-ai-primary/20 bg-ai-surface-card overflow-hidden"
            aria-label="Konuyla ilgili haberler"
        >
            {/* Başlık */}
            <div className="flex items-center gap-2 px-5 py-4 bg-ai-primary/10 border-b border-ai-primary/20">
                <span className="material-symbols-outlined text-[20px] text-ai-primary">
                    auto_stories
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {currentCategoryName
                        ? `${currentCategoryName} ile İlgili Haberler`
                        : "Konuyla İlgili Haberler"}
                </h3>
            </div>

            {/* Makale Listesi */}
            <ul className="divide-y divide-ai-surface-border">
                {articles.map((article) => (
                    <li key={article.id}>
                        <Link
                            href={`/news/${article.slug}`}
                            className="flex gap-4 p-4 group hover:bg-ai-surface-hover transition-colors"
                        >
                            {/* Thumbnail — yalnızca geçerli external URL ise göster */}
                            {isValidImageUrl(article.imageUrl) ? (
                                <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border">
                                    <Image
                                        src={article.imageUrl}
                                        alt={article.title}
                                        fill
                                        sizes="80px"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        unoptimized={
                                            article.imageUrl.includes("pollinations.ai") ||
                                            article.imageUrl.includes("r2.dev") ||
                                            article.imageUrl.includes("images.aihaberleri.org")
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-ai-surface-border bg-ai-surface-dark flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[24px] text-ai-text-muted/60">
                                        article
                                    </span>
                                </div>
                            )}

                            {/* Metin */}
                            <div className="flex-1 min-w-0">
                                {/* Kategori etiketi — anchor text SEO için kritik */}
                                <span className="text-xs text-ai-primary font-medium mb-1 block">
                                    {article.category.name}
                                </span>
                                {/* Başlık — primary anchor text */}
                                <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-ai-primary transition-colors leading-snug">
                                    {article.title}
                                </h4>
                                {/* Tarih */}
                                {article.publishedAt && (
                                    <time
                                        dateTime={article.publishedAt.toISOString()}
                                        className="text-xs text-ai-text-muted mt-1 block"
                                    >
                                        {formatDate(article.publishedAt)}
                                    </time>
                                )}
                            </div>

                            {/* Ok ikonu */}
                            <span className="material-symbols-outlined text-[18px] text-ai-text-muted group-hover:text-ai-primary group-hover:translate-x-1 transition-all flex-shrink-0 self-center">
                                arrow_forward
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
