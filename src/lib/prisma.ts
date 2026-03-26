/**
 * Prisma Client Export
 * Re-exports db as prisma for backward compatibility.
 * Canonical import: import { db } from "@/lib/db"
 */

export { db as prisma } from "./db";
export type { PrismaClient } from "@prisma/client";
