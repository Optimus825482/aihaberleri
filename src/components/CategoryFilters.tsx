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
  },
  en: {
    all: "All",
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
    <div className="mb-6 sm:mb-8 flex flex-wrap gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {/* All Categories Button */}
      <Link
        href={getCategoryLink("")}
        className={`group flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 ${
          selectedCategory === "" || !selectedCategory
            ? "bg-gradient-to-r from-ai-primary to-ai-primary-hover text-white shadow-lg shadow-ai-primary/30 scale-105"
            : "bg-white dark:bg-ai-surface-card border-2 border-gray-200 dark:border-ai-surface-border text-slate-700 dark:text-gray-300 hover:border-ai-primary hover:text-ai-primary dark:hover:border-ai-primary dark:hover:text-ai-primary hover:shadow-md"
        }`}
      >
        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">apps</span>
        <span>{t.all}</span>
      </Link>

      {/* Category Buttons */}
      {categories.map((category) => (
        <Link
          key={category.id}
          href={getCategoryLink(category.slug)}
          className={`group flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 ${
            selectedCategory === category.slug
              ? "bg-gradient-to-r from-ai-primary to-ai-primary-hover text-white shadow-lg shadow-ai-primary/30 scale-105"
              : "bg-white dark:bg-ai-surface-card border-2 border-gray-200 dark:border-ai-surface-border text-slate-700 dark:text-gray-300 hover:border-ai-primary hover:text-ai-primary dark:hover:border-ai-primary dark:hover:text-ai-primary hover:shadow-md"
          }`}
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{getIcon(category.slug)}</span>
          <span>{category.name}</span>
        </Link>
      ))}
    </div>
  );
}
