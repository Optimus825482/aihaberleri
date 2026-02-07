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
    <section className="relative bg-ai-surface-dark py-16 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-ai-primary/20 via-transparent to-ai-primary/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-ai-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-ai-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Category Image (if provided) */}
      {imageUrl && (
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:block">
          <div className="relative h-full opacity-20">
            {imageUrl.includes('pollinations.ai') || imageUrl.includes('r2.dev') || imageUrl.includes('images.aihaberleri.org') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover object-center"
                loading="eager"
              />
            ) : (
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover object-center"
                priority
              />
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">{title}</h1>
          {description && (
            <p className="text-lg md:text-xl text-ai-text-secondary mb-6">
              {description}
            </p>
          )}
          {articleCount !== undefined && (
            <div className="flex items-center gap-2 text-ai-text-muted">
              <span className="material-symbols-outlined text-[20px]">description</span>
              <span className="text-sm font-medium">
                {articleCount} haber bulundu
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-ai-background-dark to-transparent" />
    </section>
  );
}
