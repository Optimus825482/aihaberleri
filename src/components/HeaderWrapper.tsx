import { db } from "@/lib/db";
import { Header } from "@/components/Header";

export async function HeaderWrapper() {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    take: 6,
  });

  return <Header categories={categories} />;
}
