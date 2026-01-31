"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Article {
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

interface HeroCarouselProps {
  articles: Article[];
  autoPlayInterval?: number;
  locale?: string;
}

export function HeroCarousel({
  articles,
  autoPlayInterval = 6000,
  locale = "tr",
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const labels = {
    tr: {
      readMore: "Haberi Oku",
      emptyTitle: "Yapay Zeka Dünyasından Son Haberler",
      emptyDesc: "En güncel AI haberleri yakında burada",
      prev: "Önceki haber",
      next: "Sonraki haber",
      goTo: (i: number) => `${i + 1}. habere git`,
    },
    en: {
      readMore: "Read News",
      emptyTitle: "Latest AI News",
      emptyDesc: "Latest AI news coming soon",
      prev: "Previous news",
      next: "Next news",
      goTo: (i: number) => `Go to news ${i + 1}`,
    },
  };

  const t = labels[locale as keyof typeof labels] || labels.tr;

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || articles.length <= 1) return;

    const interval = setInterval(() => {
      setDirection("right");
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, articles.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? "right" : "left");
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const goToPrevious = () => {
    setDirection("left");
    setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const goToNext = () => {
    setDirection("right");
    setCurrentIndex((prev) => (prev + 1) % articles.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  if (articles.length === 0) {
    return (
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden h-[500px] md:h-[600px]">
        <div className="container mx-auto px-4 h-full flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {t.emptyTitle}
            </h1>
            <p className="text-xl text-white/90">{t.emptyDesc}</p>
          </div>
        </div>
      </section>
    );
  }

  const currentArticle = articles[currentIndex];

  // Helper for localized links
  const getLink = (path: string) => (locale === "en" ? `/en${path}` : path);
  // Category link is slightly different structure typically (/category/slug vs /en/category/slug)
  const getCategoryLink = (slug: string) =>
    locale === "en" ? `/en/category/${slug}` : `/category/${slug}`;
  const getArticleLink = (slug: string) =>
    locale === "en" ? `/en/news/${slug}` : `/news/${slug}`;

  return (
    <section className="relative bg-black text-white overflow-hidden h-[500px] md:h-[600px] group">
      {/* Background Images with Smooth Transition */}
      {articles.map((article, index) => (
        <div
          key={article.id}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentIndex
            ? "opacity-100 scale-100"
            : "opacity-0 scale-105"
            }`}
        >
          {article.imageUrl && (
            article.imageUrl.includes('pollinations.ai') ? (
              // Use native img for Pollinations to avoid Next.js optimization issues
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.imageUrl}
                alt={article.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
            ) : (
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 100vw"
                quality={85}
              />
            )
          )}
          {/* Dark Overlay with Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        </div>
      ))}

      {/* Content with Slide Animation */}
      <div className="container mx-auto px-4 h-full relative z-10">
        <div className="h-full flex flex-col justify-end pb-12 md:pb-20">
          <div className="max-w-4xl">
            {/* Category Badge with Fade */}
            <div
              key={`category-${currentArticle.id}`}
              className={`animate-slide-up-fade mb-4`}
              style={{ animationDelay: "0.1s" }}
            >
              <Link
                href={getCategoryLink(currentArticle.category.slug)}
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-sm font-semibold transition-all hover:scale-105 shadow-lg"
              >
                {currentArticle.category.name}
              </Link>
            </div>

            {/* Title with Slide Animation */}
            <h1
              key={`title-${currentArticle.id}`}
              className={`text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight drop-shadow-2xl animate-slide-${direction}`}
            >
              {currentArticle.title}
            </h1>

            {/* Excerpt with Fade */}
            <p
              key={`excerpt-${currentArticle.id}`}
              className="text-base md:text-xl text-white/90 mb-6 line-clamp-2 drop-shadow-lg animate-slide-up-fade"
              style={{ animationDelay: "0.3s" }}
            >
              {currentArticle.excerpt}
            </p>

            {/* CTA Button with Bounce */}
            <div
              key={`cta-${currentArticle.id}`}
              className="animate-slide-up-fade"
              style={{ animationDelay: "0.4s" }}
            >
              <Link
                href={getArticleLink(currentArticle.slug)}
                className="inline-flex items-center gap-2 bg-white text-black px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg hover:bg-white/90 transition-all hover:scale-105 hover:shadow-2xl shadow-xl"
              >
                {t.readMore}
                <svg
                  className="w-5 h-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows with Hover Effect */}
      {articles.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm"
            aria-label="Önceki haber"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm"
            aria-label="Sonraki haber"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Navigation with Scale Animation */}
      {articles.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {articles.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${index === currentIndex
                ? "w-8 bg-white scale-110"
                : "w-2 bg-white/50 hover:bg-white/70 hover:scale-110"
                } h-2 rounded-full`}
              aria-label={`${index + 1}. habere git`}
            />
          ))}
        </div>
      )}

      {/* Animated Progress Bar */}
      {articles.length > 1 && isAutoPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20 overflow-hidden">
          <div
            key={currentIndex}
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-progress"
            style={{
              animationDuration: `${autoPlayInterval}ms`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        @keyframes slide-up-fade {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-right {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-left {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-progress {
          animation: progress linear;
        }

        .animate-slide-up-fade {
          animation: slide-up-fade 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-right {
          animation: slide-right 0.8s ease-out;
        }

        .animate-slide-left {
          animation: slide-left 0.8s ease-out;
        }
      `}</style>
    </section>
  );
}
