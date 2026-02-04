/**
 * Centralized Error Handler
 * Skill: nodejs-best-practices → Error handling
 * Skill: vulnerability-scanner → OWASP A09 Logging & A10 Exceptional Conditions
 *
 * Standardized error handling for all API endpoints
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Standardized Error Codes
 * OWASP A10: Exceptional Conditions - Defined error codes
 */
export enum ErrorCode {
  // Client Errors (4xx)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  BAD_REQUEST = "BAD_REQUEST",

  // Server Errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

/**
 * Custom Application Error
 * Operational errors that are expected and handled
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardized Error Response Format
 * Consistent across all API endpoints
 */
interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Create standardized error response
 * OWASP A10: Sanitize error messages in production
 */
export function createErrorResponse(error: Error | AppError): ErrorResponse {
  const isProduction = process.env.NODE_ENV === "production";

  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        // Only include details in development
        ...(!isProduction && error.details && { details: error.details }),
      },
    };
  }

  // Generic Error - sanitize in production
  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: isProduction
        ? "Internal server error"
        : error.message || "Unknown error",
    },
  };
}

/**
 * Handle API errors and return NextResponse
 * OWASP A09: Structured logging for all errors
 */
export function handleApiError(
  error: Error | AppError,
  context?: Record<string, any>,
): NextResponse<ErrorResponse> {
  // Log error with context
  if (error instanceof AppError) {
    // Operational errors - log as warning
    logger.warn("API Error", {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      ...context,
    });
  } else {
    // Unexpected errors - log as error with stack trace
    logger.error("Unexpected API Error", {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  const response = createErrorResponse(error);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Common error factory functions
 */
export const Errors = {
  validation: (message: string, details?: Record<string, any>) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),

  authentication: (message: string = "Yetkisiz erişim") =>
    new AppError(ErrorCode.AUTHENTICATION_ERROR, message, 401),

  authorization: (message: string = "Yetkiniz yok") =>
    new AppError(ErrorCode.AUTHORIZATION_ERROR, message, 403),

  notFound: (resource: string = "Resource") =>
    new AppError(ErrorCode.NOT_FOUND, `${resource} bulunamadı`, 404),

  rateLimit: (message: string = "Too many requests") =>
    new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429),

  database: (message: string = "Database error") =>
    new AppError(ErrorCode.DATABASE_ERROR, message, 500),

  externalService: (service: string, message?: string) =>
    new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      message || `${service} service error`,
      503,
    ),

  internal: (message: string = "Internal server error") =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500),
};

/**
 * Async error wrapper for API routes
 * Automatically catches and handles errors
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleApiError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };
}
