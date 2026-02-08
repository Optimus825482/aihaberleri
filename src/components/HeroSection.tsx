"use client";

import { useState, useEffect, useCallback } from "react";
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
  featuredArticles: FeaturedArticle[];
  locale?: "tr" | "en";
}

const texts = {
  tr: {
    featured: "Öne Çıkan",
    readMore: "Devamını Oku",
    save: "Kaydet",
    loading: "Yükleniyor...",
  },
  en: {
    featured: "Featured",
    readMore: "Read More",
    save: "Save",
    loading: "Loading...",
  },
};

const defaultImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDixixEkR1KuvGsPUfz3UGXoiCg4s23dbZw4FwSWDijoUyroJZZQJjgGgffm76qqx5j4sVkE574dKaX1Pw4SCbURfYpy_QQUdnR4L708kqoqHSSc0LSMJG7QAFLGcPWDZaCmBnW8w2Ih8YhklXKC53IJmJRhtu5Pt7_qUuAfh__AghN3fihJ8nm6jdHJfOPHnFWtNf_1Q_Z_I7IhzYEnf2Fg1W2sDezirOwy46NRyN3hOMP1wDlJqEjwImlERBDm5F83_bzBgM-g00";

const defaultArticle: FeaturedArticle = {
  id: "default",
  title: "Yapay Zeka Dünyasında Devrim: GPT-5 Beklentileri",
  slug: "",
  excerpt:
    "OpenAI'nin yeni modeli hakkında bilmeniz gereken her şey ve teknoloji dünyasına olası etkileri üzerine kapsamlı bir analiz.",
  imageUrl: defaultImage,
  category: { name: "OpenAI", slug: "openai" },
};

export function HeroSection({
  featuredArticles = [],
  locale = "tr",
}: HeroSectionProps) {
  const t = texts[locale];

  // Use provided articles or default article
  const articles =
    featuredArticles.length > 0 ? featuredArticles : [defaultArticle];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Auto-slide every 10 seconds (going backwards: newest to oldest)
  useEffect(() => {
    if (articles.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [articles.length, isPaused]);

  // Manual navigation
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev + 1) % articles.length);
  };

  const currentArticle = articles[currentIndex];

  const getArticleLink = () => {
    if (locale === "en" && currentArticle.slug) {
      return `/en/news/${currentArticle.slug}`;
    }
    return currentArticle.slug ? `/news/${currentArticle.slug}` : "#";
  };

  const getCategoryLink = () => {
    if (locale === "en") {
      return `/en/category/${currentArticle.category.slug}`;
    }
    return `/category/${currentArticle.category.slug}`;
  };

  return (
    <div
      className="group relative mb-8 sm:mb-10 lg:mb-12 min-h-[400px] overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl md:min-h-[500px] lg:min-h-[580px] border border-gray-800/50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      suppressHydrationWarning={true}
    >
      {/* Slider Container */}
      <div className="relative h-full">
        {articles.map((article, index) => (
          <div
            key={article.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentIndex
                ? "opacity-100 scale-100 z-10"
                : "opacity-0 scale-105 z-0"
            }`}
          >
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
                    className={`h-full w-full object-cover transition-transform duration-[3000ms] ease-out ${
                      index === currentIndex ? "scale-100" : "scale-110"
                    }`}
                  />
                ) : (
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 100vw"
                  />
                )
              ) : null}
              {/* Modern Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-ai-background-dark via-ai-background-dark/70 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-ai-background-dark/40 via-transparent to-transparent"></div>
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-start justify-end px-4 sm:px-6 md:px-10 lg:px-16 py-8 sm:py-12 md:py-16 lg:py-20 lg:min-h-[520px]">
              {/* Category Badge */}
              <Link
                href={getCategoryLink()}
                className="mb-3 sm:mb-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-ai-primary/20 to-ai-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md border border-ai-primary/30 shadow-lg shadow-ai-primary/20 transition-all duration-300 hover:bg-ai-primary/30 hover:shadow-ai-primary/30 hover:scale-105"
              >
                <span className="material-symbols-outlined text-[14px]">
                  auto_awesome
                </span>
                <span>{t.featured}</span>
              </Link>

              {/* Title */}
              <h1 className="mb-3 sm:mb-4 max-w-3xl text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white drop-shadow-2xl">
                {article.title}
              </h1>

              {/* Excerpt */}
              <p className="mb-6 sm:mb-8 max-w-2xl text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                {article.excerpt}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Link
                  href={getArticleLink()}
                  className="group/btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-ai-primary to-ai-primary-hover px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white shadow-xl shadow-ai-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-ai-primary/50 hover:scale-105 active:scale-95"
                >
                  <span>{t.readMore}</span>
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] transition-transform duration-300 group-hover/btn:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
                <button className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white border border-white/20 shadow-lg transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:scale-105 active:scale-95">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                    bookmark
                  </span>
                  <span className="hidden sm:inline">{t.save}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      {articles.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
          {articles.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-gradient-to-r from-ai-primary to-ai-primary-hover shadow-lg shadow-ai-primary/50"
                  : "w-2 bg-white/30 hover:bg-white/50 hover:w-3"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Navigation Arrows */}
      {articles.length > 1 && (
        <>
          <button
            onClick={goToNext}
            type="button"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 opacity-0 transition-all duration-300 hover:bg-black/60 hover:scale-110 group-hover:opacity-100 shadow-lg"
            aria-label="Previous slide"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
              chevron_left
            </span>
          </button>
          <button
            onClick={goToPrev}
            type="button"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 opacity-0 transition-all duration-300 hover:bg-black/60 hover:scale-110 group-hover:opacity-100 shadow-lg"
            aria-label="Next slide"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
              chevron_right
            </span>
          </button>
        </>
      )}

      {/* Slide Counter */}
      {articles.length > 1 && (
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-black/60 to-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 border border-white/10 shadow-xl">
          <span className="material-symbols-outlined text-ai-primary text-sm sm:text-base">
            photo_library
          </span>
          <span className="text-xs sm:text-sm font-semibold text-white">
            <span className="text-ai-primary">{currentIndex + 1}</span>
            <span className="mx-1 text-white/60">/</span>
            {articles.length}
          </span>
        </div>
      )}
    </div>
  );
}
