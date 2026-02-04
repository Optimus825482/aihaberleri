/**
 * Input Validation Test Suite
 *
 * Fix #15: Input Validation Eksik
 * Skill: vulnerability-scanner → A05 Injection + nodejs-best-practices → Validation
 *
 * Test Coverage:
 * - Zod schema validation
 * - Array validation
 * - Enum validation
 * - Nested object validation
 * - Error messages
 */

import { describe, it, expect } from "@jest/globals";
import {
  bulkOptimizeSchema,
  bulkCalculateSchema,
  seoUpdateSchema,
  seoSettingsSchema,
} from "./validation-schemas";

describe("Input Validation Schemas", () => {
  describe("bulkOptimizeSchema", () => {
    it("should validate correct articleIds array", () => {
      const validData = {
        articleIds: ["123", "456", "789"],
      };

      const result = bulkOptimizeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty articleIds array", () => {
      const invalidData = {
        articleIds: [],
      };

      const result = bulkOptimizeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("en az 1");
      }
    });

    it("should reject non-string articleIds", () => {
      const invalidData = {
        articleIds: [123, 456],
      };

      const result = bulkOptimizeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing articleIds", () => {
      const invalidData = {};

      const result = bulkOptimizeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should limit articleIds array size", () => {
      const invalidData = {
        articleIds: Array(101).fill("id"), // Max 100
      };

      const result = bulkOptimizeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("100");
      }
    });
  });

  describe("bulkCalculateSchema", () => {
    it("should validate correct status enum", () => {
      const validData = {
        all: true,
        status: "PUBLISHED",
      };

      const result = bulkCalculateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid status enum", () => {
      const invalidData = {
        all: true,
        status: "INVALID_STATUS",
      };

      const result = bulkCalculateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate with optional status", () => {
      const validData = {
        all: true,
      };

      const result = bulkCalculateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject non-boolean all field", () => {
      const invalidData = {
        all: "true", // String instead of boolean
        status: "PUBLISHED",
      };

      const result = bulkCalculateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("seoUpdateSchema", () => {
    it("should validate complete SEO data", () => {
      const validData = {
        articleId: "123",
        seoData: {
          title: "Test Article",
          description: "Test description",
          keywords: ["test", "article"],
          focusKeyword: "test",
          metaTitle: "Meta Title",
          metaDescription: "Meta description",
          slug: "test-article",
        },
      };

      const result = seoUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const invalidData = {
        articleId: "123",
        seoData: {
          title: "Test",
          // description eksik
        },
      };

      const result = seoUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate title length constraints", () => {
      const invalidData = {
        articleId: "123",
        seoData: {
          title: "A".repeat(201), // Max 200
          description: "Test description",
          keywords: ["test"],
        },
      };

      const result = seoUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("200");
      }
    });

    it("should validate description length constraints", () => {
      const invalidData = {
        articleId: "123",
        seoData: {
          title: "Test",
          description: "Short", // Min 50
          keywords: ["test"],
        },
      };

      const result = seoUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("50");
      }
    });

    it("should validate keywords array", () => {
      const invalidData = {
        articleId: "123",
        seoData: {
          title: "Test",
          description: "A".repeat(60),
          keywords: [], // Min 1
        },
      };

      const result = seoUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate slug format", () => {
      const invalidData = {
        articleId: "123",
        seoData: {
          title: "Test",
          description: "A".repeat(60),
          keywords: ["test"],
          slug: "Invalid Slug!", // Sadece lowercase, numbers, hyphens
        },
      };

      const result = seoUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("seoSettingsSchema", () => {
    it("should validate complete settings", () => {
      const validData = {
        autoOptimize: true,
        minScore: 70,
        maxRecommendations: 10,
        enableNotifications: false,
        notificationEmail: "test@example.com",
      };

      const result = seoSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate minScore range", () => {
      const invalidData = {
        autoOptimize: true,
        minScore: 150, // Max 100
        maxRecommendations: 10,
      };

      const result = seoSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate email format", () => {
      const invalidData = {
        autoOptimize: true,
        minScore: 70,
        maxRecommendations: 10,
        enableNotifications: true,
        notificationEmail: "invalid-email", // Invalid format
      };

      const result = seoSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate maxRecommendations range", () => {
      const invalidData = {
        autoOptimize: true,
        minScore: 70,
        maxRecommendations: 0, // Min 1
      };

      const result = seoSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Error Messages", () => {
    it("should provide detailed error messages", () => {
      const invalidData = {
        articleIds: "not-an-array",
      };

      const result = bulkOptimizeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].path).toContain("articleIds");
      }
    });

    it("should handle multiple validation errors", () => {
      const invalidData = {
        articleId: "", // Empty
        seoData: {
          title: "", // Empty
          description: "Short", // Too short
          keywords: [], // Empty array
        },
      };

      const result = seoUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});
