/**
 * Image error recovery utilities
 * Handles 429/403 errors from external image CDNs (Pollinations, R2, Cloudflare)
 */

"use client";

import { useState, useCallback } from "react";

export type ImageErrorReason = "loading" | "network" | null;

interface ImageState {
  src: string;
  error: ImageErrorReason;
}

/**
 * Build a Cloudflare Image Resizing URL for images hosted on images.aihaberleri.org
 */
export function getCfImageUrl(src: string, width: number): string {
  if (!src.includes("images.aihaberleri.org")) return src;
  try {
    const url = new URL(src);
    return `https://${url.hostname}/cdn-cgi/image/width=${width},quality=82,format=webp${url.pathname}`;
  } catch {
    return src;
  }
}

/**
 * Generate a fallback image URL using a deterministic seed
 * Uses picsum.photos for truly broken images
 */
export function getFallbackImageUrl(
  originalSrc: string,
  seed?: string,
): string {
  // Extract a stable seed from the original URL
  const urlSeed =
    seed ||
    originalSrc
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "")
      ?.slice(0, 12) ||
    "ai-news";

  return `https://picsum.photos/seed/${encodeURIComponent(urlSeed)}/1200/630`;
}

/**
 * Hook for managing image error state with automatic fallback
 * Returns current src, error state, and a handler to trigger fallback
 */
export function useImageErrorFallback(initialSrc: string) {
  const [state, setState] = useState<ImageState>({
    src: initialSrc,
    error: null,
  });

  const handleError = useCallback(() => {
    setState((prev) => {
      // Already on fallback - don't loop
      if (prev.src.includes("picsum.photos")) return prev;

      const fallback = getFallbackImageUrl(prev.src);
      console.warn(
        `[ImageFallback] Primary failed, switching to fallback: ${prev.src.slice(0, 60)} → ${fallback.slice(0, 60)}`,
      );

      return { src: fallback, error: "network" };
    });
  }, []);

  const reset = useCallback((newSrc: string) => {
    setState({ src: newSrc, error: null });
  }, []);

  return { src: state.src, error: state.error, handleError, reset };
}

/**
 * Check if a URL is a known external CDN that can return 429/403
 */
export function isExternalCdnUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("pollinations.ai") ||
    url.includes("r2.dev") ||
    url.includes("cloudflarestorage.com") ||
    url.includes("images.aihaberleri.org") ||
    url.includes("picsum.photos") ||
    url.includes("unsplash.com")
  );
}