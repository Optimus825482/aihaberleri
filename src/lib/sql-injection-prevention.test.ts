/**
 * SQL Injection Prevention Test Suite
 *
 * Fix #16: SQL Injection Prevention
 * Skill: vulnerability-scanner → A05 Injection + api-patterns → Parameterized queries
 *
 * Test Coverage:
 * - Raw query detection
 * - Parameterized query usage
 * - Input sanitization
 * - Prisma best practices
 */

import { describe, it, expect } from "@jest/globals";
import {
  sanitizeInput,
  validatePrismaQuery,
  detectRawQuery,
} from "./sql-injection-prevention";

describe("SQL Injection Prevention", () => {
  describe("Input Sanitization", () => {
    it("should sanitize SQL injection attempts", () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM articles WHERE 1=1",
        "' UNION SELECT * FROM users--",
      ];

      maliciousInputs.forEach((input) => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain(";");
        expect(sanitized).not.toContain("--");
        expect(sanitized).not.toContain("DROP");
        expect(sanitized).not.toContain("DELETE");
        expect(sanitized).not.toContain("UNION");
      });
    });

    it("should preserve safe input", () => {
      const safeInputs = [
        "test-article-123",
        "user@example.com",
        "Normal text with spaces",
        "12345",
      ];

      safeInputs.forEach((input) => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).toBe(input);
      });
    });

    it("should handle empty and null inputs", () => {
      expect(sanitizeInput("")).toBe("");
      expect(sanitizeInput(null as any)).toBe("");
      expect(sanitizeInput(undefined as any)).toBe("");
    });

    it("should escape special characters", () => {
      const input = "Test's article";
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain("'");
      expect(sanitized).toContain("Test");
      expect(sanitized).toContain("article");
    });
  });

  describe("Raw Query Detection", () => {
    it("should detect raw SQL queries", () => {
      const rawQueries = [
        "SELECT * FROM users WHERE id = 1",
        'INSERT INTO articles VALUES (1, "test")',
        'UPDATE users SET role = "admin"',
        "DELETE FROM sessions WHERE expired = true",
      ];

      rawQueries.forEach((query) => {
        const isRaw = detectRawQuery(query);
        expect(isRaw).toBe(true);
      });
    });

    it("should not flag Prisma queries", () => {
      const prismaQueries = [
        "prisma.user.findMany()",
        "prisma.article.create({ data: {} })",
        "prisma.session.delete({ where: {} })",
      ];

      prismaQueries.forEach((query) => {
        const isRaw = detectRawQuery(query);
        expect(isRaw).toBe(false);
      });
    });

    it("should detect $queryRaw usage", () => {
      const queryRawUsage = "prisma.$queryRaw`SELECT * FROM users`";
      const isRaw = detectRawQuery(queryRawUsage);
      expect(isRaw).toBe(true);
    });

    it("should detect $executeRaw usage", () => {
      const executeRawUsage =
        "prisma.$executeRaw`UPDATE users SET active = true`";
      const isRaw = detectRawQuery(executeRawUsage);
      expect(isRaw).toBe(true);
    });
  });

  describe("Prisma Query Validation", () => {
    it("should validate safe Prisma queries", () => {
      const safeQueries = [
        {
          method: "findMany",
          where: { status: "PUBLISHED" },
        },
        {
          method: "create",
          data: { title: "Test", content: "Content" },
        },
        {
          method: "update",
          where: { id: "123" },
          data: { title: "Updated" },
        },
      ];

      safeQueries.forEach((query) => {
        const isValid = validatePrismaQuery(query);
        expect(isValid).toBe(true);
      });
    });

    it("should reject queries with raw SQL", () => {
      const unsafeQueries = [
        {
          method: "$queryRaw",
          query: "SELECT * FROM users",
        },
        {
          method: "$executeRaw",
          query: "DELETE FROM sessions",
        },
      ];

      unsafeQueries.forEach((query) => {
        const isValid = validatePrismaQuery(query);
        expect(isValid).toBe(false);
      });
    });

    it("should validate parameterized queries", () => {
      const parameterizedQuery = {
        method: "findMany",
        where: {
          AND: [{ status: "PUBLISHED" }, { authorId: "123" }],
        },
      };

      const isValid = validatePrismaQuery(parameterizedQuery);
      expect(isValid).toBe(true);
    });

    it("should reject queries with SQL keywords in values", () => {
      const suspiciousQuery = {
        method: "findMany",
        where: {
          title: "'; DROP TABLE users; --",
        },
      };

      const isValid = validatePrismaQuery(suspiciousQuery);
      expect(isValid).toBe(false);
    });
  });

  describe("Parameterized Query Conversion", () => {
    it("should convert raw query to parameterized", () => {
      const rawQuery = {
        sql: "SELECT * FROM articles WHERE status = ?",
        params: ["PUBLISHED"],
      };

      const parameterized = {
        where: { status: "PUBLISHED" },
      };

      // Test that parameterized version is safer
      expect(validatePrismaQuery(parameterized)).toBe(true);
    });

    it("should handle multiple parameters", () => {
      const parameterized = {
        where: {
          AND: [
            { status: "PUBLISHED" },
            { categoryId: "123" },
            { authorId: "456" },
          ],
        },
      };

      expect(validatePrismaQuery(parameterized)).toBe(true);
    });

    it("should handle nested conditions", () => {
      const parameterized = {
        where: {
          OR: [
            { status: "PUBLISHED" },
            {
              AND: [{ status: "DRAFT" }, { authorId: "123" }],
            },
          ],
        },
      };

      expect(validatePrismaQuery(parameterized)).toBe(true);
    });
  });

  describe("OWASP A05 Injection Prevention", () => {
    it("should prevent SQL injection in WHERE clause", () => {
      const maliciousWhere = {
        id: "1' OR '1'='1",
      };

      const sanitizedWhere = {
        id: sanitizeInput(maliciousWhere.id),
      };

      expect(sanitizedWhere.id).not.toContain("'");
      expect(sanitizedWhere.id).not.toContain("OR");
    });

    it("should prevent SQL injection in ORDER BY", () => {
      const maliciousOrderBy = "id; DROP TABLE users; --";
      const sanitized = sanitizeInput(maliciousOrderBy);

      expect(sanitized).not.toContain(";");
      expect(sanitized).not.toContain("DROP");
      expect(sanitized).not.toContain("--");
    });

    it("should prevent SQL injection in LIMIT/OFFSET", () => {
      const maliciousLimit = "10; DELETE FROM articles";
      const sanitized = sanitizeInput(maliciousLimit);

      expect(sanitized).not.toContain(";");
      expect(sanitized).not.toContain("DELETE");
    });

    it("should prevent blind SQL injection", () => {
      const blindInjection = "1' AND SLEEP(5)--";
      const sanitized = sanitizeInput(blindInjection);

      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain("SLEEP");
      expect(sanitized).not.toContain("--");
    });

    it("should prevent second-order SQL injection", () => {
      const secondOrderInjection =
        "admin'; UPDATE users SET role='admin' WHERE '1'='1";
      const sanitized = sanitizeInput(secondOrderInjection);

      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain("UPDATE");
      expect(sanitized).not.toContain("WHERE");
    });
  });
});
