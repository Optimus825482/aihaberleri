/**
 * Input Validation Schemas
 *
 * Fix #15: Input Validation Eksik
 * Skill: vulnerability-scanner → A05 Injection + nodejs-best-practices → Validation
 *
 * Features:
 * - Zod schema validation
 * - Type-safe validation
 * - Detailed error messages
 * - OWASP A05 Injection prevention
 */

import { z } from "zod";

/**
 * Bulk Optimize Schema
 *
 * Endpoint: /api/admin/seo/bulk-optimize
 * Validates: articleIds array
 */
export const bulkOptimizeSchema = z.object({
  articleIds: z
    .array(z.string().min(1, "Article ID boş olamaz"))
    .min(1, "En az 1 makale seçilmelidir")
    .max(100, "Maksimum 100 makale seçilebilir"),
});

export type BulkOptimizeInput = z.infer<typeof bulkOptimizeSchema>;

/**
 * Bulk Calculate Schema
 *
 * Endpoint: /api/admin/seo/bulk-calculate
 * Validates: status enum, all flag
 */
export const bulkCalculateSchema = z.object({
  all: z.boolean({
    required_error: "all alanı zorunludur",
    invalid_type_error: "all alanı boolean olmalıdır",
  }),
  status: z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED"], {
      errorMap: () => ({ message: "Geçersiz status değeri" }),
    })
    .optional(),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
});

export type BulkCalculateInput = z.infer<typeof bulkCalculateSchema>;

/**
 * SEO Update Schema
 *
 * Endpoint: /api/admin/seo/update
 * Validates: Complete SEO data
 */
export const seoUpdateSchema = z.object({
  articleId: z.string().min(1, "Article ID zorunludur"),
  seoData: z.object({
    title: z
      .string()
      .min(10, "Başlık en az 10 karakter olmalıdır")
      .max(200, "Başlık maksimum 200 karakter olabilir"),
    description: z
      .string()
      .min(50, "Açıklama en az 50 karakter olmalıdır")
      .max(500, "Açıklama maksimum 500 karakter olabilir"),
    keywords: z
      .array(z.string().min(1))
      .min(1, "En az 1 anahtar kelime gereklidir")
      .max(20, "Maksimum 20 anahtar kelime eklenebilir"),
    focusKeyword: z.string().min(1).optional(),
    metaTitle: z
      .string()
      .min(10, "Meta başlık en az 10 karakter olmalıdır")
      .max(70, "Meta başlık maksimum 70 karakter olabilir")
      .optional(),
    metaDescription: z
      .string()
      .min(50, "Meta açıklama en az 50 karakter olmalıdır")
      .max(160, "Meta açıklama maksimum 160 karakter olabilir")
      .optional(),
    slug: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug sadece küçük harf, rakam ve tire içerebilir",
      )
      .optional(),
    canonicalUrl: z.string().url("Geçersiz URL formatı").optional(),
    ogTitle: z.string().max(100).optional(),
    ogDescription: z.string().max(200).optional(),
    ogImage: z.string().url("Geçersiz URL formatı").optional(),
    twitterCard: z
      .enum(["summary", "summary_large_image", "app", "player"])
      .optional(),
  }),
});

export type SEOUpdateInput = z.infer<typeof seoUpdateSchema>;

/**
 * SEO Settings Schema
 *
 * Endpoint: /api/admin/seo/settings
 * Validates: Admin settings
 */
export const seoSettingsSchema = z.object({
  autoOptimize: z.boolean(),
  minScore: z
    .number()
    .int("Minimum skor tam sayı olmalıdır")
    .min(0, "Minimum skor 0'dan küçük olamaz")
    .max(100, "Minimum skor 100'den büyük olamaz"),
  maxRecommendations: z
    .number()
    .int("Maksimum öneri sayısı tam sayı olmalıdır")
    .min(1, "En az 1 öneri gösterilmelidir")
    .max(50, "Maksimum 50 öneri gösterilebilir"),
  enableNotifications: z.boolean(),
  notificationEmail: z.string().email("Geçersiz e-posta formatı").optional(),
  notificationThreshold: z.number().int().min(0).max(100).optional(),
  excludedCategories: z.array(z.string()).optional(),
  excludedAuthors: z.array(z.string()).optional(),
});

export type SEOSettingsInput = z.infer<typeof seoSettingsSchema>;

/**
 * Bulk Recalculate Schema
 *
 * Endpoint: /api/admin/seo/bulk-recalculate
 * Validates: Recalculation parameters
 */
export const bulkRecalculateSchema = z.object({
  articleIds: z
    .array(z.string().min(1))
    .min(1, "En az 1 makale seçilmelidir")
    .max(100, "Maksimum 100 makale seçilebilir")
    .optional(),
  all: z.boolean().optional(),
  filters: z
    .object({
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
      categoryId: z.string().optional(),
      authorId: z.string().optional(),
      minScore: z.number().min(0).max(100).optional(),
      maxScore: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export type BulkRecalculateInput = z.infer<typeof bulkRecalculateSchema>;

/**
 * Export Schema
 *
 * Endpoint: /api/admin/seo/export
 * Validates: Export parameters
 */
export const exportSchema = z.object({
  format: z.enum(["csv", "json", "xlsx"], {
    errorMap: () => ({
      message: "Geçersiz format. csv, json veya xlsx olmalıdır",
    }),
  }),
  filters: z
    .object({
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
      categoryId: z.string().optional(),
      authorId: z.string().optional(),
      minScore: z.number().min(0).max(100).optional(),
      maxScore: z.number().min(0).max(100).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
  fields: z
    .array(
      z.enum([
        "id",
        "title",
        "slug",
        "status",
        "seoScore",
        "keywords",
        "description",
        "author",
        "category",
        "createdAt",
        "updatedAt",
      ]),
    )
    .optional(),
});

export type ExportInput = z.infer<typeof exportSchema>;

/**
 * Validation middleware helper
 *
 * Usage:
 * ```typescript
 * const result = await validateRequest(request, bulkOptimizeSchema);
 * if (!result.success) {
 *   return createValidationErrorResponse(result.error);
 * }
 * ```
 */
export async function validateRequest<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<
  { success: true; data: z.infer<T> } | { success: false; error: z.ZodError }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  } catch (error) {
    // JSON parse error
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Geçersiz JSON formatı",
        },
      ]),
    };
  }
}

/**
 * Create validation error response
 *
 * Returns 422 Unprocessable Entity with detailed errors
 */
export function createValidationErrorResponse(error: z.ZodError): Response {
  const formattedErrors = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return new Response(
    JSON.stringify({
      success: false,
      error: "Validation hatası",
      details: formattedErrors,
    }),
    {
      status: 422,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Sanitize string input to prevent injection
 *
 * OWASP A05 Injection prevention
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/['"]/g, "") // Remove quotes
    .replace(/[;]/g, "") // Remove semicolons
    .replace(/--/g, "") // Remove SQL comments
    .trim();
}

/**
 * Validate and sanitize array input
 */
export function sanitizeArray(input: unknown[]): string[] {
  return input
    .filter((item) => typeof item === "string")
    .map((item) => sanitizeString(item))
    .filter((item) => item.length > 0);
}
