import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a mock PrismaClient for build time
const createMockPrismaClient = () => {
  return new Proxy(
    {},
    {
      get: () => {
        throw new Error(
          "PrismaClient is not available during build time. This should not be called.",
        );
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
      }));

// Robust cleanup and connection handling
if (process.env.NODE_ENV === "production") {
  process.on("beforeExit", async () => {
    await (db as PrismaClient).$disconnect();
  });
}

if (
  process.env.NODE_ENV !== "production" &&
  process.env.SKIP_ENV_VALIDATION !== "1"
) {
  globalForPrisma.prisma = db as PrismaClient;
}
