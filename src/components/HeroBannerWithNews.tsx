"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface NewsArticle {
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

interface HeroBannerWithNewsProps {
  articles: NewsArticle[];
  locale?: "tr" | "en";
}

const texts = {
  tr: {
    readMore: "Haberi Oku",
    latest: "Son Haberler",
  },
  en: {
    readMore: "Read Article",
    latest: "Latest News",
  },
};

// Client-only wrapper to prevent hydration mismatch
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

export function HeroBannerWithNews({
  articles,
  locale = "tr",
}: HeroBannerWithNewsProps) {
  if (articles.length === 0) {
    return <HeroBannerEmpty locale={locale} />;
  }

  return (
    <ClientOnly>
      <HeroBannerContent articles={articles} locale={locale} />
    </ClientOnly>
  );
}

function HeroBannerEmpty({ locale }: { locale: "tr" | "en" }) {
  const t = texts[locale];

  return (
    <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden">
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight drop-shadow-lg">
            {locale === "tr"
              ? "Yapay Zeka Dünyasından Son Haberler"
              : "Latest AI News"}
          </h1>
          <p className="text-base md:text-xl lg:text-2xl text-white/95 mb-6 md:mb-8 leading-relaxed drop-shadow-md">
            {locale === "tr"
              ? "En güncel AI haberleri yakında burada"
              : "Latest AI news coming soon"}
          </p>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-16 md:h-24 text-background"
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}

function HeroBannerContent({
  articles,
  locale,
}: {
  articles: NewsArticle[];
  locale: "tr" | "en";
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const t = texts[locale];

  // Auto-slide every 10 seconds
  useEffect(() => {
    if (articles.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 10000); // 10 saniye

    return () => clearInterval(interval);
  }, [articles.length, isPaused]);

  const currentArticle = articles[currentIndex];

  const getCategoryLink = () => {
    if (locale === "en") {
      return `/en/category/${currentArticle.category.slug}`;
    }
    return `/category/${currentArticle.category.slug}`;
  };

  const getArticleLink = () => {
    if (locale === "en") {
      return `/en/news/${currentArticle.slug}`;
    }
    return `/news/${currentArticle.slug}`;
  };

  return (
    <section
      className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images with Smooth Transition */}
      <div className="absolute inset-0">
        {articles.map((article, index) => (
          <div
            key={article.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-30" : "opacity-0"
            }`}
          >
            {article.imageUrl && (
              <>
                {article.imageUrl.includes("pollinations.ai") ||
                article.imageUrl.includes("r2.dev") ||
                article.imageUrl.includes("images.aihaberleri.org") ||
                article.imageUrl.includes("googleusercontent.com") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    sizes="100vw"
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Category Badge */}
          <div className="mb-4 flex items-center gap-3">
            <Link
              href={getCategoryLink()}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold transition-all hover:bg-white/30 hover:scale-105 border border-white/30"
            >
              <span className="material-symbols-outlined text-[16px]">
                category
              </span>
              {currentArticle.category.name}
            </Link>
            <span className="text-white/80 text-sm font-medium">
              {t.latest}
            </span>
          </div>

          {/* Title with Fade Animation */}
          <h1
            key={`title-${currentArticle.id}`}
            className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight drop-shadow-lg animate-fade-in"
          >
            {currentArticle.title}
          </h1>

          {/* Excerpt */}
          <p
            key={`excerpt-${currentArticle.id}`}
            className="text-base md:text-xl lg:text-2xl text-white/95 mb-6 md:mb-8 leading-relaxed drop-shadow-md line-clamp-2 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            {currentArticle.excerpt}
          </p>

          {/* CTA Button */}
          <div
            key={`cta-${currentArticle.id}`}
            className="animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            <Link
              href={getArticleLink()}
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg hover:bg-white/90 transition-all hover:scale-105 shadow-2xl"
            >
              {t.readMore}
              <span className="material-symbols-outlined text-[20px]">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Indicators */}
      {articles.length > 1 && (
        <div className="absolute bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {articles.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 ${
                index === currentIndex
                  ? "w-12 h-2 bg-white"
                  : "w-2 h-2 bg-white/50 hover:bg-white/70"
              } rounded-full`}
              aria-label={`${locale === "tr" ? "Haber" : "News"} ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {articles.length > 1 && (
        <div className="absolute top-6 right-6 z-20 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
          <span className="text-sm font-semibold">
            <span className="text-white">{currentIndex + 1}</span>
            <span className="text-white/60 mx-1">/</span>
            <span className="text-white/80">{articles.length}</span>
          </span>
        </div>
      )}

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-16 md:h-24 text-background"
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
