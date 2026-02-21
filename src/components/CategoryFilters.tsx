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
            <span>{category.name}</span>
          </Link>
        ))}
        </div>
      </div>
    </div>
  );
}
