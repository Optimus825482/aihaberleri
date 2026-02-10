"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

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
  if (articles.length === 0) {
    return <HeroCarouselEmpty locale={locale} />;
  }

  return (
    <ClientOnly>
      <HeroCarouselContent
        articles={articles}
        autoPlayInterval={autoPlayInterval}
        locale={locale}
      />
    </ClientOnly>
  );
}

function HeroCarouselEmpty({ locale }: { locale: string }) {
  const labels = {
    tr: {
      emptyTitle: "Yapay Zeka Dünyasından Son Haberler",
      emptyDesc: "En güncel AI haberleri yakında burada",
    },
    en: {
      emptyTitle: "Latest AI News",
      emptyDesc: "Latest AI news coming soon",
    },
  };

  const t = labels[locale as keyof typeof labels] || labels.tr;

  return (
    <section className="relative bg-gradient-to-br from-ai-primary via-ai-primary-hover to-ai-surface-dark text-white overflow-hidden h-[500px] md:h-[600px]">
      <div className="container mx-auto px-4 h-full flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-[64px] text-white/50 mb-4 block">
            newspaper
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {t.emptyTitle}
          </h1>
          <p className="text-xl text-white/90">{t.emptyDesc}</p>
        </div>
      </div>
    </section>
  );
}

function HeroCarouselContent({
  articles,
  autoPlayInterval,
  locale,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState<"left" | "right">("right");

  // Touch event states for mobile swipe support
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Ref for auto-resume timeout cleanup
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

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

  // Cleanup resume timer on unmount
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const pauseAutoPlay = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setIsAutoPlaying(false);
    resumeTimerRef.current = setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? "right" : "left");
    setCurrentIndex(index);
    pauseAutoPlay();
  };

  const goToPrevious = () => {
    setDirection("left");
    setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
    pauseAutoPlay();
  };

  const goToNext = () => {
    setDirection("right");
    setCurrentIndex((prev) => (prev + 1) % articles.length);
    pauseAutoPlay();
  };

  // Touch event handlers for mobile swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const swipeDistance = touchStart - touchEnd;
    const minSwipeDistance = 50; // Minimum 50px swipe to trigger

    if (Math.abs(swipeDistance) < minSwipeDistance) return;

    if (swipeDistance > 0) {
      // Swipe left → next slide
      goToNext();
    } else {
      // Swipe right → previous slide
      goToPrevious();
    }
  };

  const currentArticle = articles[currentIndex];

  // Performans optimizasyonu: Sadece görünür ve komşu slide'ları render et
  // Bu, DOM'da 10 yerine sadece 3 image olmasını sağlar
  const getVisibleSlides = () => {
    const prevIndex = (currentIndex - 1 + articles.length) % articles.length;
    const nextIndex = (currentIndex + 1) % articles.length;
    return new Set([prevIndex, currentIndex, nextIndex]);
  };

  const visibleSlides = getVisibleSlides();

  // Helper for localized links
  const getLink = (path: string) => (locale === "en" ? `/en${path}` : path);
  // Category link is slightly different structure typically (/category/slug vs /en/category/slug)
  const getCategoryLink = (slug: string) =>
    locale === "en" ? `/en/category/${slug}` : `/category/${slug}`;
  const getArticleLink = (slug: string) =>
    locale === "en" ? `/en/news/${slug}` : `/news/${slug}`;

  return (
    <section
      className="relative bg-ai-background-dark text-white overflow-hidden h-[500px] md:h-[600px] group"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Images with Smooth Transition - LAZY RENDERING */}
      {/* Performans: Sadece current, prev, next slide'lar render ediliyor */}
      {articles.map((article, index) => {
        // Sadece görünür slide'ları render et
        if (!visibleSlides.has(index)) return null;

        return (
          <div
            key={article.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentIndex
                ? "opacity-100 scale-100"
                : "opacity-0 scale-105"
            }`}
            style={{
              // GPU acceleration için transform kullan
              transform:
                index === currentIndex
                  ? "translateZ(0)"
                  : "translateZ(0) scale(1.05)",
              willChange: index === currentIndex ? "opacity" : "auto",
            }}
          >
            {article.imageUrl &&
              (article.imageUrl.includes("pollinations.ai") ||
              article.imageUrl.includes("r2.dev") ||
              article.imageUrl.includes("images.aihaberleri.org") ? (
                // Use native img for Pollinations and R2 to avoid Next.js optimization issues
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={index === currentIndex ? "eager" : "lazy"}
                  style={{
                    // GPU acceleration
                    transform: "translateZ(0)",
                    willChange: "auto",
                  }}
                />
              ) : (
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority={index === currentIndex}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 100vw"
                  quality={85}
                  style={{
                    // GPU acceleration
                    transform: "translateZ(0)",
                  }}
                />
              ))}
            {/* Dark Overlay with Gradient - GPU accelerated */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-ai-background-dark via-ai-background-dark/70 to-ai-background-dark/30"
              style={{ transform: "translateZ(0)" }}
            />
          </div>
        );
      })}

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
                className="inline-flex items-center gap-2 px-4 py-2 bg-ai-primary hover:bg-ai-primary-hover rounded-full text-sm font-semibold transition-all hover:scale-105 shadow-lg"
              >
                <span className="material-symbols-outlined text-[16px]">
                  category
                </span>
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
              className="text-base md:text-xl text-ai-text-secondary mb-6 line-clamp-2 drop-shadow-lg animate-slide-up-fade"
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
                className="inline-flex items-center gap-2 bg-ai-primary hover:bg-ai-primary-hover text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all hover:scale-105 hover:shadow-2xl shadow-xl"
              >
                {t.readMore}
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
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
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-ai-surface-card/70 hover:bg-ai-surface-hover text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm border border-ai-surface-border"
            aria-label={t.prev}
          >
            <span className="material-symbols-outlined text-[24px]">
              chevron_left
            </span>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-ai-surface-card/70 hover:bg-ai-surface-hover text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm border border-ai-surface-border"
            aria-label={t.next}
          >
            <span className="material-symbols-outlined text-[24px]">
              chevron_right
            </span>
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
              className={`transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-ai-primary scale-110"
                  : "w-2 bg-white/50 hover:bg-white/70 hover:scale-110"
              } h-2 rounded-full`}
              aria-label={t.goTo(index)}
            />
          ))}
        </div>
      )}

      {/* Animated Progress Bar */}
      {articles.length > 1 && isAutoPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-ai-surface-border z-20 overflow-hidden">
          <div
            key={currentIndex}
            className="h-full bg-gradient-to-r from-ai-primary via-ai-primary-hover to-ai-primary animate-progress"
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
