/**
 * Translation Service - Multi-language article translation
 * Uses DeepSeek AI for translation
 */

import { db } from "@/lib/db";

export type SupportedLocale = "tr" | "en";

export interface TranslationInput {
  title: string;
  excerpt: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface TranslationOutput extends TranslationInput {
  slug: string;
}

// DeepSeek system prompts for translation
const TRANSLATION_PROMPTS = {
  "tr-to-en": `You are a professional translator specializing in technology and AI news.
Translate the following Turkish text to English.
- Maintain the same tone and style
- Keep technical terms accurate
- Preserve formatting (markdown, HTML)
- Do not add or remove information
- Return ONLY the translated text, no explanations`,

  "en-to-tr": `You are a professional translator specializing in technology and AI news.
Translate the following English text to Turkish.
- Maintain the same tone and style
- Keep technical terms accurate (but use Turkish equivalents where common)
- Preserve formatting (markdown, HTML)
- Do not add or remove information
- Return ONLY the translated text, no explanations`,
};

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string, locale: SupportedLocale): string {
  const slug = title
    .toLowerCase()
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 100);

  return slug;
}

/**
 * Translate text using DeepSeek API
 */
async function translateWithDeepSeek(
  text: string,
  from: SupportedLocale,
  to: SupportedLocale,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set");
  }

  const systemPrompt =
    from === "tr"
      ? TRANSLATION_PROMPTS["tr-to-en"]
      : TRANSLATION_PROMPTS["en-to-tr"];

  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.3, // Lower temperature for more accurate translations
          max_tokens: 8000,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

/**
 * Translate an article to a target language
 */
export async function translateArticle(
  input: TranslationInput,
  from: SupportedLocale,
  to: SupportedLocale,
): Promise<TranslationOutput> {
  console.log(`🌍 Translating article from ${from} to ${to}...`);
  console.log(`   Title: ${input.title.substring(0, 50)}...`);

  // Translate each field
  const [title, excerpt, content, metaTitle, metaDescription] =
    await Promise.all([
      translateWithDeepSeek(input.title, from, to),
      translateWithDeepSeek(input.excerpt, from, to),
      translateWithDeepSeek(input.content, from, to),
      input.metaTitle
        ? translateWithDeepSeek(input.metaTitle, from, to)
        : Promise.resolve(undefined),
      input.metaDescription
        ? translateWithDeepSeek(input.metaDescription, from, to)
        : Promise.resolve(undefined),
    ]);

  // Generate slug from translated title
  const slug = generateSlug(title, to);

  console.log(`✅ Translation complete: ${title.substring(0, 50)}...`);

  return {
    title,
    excerpt,
    content,
    slug,
    metaTitle,
    metaDescription,
  };
}

/**
 * Create or update article translation in database
 */
