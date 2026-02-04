/**
 * Example API Route with Centralized Error Handler
 * Demonstrates proper error handling patterns
 * Skill: nodejs-best-practices → Error handling
 * Skill: vulnerability-scanner → OWASP A09, A10
 */

import { NextRequest, NextResponse } from "next/server";
import { Errors, handleApiError, asyncHandler } from "@/lib/errors";
import { auth } from "@/lib/auth";

/**
 * Example GET endpoint with error handling
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session) {
      throw Errors.authentication();
    }

    // Validation
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw Errors.validation("ID parametresi gerekli", { field: "id" });
    }

    // Business logic
    const data = await fetchData(id);

    if (!data) {
      throw Errors.notFound("Data");
    }

    // Success response
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    // Centralized error handling
    return handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      {
        endpoint: "/api/example-with-error-handler",
        method: "GET",
      },
    );
  }
}

/**
 * Example POST endpoint with asyncHandler wrapper
 * Automatically catches and handles errors
 */
export const POST = asyncHandler(async (request: NextRequest) => {
  // Authentication
  const session = await auth();
  if (!session) {
    throw Errors.authentication();
  }

  // Parse body
  const body = await request.json();

  // Validation
  if (!body.name || !body.email) {
    throw Errors.validation("Name ve email gerekli", {
      fields: ["name", "email"],
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw Errors.validation("Geçersiz email formatı", {
      field: "email",
      value: body.email,
    });
  }

  // Database operation
  try {
    const result = await saveToDatabase(body);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (dbError) {
    // Database-specific error
    throw Errors.database("Veritabanı kayıt hatası");
  }
});

/**
 * Example helper functions
 */
async function fetchData(id: string) {
  // Simulate data fetching
  if (id === "error") {
    throw new Error("Database connection failed");
  }
  return { id, name: "Example Data" };
}

async function saveToDatabase(data: any) {
  // Simulate database save
  return { id: "123", ...data };
}
