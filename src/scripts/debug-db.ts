import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("🔍 Testing Database Connection...");
  console.log("URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")); // Hide password

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("✅ Connection established!");

    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("✅ Query successful:", result);

    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("📊 Tables found:", Array.isArray(tables) ? tables.length : 0);
  } catch (error) {
    console.error("❌ Connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