export async function saveArticleTranslation(
  articleId: string,
  locale: SupportedLocale,
  translation: TranslationOutput,
): Promise<void> {
  // Check if translation exists
  const existing = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ArticleTranslation" 
    WHERE "articleId" = ${articleId} AND locale = ${locale}
    LIMIT 1
  `;

  if (existing.length > 0) {
    // Update existing
    await db.$executeRaw`
      UPDATE "ArticleTranslation" SET
        title = ${translation.title},
        slug = ${translation.slug},
        excerpt = ${translation.excerpt},
        content = ${translation.content},
        "metaTitle" = ${translation.metaTitle || null},
        "metaDescription" = ${translation.metaDescription || null},
        "updatedAt" = NOW()
      WHERE "articleId" = ${articleId} AND locale = ${locale}
    `;
  } else {
    // Insert new
    await db.$executeRaw`
      INSERT INTO "ArticleTranslation" (
        id, "articleId", locale, title, slug, excerpt, content, 
        "metaTitle", "metaDescription", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${articleId}, ${locale}, ${translation.title}, 
        ${translation.slug}, ${translation.excerpt}, ${translation.content},
        ${translation.metaTitle || null}, ${translation.metaDescription || null}, 
        NOW(), NOW()
      )
    `;
  }

  console.log(
    `💾 Translation saved: ${locale} - ${translation.title.substring(0, 50)}...`,
  );
}

/**
 * Translate and save article to all supported languages
 * Called after article is published
 */
export async function translateAndSaveArticle(
  articleId: string,
  sourceLocale: SupportedLocale = "tr",
): Promise<void> {
  try {
    // Get the article
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
      },
    });

    if (!article) {
      console.error(`Article not found: ${articleId}`);
      return;
    }

    // First, save the source language translation
    await saveArticleTranslation(articleId, sourceLocale, {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      metaTitle: article.metaTitle || undefined,
      metaDescription: article.metaDescription || undefined,
    });

    // Determine target locale
    const targetLocale: SupportedLocale = sourceLocale === "tr" ? "en" : "tr";

    // Translate to target language
    const translation = await translateArticle(
      {
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        metaTitle: article.metaTitle || undefined,
        metaDescription: article.metaDescription || undefined,
      },
      sourceLocale,
      targetLocale,
    );

    // Save translation
    await saveArticleTranslation(articleId, targetLocale, translation);

    console.log(
      `✅ Article translations complete for: ${article.title.substring(0, 50)}...`,
    );
  } catch (error) {
    console.error(`❌ Failed to translate article ${articleId}:`, error);
    // Don't throw - translation failure shouldn't break article publishing
  }
}

/**
 * Get article translation by locale
 */
export async function getArticleTranslation(
  articleId: string,
  locale: SupportedLocale,
): Promise<TranslationOutput | null> {
  const translations = await db.$queryRaw<
    {
      title: string;
      slug: string;
      excerpt: string | null;
      content: string;
      metaTitle: string | null;
      metaDescription: string | null;
    }[]
  >`
    SELECT title, slug, excerpt, content, "metaTitle", "metaDescription"
    FROM "ArticleTranslation"
    WHERE "articleId" = ${articleId} AND locale = ${locale}
    LIMIT 1
  `;

  if (translations.length === 0) {
    return null;
  }

  const translation = translations[0];
  return {
    title: translation.title,
    slug: translation.slug,
    excerpt: translation.excerpt || "",
    content: translation.content,
    metaTitle: translation.metaTitle || undefined,
    metaDescription: translation.metaDescription || undefined,
  };
}

/**
 * Get article by slug and locale
 */
export async function getArticleBySlugAndLocale(
  slug: string,
  locale: SupportedLocale,
) {
  // Get translation with article data using raw query
  const results = await db.$queryRaw<
    {
      // Translation fields
      title: string;
      translatedSlug: string;
      excerpt: string | null;
      content: string;
      metaTitle: string | null;
      metaDescription: string | null;
      // Article fields
      articleId: string;
      originalSlug: string;
      imageUrl: string | null;
      sourceUrl: string | null;
      views: number;
      readingTime: number | null;
      publishedAt: Date | null;
      categoryId: string;
      categoryName: string;
      categorySlug: string;
      authorId: string | null;
      authorName: string | null;
    }[]
  >`
    SELECT 
      at.title,
      at.slug as "translatedSlug",
      at.excerpt,
      at.content,
      at."metaTitle",
      at."metaDescription",
      a.id as "articleId",
      a.slug as "originalSlug",
      a."imageUrl",
      a."sourceUrl",
      a.views,
      a."readingTime",
      a."publishedAt",
      c.id as "categoryId",
      c.name as "categoryName",
      c.slug as "categorySlug",
      u.id as "authorId",
      u.name as "authorName"
    FROM "ArticleTranslation" at
    JOIN "Article" a ON at."articleId" = a.id
    JOIN "Category" c ON a."categoryId" = c.id
    LEFT JOIN "User" u ON a."authorId" = u.id
    WHERE at.slug = ${slug} AND at.locale = ${locale}
    LIMIT 1
  `;

  if (results.length === 0) {
    return null;
  }

  const row = results[0];
  return {
    id: row.articleId,
    title: row.title,
    slug: row.translatedSlug,
    originalSlug: row.originalSlug,
    excerpt: row.excerpt,
    content: row.content,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    imageUrl: row.imageUrl,
    sourceUrl: row.sourceUrl,
    views: row.views,
    readingTime: row.readingTime,
    publishedAt: row.publishedAt,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      slug: row.categorySlug,
    },
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName,
        }
      : null,
    locale,
  };
}

/**
 * Batch translate existing articles (for migration)
 */
export async function migrateExistingArticles(): Promise<void> {
  // Find published articles without translations using raw query
  // Limit increased to 100 to process more articles
  const articlesWithoutTranslations = await db.$queryRaw<{ id: string }[]>`
    SELECT a.id 
    FROM "Article" a 
    LEFT JOIN "ArticleTranslation" at ON a.id = at."articleId" AND at.locale = 'en'
    WHERE a.status = 'PUBLISHED' 
    AND at.id IS NULL
    LIMIT 100
  `;

  console.log(
    `🔄 Found ${articlesWithoutTranslations.length} articles to translate...`,
  );

  // Process in batches of 2 (concurrency)
  const BATCH_SIZE = 2;

  for (let i = 0; i < articlesWithoutTranslations.length; i += BATCH_SIZE) {
    const batch = articlesWithoutTranslations.slice(i, i + BATCH_SIZE);

    console.log(
      `🚀 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(articlesWithoutTranslations.length / BATCH_SIZE)}`,
    );

    // Execute batch in parallel
    await Promise.all(
      batch.map(async ({ id }) => {
        try {
          await translateAndSaveArticle(id, "tr");
        } catch (error) {
          console.error(`❌ Failed to translate article ${id}:`, error);
        }
      }),
    );

    // Add delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < articlesWithoutTranslations.length) {
      console.log("⏳ Waiting 2s before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`✅ Migration batch complete`);
}
