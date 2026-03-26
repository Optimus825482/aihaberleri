import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __dbSignalHandlersRegistered?: boolean;
};

function throwBuildTimeDbError(methodPath: string): never {
  throw new Error(
    `PrismaClient is not available during build time. Attempted to call: ${methodPath}`,
  );
}

function createBuildSafeMethodProxy(methodPath: string): any {
  return new Proxy(function buildSafePrismaMethod() {}, {
    apply: () => throwBuildTimeDbError(methodPath),
    get: (_target, prop) => {
      if (prop === "then") return undefined;
      if (prop === "toString") {
        return () => `[BuildSafePrismaMethod ${methodPath}]`;
      }
      return createBuildSafeMethodProxy(`${methodPath}.${String(prop)}`);
    },
  });
}

// Create a build-safe PrismaClient mock:
// - property access is allowed (prevents module-eval crashes)
// - actual method invocation throws explicit error
const createMockPrismaClient = () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then") return undefined;
        if (prop === "$on") return () => undefined;
        if (prop === "$connect") return async () => undefined;
        if (prop === "$disconnect") return async () => undefined;

        return createBuildSafeMethodProxy(String(prop));
      },
    },
  ) as PrismaClient;
};

// Skip PrismaClient creation during build time
export const db =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? createMockPrismaClient()
    : (globalForPrisma.prisma ??
      new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
        errorFormat: "pretty",
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        // 🚀 CONNECTION POOL SETTINGS (FAZ 2 - Performance Optimization)
        // Optimized for BullMQ worker with long-running operations
        // - connection_limit: Max concurrent DB connections (reduced to prevent overload)
        // - pool_timeout: How long to wait for a connection (increased for long queries)
        // - statement_timeout: Max query execution time (prevents runaway queries)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any));

// 🚀 PERFORMANCE MONITORING: Log slow queries (> 100ms)
if (
  process.env.SKIP_ENV_VALIDATION !== "1" &&
  db &&
  typeof (db as PrismaClient).$on === "function"
) {
  (db as PrismaClient).$on(
    "query" as never,
    ((e: any) => {
      if (e.duration > 100) {
        console.warn(
          `⚠️ Slow query detected (${e.duration}ms):`,
          e.query.substring(0, 200),
        );
        if (e.duration > 500) {
          console.error(
            `🔥 CRITICAL: Very slow query (${e.duration}ms):`,
            e.query.substring(0, 200),
          );
        }
      }
    }) as never,
  );
}

// Robust cleanup and connection handling
if (process.env.NODE_ENV === "production") {
  if (!globalForPrisma.__dbSignalHandlersRegistered) {
    // Graceful shutdown on process exit
    process.on("beforeExit", async () => {
      console.log("🔄 Process exiting, disconnecting from database...");
      await (db as PrismaClient).$disconnect();
    });

    // Handle SIGTERM (Docker/Kubernetes shutdown)
    process.once("SIGTERM", async () => {
      console.log("📛 SIGTERM received, closing database connection...");
      await (db as PrismaClient).$disconnect();
      process.exit(0);
    });

    // Handle SIGINT (Ctrl+C)
    process.once("SIGINT", async () => {
      console.log("📛 SIGINT received, closing database connection...");
      await (db as PrismaClient).$disconnect();
      process.exit(0);
    });

    globalForPrisma.__dbSignalHandlersRegistered = true;
  }
}

if (process.env.SKIP_ENV_VALIDATION !== "1") {
  globalForPrisma.prisma = db as PrismaClient;
}

/**
 * Retry wrapper for critical database operations
 * Handles transient connection errors with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        console.error(
          `❌ DB operation failed after ${maxRetries} attempts:`,
          error,
        );
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
      console.warn(
        `⚠️ DB operation failed, retry ${attempt}/${maxRetries} in ${delay}ms:`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await (db as PrismaClient).$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    return false;
  }
}
