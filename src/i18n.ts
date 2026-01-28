import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// Supported locales
export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];

// Default locale (Türkçe)
export const defaultLocale: Locale = "tr";

// Locale detection strategy
export const localePrefix = "as-needed"; // Only add prefix for non-default locale

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale is valid
  const validLocale = locale as Locale;
  if (!locales.includes(validLocale)) {
    notFound();
  }

  return {
    locale: validLocale,
    messages: (await import(`./messages/${validLocale}.json`)).default,
  };
});
