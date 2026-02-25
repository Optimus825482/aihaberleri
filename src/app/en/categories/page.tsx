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

const CATEGORY_SLUG_TRANSLATIONS: Record<string, string> = {
  "yapay-zeka-haberleri": "AI News",
  "yapay-zeka": "Artificial Intelligence",
  "yapay-zeka-modelleri": "AI Models",
  "makine-ogrenmesi": "Machine Learning",
  "dogal-dil-isleme": "Natural Language Processing",
  "bilgisayarli-goru": "Computer Vision",
  robotik: "Robotics",
  "robotik-ve-otonom-sistemler": "Robotics and Autonomous Systems",
  "yapay-zeka-etigi": "AI Ethics",
  "etik-guvenlik-ve-regulasyon": "Ethics, Security and Regulation",
  "yapay-zeka-araclari": "AI Tools",
  "yapay-zeka-araclari-ve-urunler": "AI Tools and Products",
  "sektor-haberleri": "Industry News",
  "sektor-ve-is-dunyasi": "Industry and Business",
  arastirma: "Research",
  "bilim-ve-arastirma": "Science and Research",
  "yapay-zeka-ve-toplum": "AI and Society",
  "derin-ogrenme": "Deep Learning",
  "otonom-sistemler": "Autonomous Systems",
  egitim: "Education",
  saglik: "Healthcare",
  finans: "Finance",
};

const CATEGORY_NAME_TRANSLATIONS: Record<string, string> = {
  "Yapay Zeka": "Artificial Intelligence",
  "Yapay Zeka Modelleri": "AI Models",
  "Sektör ve İş Dünyası": "Industry and Business",
  "Yapay Zeka Araçları ve Ürünler": "AI Tools and Products",
  "Robotik ve Otonom Sistemler": "Robotics and Autonomous Systems",
  "Etik, Güvenlik ve Regülasyon": "Ethics, Security and Regulation",
  "Bilim ve Araştırma": "Science and Research",
  "Yapay Zeka ve Toplum": "AI and Society",
};

function getCategoryLabel(category: Category): string {
  return (
    CATEGORY_SLUG_TRANSLATIONS[category.slug] ||
    CATEGORY_NAME_TRANSLATIONS[category.name] ||
    category.name
  );
}

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
    <div className="min-h-screen bg-ai-background-dark">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-white">Categories</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category: Category) => (
            <Link
              key={category.id}
              href={`/en/category/${category.slug}`}
              className="group block p-8 bg-ai-surface-card rounded-xl border border-ai-surface-border hover:border-ai-primary/50 hover:bg-ai-surface-hover transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white group-hover:text-ai-primary transition-colors">
                  {getCategoryLabel(category)}
                </h2>
                <span className="material-symbols-outlined text-[20px] text-ai-text-muted group-hover:text-ai-primary transition-all">arrow_forward</span>
              </div>
              <p className="text-ai-text-secondary">
                Latest news and updates about {getCategoryLabel(category)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
