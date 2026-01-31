import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/db-migrate
 * Runs necessary database migrations for image columns
 * Admin only
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Add missing image columns using raw SQL
    await db.$executeRaw`
      DO $$ 
      BEGIN
        -- Add imageUrlMedium column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Article' AND column_name = 'imageUrlMedium') THEN
          ALTER TABLE "Article" ADD COLUMN "imageUrlMedium" TEXT;
        END IF;
        
        -- Add imageUrlSmall column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Article' AND column_name = 'imageUrlSmall') THEN
          ALTER TABLE "Article" ADD COLUMN "imageUrlSmall" TEXT;
        END IF;
        
        -- Add imageUrlThumb column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Article' AND column_name = 'imageUrlThumb') THEN
          ALTER TABLE "Article" ADD COLUMN "imageUrlThumb" TEXT;
        END IF;
      END $$;
    `;

    // Verify columns exist
    const result = await db.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Article' 
      AND column_name IN ('imageUrlMedium', 'imageUrlSmall', 'imageUrlThumb')
      ORDER BY column_name
    `;

    return NextResponse.json({
      success: true,
      message: "Database migration completed",
      columns: result.map((r) => r.column_name),
    });
  } catch (error) {
    console.error("Database migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/db-migrate
 * Check if image columns exist
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Article' 
      AND column_name IN ('imageUrlMedium', 'imageUrlSmall', 'imageUrlThumb')
      ORDER BY column_name
    `;

    const existingColumns = result.map((r) => r.column_name);
    const requiredColumns = [
      "imageUrlMedium",
      "imageUrlSmall",
      "imageUrlThumb",
    ];
    const missingColumns = requiredColumns.filter(
      (col) => !existingColumns.includes(col),
    );

    return NextResponse.json({
      success: true,
      existingColumns,
      missingColumns,
      needsMigration: missingColumns.length > 0,
    });
  } catch (error) {
    console.error("Column check error:", error);
    return NextResponse.json(
      { error: "Check failed", details: String(error) },
      { status: 500 },
    );
  }
}
