"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSwitcherProps {
  currentLocale?: "tr" | "en";
  variant?: "dropdown" | "inline";
}

const languages = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

/**
 * Get the alternate language URL for the current page
 */
function getAlternateUrl(pathname: string, targetLocale: "tr" | "en"): string {
  // If current path starts with /en/
  if (pathname.startsWith("/en/")) {
    if (targetLocale === "tr") {
      // Convert /en/news/slug to /news/slug (Turkish)
      const turkishPath = pathname.replace("/en/", "/");
      // Also convert route names
      return turkishPath
        .replace("/news/", "/haber/")
        .replace("/category/", "/kategori/")
        .replace("/about", "/hakkimizda")
        .replace("/contact", "/iletisim");
    }
    return pathname; // Already English
  }

  // If current path is /en
  if (pathname === "/en") {
    return targetLocale === "tr" ? "/" : "/en";
  }

  // Current path is Turkish (no /en prefix)
  if (targetLocale === "en") {
    // Convert Turkish routes to English
    let englishPath = pathname
      .replace("/haber/", "/news/")
      .replace("/kategori/", "/category/")
      .replace("/hakkimizda", "/about")
      .replace("/iletisim", "/contact");

    // Add /en prefix
    return `/en${englishPath === "/" ? "" : englishPath}`;
  }

  return pathname; // Already Turkish
}

export function LanguageSwitcher({
  currentLocale = "tr",
  variant = "dropdown",
}: LanguageSwitcherProps) {
  const pathname = usePathname();

  // Detect current locale from pathname
  const detectedLocale = pathname.startsWith("/en") ? "en" : "tr";
  const activeLocale = currentLocale || detectedLocale;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm">
        {languages.map((lang, index) => (
          <span key={lang.code} className="flex items-center">
            {index > 0 && <span className="mx-2 text-gray-400">|</span>}
            <Link
              href={getAlternateUrl(pathname, lang.code)}
              className={`flex items-center gap-1 transition-colors ${
                activeLocale === lang.code
                  ? "font-semibold text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={lang.label}
            >
              <span>{lang.flag}</span>
              <span className="hidden sm:inline">
                {lang.code.toUpperCase()}
              </span>
            </Link>
          </span>
        ))}
      </div>
    );
  }

  // Dropdown variant
  const currentLang =
    languages.find((l) => l.code === activeLocale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLang.flag} {currentLang.code.toUpperCase()}
          </span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem key={lang.code} asChild>
            <Link
              href={getAlternateUrl(pathname, lang.code)}
              className={`flex items-center gap-2 w-full ${
                activeLocale === lang.code ? "font-semibold" : ""
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {activeLocale === lang.code && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
