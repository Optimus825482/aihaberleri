/**
 * Shared JWT Secret Helper
 * Single source of truth for JWT secret across middleware and admin auth
 */
export const getJwtSecret = (): Uint8Array => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET must be set in production environment");
    }
    console.warn(
      "⚠️ WARNING: Using dev-only JWT secret. Set NEXTAUTH_SECRET in production!",
    );
    return new TextEncoder().encode("dev-only-secret-change-in-production");
  }
  return new TextEncoder().encode(secret);
};
