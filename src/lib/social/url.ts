type SocialLocale = "tr" | "en";

function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  return siteUrl.replace(/\/+$/, "");
}

export function buildSocialArticleUrl(
  slugOrPath: string,
  locale: SocialLocale = "tr",
): string {
  const siteUrl = getSiteUrl();
  const raw = (slugOrPath || "").trim();

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const path = raw.replace(/^\/+/, "");

  if (path.startsWith("news/") || path.startsWith("en/news/")) {
    return `${siteUrl}/${path}`;
  }

  if (path.startsWith("en/")) {
    return `${siteUrl}/${path}`;
  }

  if (locale === "en") {
    return `${siteUrl}/en/news/${path}`;
  }

  return `${siteUrl}/news/${path}`;
}
