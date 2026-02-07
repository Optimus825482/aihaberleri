import Link from "next/link";
import Image from "next/image";

interface FeaturedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string | null;
  category: {
    name: string;
    slug: string;
  };
}

interface HeroSectionProps {
  featuredArticle: FeaturedArticle | null;
  locale?: "tr" | "en";
}

const texts = {
  tr: {
    featured: "Öne Çıkan",
    readMore: "Devamını Oku",
    save: "Kaydet",
  },
  en: {
    featured: "Featured",
    readMore: "Read More",
    save: "Save",
  },
};

const defaultImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuDixixEkR1KuvGsPUfz3UGXoiCg4s23dbZw4FwSWDijoUyroJZZQJjgGgffm76qqx5j4sVkE574dKaX1Pw4SCbURfYpy_QQUdnR4L708kqoqHSSc0LSMJG7QAFLGcPWDZaCmBnW8w2Ih8YhklXKC53IJmJRhtu5Pt7_qUuAfh__AghN3fihJ8nm6jdHJfOPHnFWtNf_1Q_Z_I7IhzYEnf2Fg1W2sDezirOwy46NRyN3hOMP1wDlJqEjwImlERBDm5F83_bzBgM-g00";

export function HeroSection({ featuredArticle, locale = "tr" }: HeroSectionProps) {
  const t = texts[locale];
  const article = featuredArticle || {
    id: "default",
    title: "Yapay Zeka Dünyasında Devrim: GPT-5 Beklentileri",
    slug: "",
    excerpt: "OpenAI'nin yeni modeli hakkında bilmeniz gereken her şey ve teknoloji dünyasına olası etkileri üzerine kapsamlı bir analiz.",
    imageUrl: defaultImage,
    category: { name: "OpenAI", slug: "openai" },
  };

  const getArticleLink = () => {
    if (locale === "en" && article.slug) {
      return `/en/news/${article.slug}`;
    }
    return article.slug ? `/news/${article.slug}` : "#";
  };

  const getCategoryLink = () => {
    if (locale === "en") {
      return `/en/category/${article.category.slug}`;
    }
    return `/category/${article.category.slug}`;
  };

  return (
    <div className="group relative mb-12 overflow-hidden rounded-2xl bg-gray-900 shadow-xl">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {article.imageUrl ? (
          article.imageUrl.includes("pollinations.ai") ||
          article.imageUrl.includes("r2.dev") ||
          article.imageUrl.includes("images.aihaberleri.org") ||
          article.imageUrl.includes("googleusercontent.com") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.imageUrl}
              alt={article.title}
              className="h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 100vw"
            />
          )
        ) : null}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ai-background-dark via-ai-background-dark/60 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-start justify-end px-6 py-12 md:px-12 md:py-20 lg:min-h-[500px]">
        {/* Category Badge */}
        <Link
          href={getCategoryLink()}
          className="mb-4 inline-flex items-center rounded-full bg-ai-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ai-primary backdrop-blur-sm border border-ai-primary/30 transition-colors hover:bg-ai-primary/30"
        >
          {t.featured}
        </Link>

        {/* Title */}
        <h1 className="mb-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
          {article.title}
        </h1>

        {/* Excerpt */}
        <p className="mb-8 max-w-2xl text-lg text-gray-300 md:text-xl line-clamp-3">
          {article.excerpt}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4">
          <Link
            href={getArticleLink()}
            className="flex items-center gap-2 rounded-lg bg-ai-primary px-6 py-3 text-base font-bold text-white transition-transform hover:scale-105 hover:bg-ai-primary/90"
          >
            <span>{t.readMore}</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <button className="flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
            <span className="material-symbols-outlined text-[20px]">bookmark</span>
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
