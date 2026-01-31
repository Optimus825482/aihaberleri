import Image from "next/image";

interface CategoryHeroProps {
  title: string;
  description?: string;
  imageUrl?: string;
  articleCount?: number;
}

export function CategoryHero({
  title,
  description,
  imageUrl,
  articleCount,
}: CategoryHeroProps) {
  return (
    <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/logos/banners/banner-1.png')] bg-cover bg-center mix-blend-overlay" />
      </div>

      {/* Category Image (if provided) */}
      {imageUrl && (
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:block">
          <div className="relative h-full opacity-20">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover object-center"
              priority
              unoptimized={imageUrl.includes('pollinations.ai')}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
          {description && (
            <p className="text-lg md:text-xl text-white/90 mb-6">
              {description}
            </p>
          )}
          {articleCount !== undefined && (
            <div className="flex items-center gap-2 text-white/80">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm font-medium">
                {articleCount} haber bulundu
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/20 to-transparent" />
    </section>
  );
}
