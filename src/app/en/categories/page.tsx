import { db } from "@/lib/db";
import Link from "next/link";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

// Category slug to English name mapping
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  "yapay-zeka-haberleri": "AI News",
  "yapay-zeka": "Artificial Intelligence",
  "makine-ogrenmesi": "Machine Learning",
  "dogal-dil-isleme": "Natural Language Processing",
  "bilgisayarli-goru": "Computer Vision",
  robotik: "Robotics",
  "yapay-zeka-etigi": "AI Ethics",
  "yapay-zeka-araclari": "AI Tools",
  "sektor-haberleri": "Industry News",
  arastirma: "Research",
  "derin-ogrenme": "Deep Learning",
  "otonom-sistemler": "Autonomous Systems",
  egitim: "Education",
  saglik: "Healthcare",
  finans: "Finance",
};

export const metadata: Metadata = {
  title: "Categories - AI News",
  description:
    "Browse the latest artificial intelligence news by category. From Machine Learning to Robotics.",
};

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Categories</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category: Category) => (
          <Link
            key={category.id}
            href={`/en/category/${category.slug}`}
            className="group block p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold group-hover:text-blue-600 transition-colors">
                {CATEGORY_TRANSLATIONS[category.slug] || category.name}
              </h2>
              <span className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
                →
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Latest news and updates about{" "}
              {CATEGORY_TRANSLATIONS[category.slug] || category.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
