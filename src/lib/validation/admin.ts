/**
 * Admin API Validation Schemas
 *
 * Zod schemas for admin panel API endpoints
 */

import { z } from "zod";

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const BulkActionSchema = z
  .object({
    action: z.enum(["publish", "unpublish", "delete", "changeCategory"], {
      errorMap: () => ({ message: "Geçersiz işlem tipi" }),
    }),
    ids: z
      .array(z.string())
      .min(1, "En az 1 makale seçilmeli")
      .max(100, "Maksimum 100 makale seçilebilir"),
    categoryId: z.string().optional(),
  })
  .refine(
    (data) => {
      // changeCategory action için categoryId zorunlu
      if (data.action === "changeCategory" && !data.categoryId) {
        return false;
      }
      return true;
    },
    {
      message: "Kategori değiştirme işlemi için categoryId gerekli",
      path: ["categoryId"],
    },
  );

export type BulkActionInput = z.infer<typeof BulkActionSchema>;

// ============================================================================
// ADVANCED FILTERS
// ============================================================================

export const AdvancedFiltersSchema = z
  .object({
    // Pagination
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),

    // Filters
    categories: z
      .string()
      .transform((val) => val.split(",").filter(Boolean))
      .optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    status: z
      .string()
      .transform((val) => val.split(",").filter(Boolean))
      .pipe(z.array(z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])))
      .optional(),
    viewsMin: z.coerce.number().int().nonnegative().optional(),
    viewsMax: z.coerce.number().int().nonnegative().optional(),
    scoreMin: z.coerce.number().nonnegative().optional(),
    scoreMax: z.coerce.number().nonnegative().optional(),

    // Search
    search: z.string().max(200).optional(),

    // Sorting
    sortBy: z
      .enum(["createdAt", "publishedAt", "views", "score"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (data) => {
      // viewsMin <= viewsMax
      if (
        data.viewsMin !== undefined &&
        data.viewsMax !== undefined &&
        data.viewsMin > data.viewsMax
      ) {
        return false;
      }
      return true;
    },
    {
      message: "viewsMin, viewsMax'tan büyük olamaz",
      path: ["viewsMin"],
    },
  )
  .refine(
    (data) => {
      // scoreMin <= scoreMax
      if (
        data.scoreMin !== undefined &&
        data.scoreMax !== undefined &&
        data.scoreMin > data.scoreMax
      ) {
        return false;
      }
      return true;
    },
    {
      message: "scoreMin, scoreMax'tan büyük olamaz",
      path: ["scoreMin"],
    },
  )
  .refine(
    (data) => {
      // dateFrom <= dateTo
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        return false;
      }
      return true;
    },
    {
      message: "dateFrom, dateTo'dan sonra olamaz",
      path: ["dateFrom"],
    },
  );

export type AdvancedFiltersInput = z.infer<typeof AdvancedFiltersSchema>;

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const CreateUserSchema = z.object({
  name: z
    .string()
    .min(2, "İsim en az 2 karakter olmalı")
    .max(100, "İsim maksimum 100 karakter olabilir"),
  email: z.string().email("Geçerli bir email adresi giriniz").toLowerCase(),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı")
    .max(100, "Şifre maksimum 100 karakter olabilir")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Şifre en az 1 küçük harf, 1 büyük harf ve 1 rakam içermelidir",
    ),
  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "EDITOR", "VIEWER", "MODERATOR"])
    .default("ADMIN"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, "İsim en az 2 karakter olmalı")
    .max(100, "İsim maksimum 100 karakter olabilir")
    .optional(),
  email: z
    .string()
    .email("Geçerli bir email adresi giriniz")
    .toLowerCase()
    .optional(),
  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "EDITOR", "VIEWER", "MODERATOR"])
    .optional(),
  emailVerified: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const BulkRoleSchema = z.object({
  userIds: z
    .array(z.string())
    .min(1, "En az 1 kullanıcı seçilmeli")
    .max(50, "Maksimum 50 kullanıcı seçilebilir"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "EDITOR", "VIEWER", "MODERATOR"]),
});

export type BulkRoleInput = z.infer<typeof BulkRoleSchema>;

export const ListUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().max(200).optional(),
  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "EDITOR", "VIEWER", "MODERATOR"])
    .optional(),
  sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListUsersInput = z.infer<typeof ListUsersSchema>;

// ============================================================================
// MONITORING
// ============================================================================

export const ErrorLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  level: z.enum(["error", "warn", "fatal"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
});

export type ErrorLogsInput = z.infer<typeof ErrorLogsSchema>;

export const PerformanceMetricsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  granularity: z.enum(["hour", "day", "week"]).default("day"),
});

export type PerformanceMetricsInput = z.infer<typeof PerformanceMetricsSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate request body with Zod schema
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated data or throws ZodError
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns result object
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns { success: true, data } or { success: false, error }
 */
export function safeValidateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors for API response
 *
 * @param error - ZodError
 * @returns Formatted error object
 */
export function formatZodError(error: z.ZodError) {
  return {
    message: "Validation error",
    errors: error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    })),
  };
}
