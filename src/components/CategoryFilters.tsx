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
    <div className="mb-8 flex flex-wrap gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {/* All Categories Button */}
      <Link
        href={getCategoryLink("")}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg shadow-ai-primary/25 transition-colors ${
          selectedCategory === "" || !selectedCategory
            ? "bg-ai-primary text-white"
            : "bg-white dark:bg-ai-surface-card border border-gray-200 dark:border-ai-surface-border text-slate-700 dark:text-gray-300 hover:border-ai-primary hover:text-ai-primary dark:hover:border-ai-primary"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">apps</span>
        {t.all}
      </Link>

      {/* Category Buttons */}
      {categories.map((category) => (
        <Link
          key={category.id}
          href={getCategoryLink(category.slug)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selectedCategory === category.slug
              ? "bg-ai-primary text-white"
              : "bg-white dark:bg-ai-surface-card border border-gray-200 dark:border-ai-surface-border text-slate-700 dark:text-gray-300 hover:border-ai-primary hover:text-ai-primary dark:hover:border-ai-primary dark:hover:text-ai-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{getIcon(category.slug)}</span>
          {category.name}
        </Link>
      ))}
    </div>
  );
}
