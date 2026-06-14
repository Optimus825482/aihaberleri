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
      "⚠️ WARNING: dev-only-secret-change-in-production kullanılıyor. " +
        "Bu production'da güvenlik riski oluşturur. " +
        "NEXTAUTH_SECRET environment variable'ını mutlaka ayarlayın!",
    );
    return new TextEncoder().encode("dev-only-secret-change-in-production");
  }
  return new TextEncoder().encode(secret);
};
