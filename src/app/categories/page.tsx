import { db } from "@/lib/db";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    include: {
      _count: {
        select: { articles: { where: { status: "PUBLISHED" } } },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-foreground">
          Kategoriler
        </h1>
        <p className="text-muted-foreground text-lg">
          İlginizi çeken konulara göre haberlere göz atın.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`}>
            <Card className="h-full hover:shadow-xl transition-all duration-300 border hover:border-primary/50 group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="mb-2 bg-primary/5 text-primary border-primary/20"
                  >
                    {category._count.articles} Haber
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                  {category.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2">
                  {category.description ||
                    `${category.name} dünyasındaki en son yapay zeka gelişmeleri.`}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
          <p className="text-muted-foreground">
            Şu an tanımlı kategori bulunmuyor.
          </p>
        </div>
      )}
    </div>
  );
}
