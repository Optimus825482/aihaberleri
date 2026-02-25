import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryFiltersProps {
  categories: Category[];
  locale?: "tr" | "en";
  selectedCategory?: string;
}

const EN_CATEGORY_SLUG_TRANSLATIONS: Record<string, string> = {
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

const EN_CATEGORY_NAME_TRANSLATIONS: Record<string, string> = {
  "Yapay Zeka": "Artificial Intelligence",
  "Yapay Zeka Modelleri": "AI Models",
  "Sektör ve İş Dünyası": "Industry and Business",
  "Yapay Zeka Araçları ve Ürünler": "AI Tools and Products",
  "Robotik ve Otonom Sistemler": "Robotics and Autonomous Systems",
  "Etik, Güvenlik ve Regülasyon": "Ethics, Security and Regulation",
  "Bilim ve Araştırma": "Science and Research",
  "Yapay Zeka ve Toplum": "AI and Society",
};

const categoryIcons: Record<string, string> = {
  "openai": "smart_toy",
  "google-ai": "search",
  "robotik": "precision_manufacturing",
  "yazilim": "code",
  "etik": "gavel",
  "makine-ogrenimi": "psychology",
  "robotics": "precision_manufacturing",
  "software": "code",
  "ethics": "gavel",
  "machine-learning": "psychology",
};

const texts = {
  tr: {
    all: "Tümü",
    categories: "Kategoriler",
  },
  en: {
    all: "All",
    categories: "Categories",
  },
};

export function CategoryFilters({ categories, locale = "tr", selectedCategory }: CategoryFiltersProps) {
  const t = texts[locale];

  const getCategoryLink = (slug: string) => {
    if (locale === "en") {
      return slug === "" ? "/en" : `/en/category/${slug}`;
    }
    return slug === "" ? "/" : `/category/${slug}`;
  };

  const getIcon = (slug: string) => {
    return categoryIcons[slug] || "category";
  };

  const getCategoryLabel = (category: Category) => {
    if (locale !== "en") {
      return category.name;
    }

    return (
      EN_CATEGORY_SLUG_TRANSLATIONS[category.slug] ||
      EN_CATEGORY_NAME_TRANSLATIONS[category.name] ||
      category.name
    );
  };

  return (
    <div className="mb-6 sm:mb-8">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="material-symbols-outlined text-[18px] text-ai-primary">category</span>
        <span className="text-xs font-semibold text-ai-text-secondary uppercase tracking-[0.14em]">{t.categories}</span>
      </div>

      {/* Horizontal Scroll Container - mobile-optimized */}
      <div className="rounded-2xl border border-ai-surface-border/80 bg-ai-surface-card/30 p-2.5">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
        {/* All Categories Button */}
        <Link
          href={getCategoryLink("")}
            className={`group flex-shrink-0 snap-start flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-300 whitespace-nowrap ${selectedCategory === "" || !selectedCategory
              ? "bg-gradient-to-r from-ai-primary to-ai-primary-hover text-white shadow-md shadow-ai-primary/25 ring-1 ring-ai-primary/40"
              : "bg-ai-surface-dark/60 border border-ai-surface-border text-gray-300 hover:border-ai-primary/50 hover:text-ai-primary hover:bg-ai-surface-dark"
            }`}
        >
          <span className="material-symbols-outlined text-[16px]">apps</span>
          <span>{t.all}</span>
        </Link>

        {/* Category Buttons */}
        {categories.map((category) => (
          <Link
            key={category.id}
            href={getCategoryLink(category.slug)}
            className={`group flex-shrink-0 snap-start flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-300 whitespace-nowrap ${selectedCategory === category.slug
              ? "bg-gradient-to-r from-ai-primary to-ai-primary-hover text-white shadow-md shadow-ai-primary/25 ring-1 ring-ai-primary/40"
              : "bg-ai-surface-dark/60 border border-ai-surface-border text-gray-300 hover:border-ai-primary/50 hover:text-ai-primary hover:bg-ai-surface-dark"
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">{getIcon(category.slug)}</span>
            <span>{getCategoryLabel(category)}</span>
          </Link>
        ))}
        </div>
      </div>
    </div>
  );
}
