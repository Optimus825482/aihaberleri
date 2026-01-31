/**
 * ResponsiveImage Component
 * Automatically serves optimal image size based on viewport
 * Uses <picture> element with srcSet for responsive loading
 */

"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

export interface ResponsiveImageProps {
    src: string; // Large image URL (default)
    srcMedium?: string; // Medium size (800px)
    srcSmall?: string; // Small size (400px)
    srcThumb?: string; // Thumbnail (200px)
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    className?: string;
    fill?: boolean;
    sizes?: string; // Custom sizes attribute for Next.js Image
}

export function ResponsiveImage({
    src,
    srcMedium,
    srcSmall,
    srcThumb,
    alt,
    width = 1200,
    height = 630,
    priority = false,
    className = "",
    fill = false,
    sizes,
}: ResponsiveImageProps) {
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    // If all sizes are the same (fallback scenario), use simple Image
    const hasDifferentSizes =
        srcMedium !== src || srcSmall !== src || srcThumb !== src;

    // Error state UI
    if (error) {
        return (
            <div
                className={`flex items-center justify-center bg-muted ${className}`}
                style={
                    fill
                        ? undefined
                        : { width: width || "100%", height: height || "auto" }
                }
            >
                <div className="text-center text-muted-foreground">
                    <ImageOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Görsel yüklenemedi</p>
                </div>
            </div>
        );
    }

    // If no different sizes, use standard Next.js Image
    if (!hasDifferentSizes) {
        return (
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                priority={priority}
                loading={priority ? undefined : "lazy"}
                className={`${className} ${loading ? "blur-sm" : "blur-0"} transition-all duration-300`}
                onLoad={() => setLoading(false)}
                onError={() => setError(true)}
                fill={fill}
                sizes={sizes}
                unoptimized={src.includes('pollinations.ai')}
            />
        );
    }

    // Responsive image with multiple sources
    return (
        <picture>
            {/* Mobile: Use thumb (200px) */}
            {srcThumb && srcThumb !== src && (
                <source srcSet={srcThumb} media="(max-width: 640px)" />
            )}

            {/* Tablet portrait: Use small (400px) */}
            {srcSmall && srcSmall !== src && (
                <source srcSet={srcSmall} media="(max-width: 768px)" />
            )}

            {/* Tablet landscape: Use medium (800px) */}
            {srcMedium && srcMedium !== src && (
                <source srcSet={srcMedium} media="(max-width: 1024px)" />
            )}

            {/* Desktop: Use large (1200px) - fallback */}
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                priority={priority}
                loading={priority ? undefined : "lazy"}
                className={`${className} ${loading ? "blur-sm" : "blur-0"} transition-all duration-300`}
                onLoad={() => setLoading(false)}
                onError={() => setError(true)}
                fill={fill}
                sizes={
                    sizes ||
                    "(max-width: 640px) 200px, (max-width: 768px) 400px, (max-width: 1024px) 800px, 1200px"
                }
                unoptimized={src.includes('pollinations.ai')}
            />
        </picture>
    );
}

/**
 * Simple wrapper for article featured images
 * Pre-configured aspect ratio and styling
 */
export function ArticleImage({
    src,
    srcMedium,
    srcSmall,
    srcThumb,
    alt,
    priority = false,
}: {
    src: string;
    srcMedium?: string;
    srcSmall?: string;
    srcThumb?: string;
    alt: string;
    priority?: boolean;
}) {
    return (
        <div className="relative w-full aspect-video overflow-hidden rounded-lg">
            <ResponsiveImage
                src={src}
                srcMedium={srcMedium}
                srcSmall={srcSmall}
                srcThumb={srcThumb}
                alt={alt}
                fill
                priority={priority}
                className="object-cover"
            />
        </div>
    );
}

/**
 * Thumbnail variant for article cards
 */
export function ArticleThumbnail({
    src,
    srcThumb,
    alt,
}: {
    src: string;
    srcThumb?: string;
    alt: string;
}) {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted">
                <ImageOff className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
        );
    }

    return (
        <Image
            src={srcThumb || src}
            alt={alt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 200px, 300px"
            onError={() => setError(true)}
            unoptimized={(srcThumb || src).includes('pollinations.ai')}
        />
    );
}

export default ResponsiveImage;
