import { db } from "@/lib/db";
import { Header } from "@/components/Header";

export async function HeaderWrapper() {
  // Skip database queries during build
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return <Header categories={[]} />;
  }

  try {
    const categories = await db.category.findMany({
      orderBy: { order: "asc" },
      take: 6,
    });

    return <Header categories={categories} />;
  } catch (error) {
    console.error("Error fetching categories for header:", error);
    return <Header categories={[]} />;
  }
}
