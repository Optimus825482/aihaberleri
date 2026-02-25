import { db } from "@/lib/db";
import {
  saveArticleTranslation,
  translateArticle,
  type TranslationInput,
} from "@/lib/translation";

/**
 * Sync a TR article to EN translation without triggering social/share/indexing side effects.
 */
export async function syncArticleToEnglishFromTurkish(articleId: string) {
  const article = await db.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
      updatedAt: true,
    },
  });

  if (!article) {
    throw new Error("Makale bulunamadı");
  }

  const sourcePayload = {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    metaTitle: article.metaTitle || undefined,
    metaDescription: article.metaDescription || undefined,
  };

  await saveArticleTranslation(articleId, "tr", sourcePayload);

  const translationInput: TranslationInput = {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    metaTitle: article.metaTitle || undefined,
    metaDescription: article.metaDescription || undefined,
  };

  const englishTranslation = await translateArticle(
    translationInput,
    "tr",
    "en",
  );
  await saveArticleTranslation(articleId, "en", englishTranslation);

  return {
    articleId,
    trUpdatedAt: article.updatedAt,
    enSlug: englishTranslation.slug,
  };
}
