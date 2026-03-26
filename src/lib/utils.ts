import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";

// Configure slugify for Turkish locale
slugify.extend({
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ş: "s",
  Ş: "s",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input);
  return date.toLocaleDateString("tr-TR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function calculateReadingTime(text: string): string {
  const minutes = calculateReadingMinutes(text);
  return `${minutes} dk okuma süresi`;
}

export function calculateReadingMinutes(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function formatRelativeTime(
  date: string | Date,
  locale: "tr" | "en" = "tr",
): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  const labels =
    locale === "en"
      ? {
          justNow: "Just now",
          minute: (n: number) => `${n} minute${n > 1 ? "s" : ""} ago`,
          hour: (n: number) => `${n} hour${n > 1 ? "s" : ""} ago`,
          day: (n: number) => `${n} day${n > 1 ? "s" : ""} ago`,
          month: (n: number) => `${n} month${n > 1 ? "s" : ""} ago`,
          year: (n: number) => `${n} year${n > 1 ? "s" : ""} ago`,
        }
      : {
          justNow: "Az önce",
          minute: (n: number) => `${n} dakika önce`,
          hour: (n: number) => `${n} saat önce`,
          day: (n: number) => `${n} gün önce`,
          month: (n: number) => `${n} ay önce`,
          year: (n: number) => `${n} yıl önce`,
        };

  if (diffInSeconds < 60) return labels.justNow;
  if (diffInSeconds < 3600)
    return labels.minute(Math.floor(diffInSeconds / 60));
  if (diffInSeconds < 86400)
    return labels.hour(Math.floor(diffInSeconds / 3600));
  if (diffInSeconds < 2592000)
    return labels.day(Math.floor(diffInSeconds / 86400));
  if (diffInSeconds < 31536000)
    return labels.month(Math.floor(diffInSeconds / 2592000));
  return labels.year(Math.floor(diffInSeconds / 31536000));
}
export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, locale: "tr" });
}
