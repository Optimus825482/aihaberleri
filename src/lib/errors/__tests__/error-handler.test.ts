// @ts-nocheck
/**
 * Error Handler Test Suite
 * TDD: Test-Driven Development approach
 * Skill: nodejs-best-practices → Error handling patterns
 */

import { describe, it, expect } from "@jest/globals";
import {
  AppError,
  ErrorCode,
  handleApiError,
  createErrorResponse,
} from "../error-handler";

describe("Error Handler", () => {
  describe("AppError", () => {
    it("should create validation error with correct properties", () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid input",
        400,
        { field: "email" },
      );

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: "email" });
      expect(error.isOperational).toBe(true);
    });

    it("should create authentication error", () => {
      const error = new AppError(
        ErrorCode.AUTHENTICATION_ERROR,
        "Yetkisiz erişim",
        401,
      );

      expect(error.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
      expect(error.statusCode).toBe(401);
    });

    it("should create internal error", () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        "Internal server error",
        500,
      );

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
    });
  });

  describe("createErrorResponse", () => {
    it("should create standardized error response in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid email",
        400,
        { field: "email" },
      );

      const response = createErrorResponse(error);

      expect(response).toEqual({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid email",
        },
      });

      // Details should NOT be exposed in production
      expect(response.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should include details in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid email",
        400,
        { field: "email", reason: "format" },
      );

      const response = createErrorResponse(error);

      expect(response).toEqual({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid email",
          details: { field: "email", reason: "format" },
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle generic Error objects", () => {
      const error = new Error("Something went wrong");
      const response = createErrorResponse(error);

      expect(response).toEqual({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error",
        },
      });
    });

    it("should sanitize internal error messages in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Database connection failed: password=secret123");
      const response = createErrorResponse(error);

      // Should NOT expose internal details
      expect(response.error.message).toBe("Internal server error");
      expect(response.error.message).not.toContain("password");

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("handleApiError", () => {
    it("should return NextResponse with correct status and body", () => {
      const error = new AppError(
        ErrorCode.NOT_FOUND,
        "Resource not found",
        404,
      );

      const response = handleApiError(error);

      expect(response.status).toBe(404);
    });

    it("should default to 500 for unknown errors", () => {
      const error = new Error("Unknown error");
      const response = handleApiError(error);

      expect(response.status).toBe(500);
    });

    it("should handle rate limit errors", () => {
      const error = new AppError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        "Too many requests",
        429,
      );

      const response = handleApiError(error);

      expect(response.status).toBe(429);
    });
  });

  describe("Error Codes", () => {
    it("should have all required error codes defined", () => {
      expect(ErrorCode.VALIDATION_ERROR).toBeDefined();
      expect(ErrorCode.AUTHENTICATION_ERROR).toBeDefined();
      expect(ErrorCode.AUTHORIZATION_ERROR).toBeDefined();
      expect(ErrorCode.NOT_FOUND).toBeDefined();
      expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBeDefined();
      expect(ErrorCode.INTERNAL_ERROR).toBeDefined();
      expect(ErrorCode.DATABASE_ERROR).toBeDefined();
      expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBeDefined();
    });
  });
});
