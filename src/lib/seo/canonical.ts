/**
 * Canonical URL Utilities
 * Duplicate content prevention
 */

/**
 * Canonical URL oluştur
 * Query parameters ve trailing slash'leri temizler
 */
export function generateCanonicalUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Leading slash ekle
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Trailing slash kaldır (homepage hariç)
  const normalizedPath =
    cleanPath === "/" ? cleanPath : cleanPath.replace(/\/$/, "");

  return `${baseUrl}${normalizedPath}`;
}

/**
 * Article için canonical URL
 */
export function getArticleCanonicalUrl(slug: string): string {
  return generateCanonicalUrl(`/news/${slug}`);
}

/**
 * Category için canonical URL
 */
export function getCategoryCanonicalUrl(slug: string): string {
  return generateCanonicalUrl(`/category/${slug}`);
}

/**
 * Pagination için canonical URL
 * Sayfalama varsa, ilk sayfaya canonical ekle
 */
export function getPaginatedCanonicalUrl(
  basePath: string,
  page?: number,
): string {
  // İlk sayfa için base path kullan
  if (!page || page === 1) {
    return generateCanonicalUrl(basePath);
  }

  // Diğer sayfalar için page parametresi ekle
  return generateCanonicalUrl(`${basePath}?page=${page}`);
}

/**
 * Prev/Next link tags için URL'ler
 * Pagination için kullanılır
 */
export function getPaginationLinks(
  basePath: string,
  currentPage: number,
  totalPages: number,
): {
  prev?: string;
  next?: string;
} {
  const links: { prev?: string; next?: string } = {};

  if (currentPage > 1) {
    links.prev =
      currentPage === 2
        ? generateCanonicalUrl(basePath)
        : generateCanonicalUrl(`${basePath}?page=${currentPage - 1}`);
  }

  if (currentPage < totalPages) {
    links.next = generateCanonicalUrl(`${basePath}?page=${currentPage + 1}`);
  }

  return links;
}
