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

// SVG Flag Components
const TurkishFlag = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className={className}>
    <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#c8102e"></rect>
    <path d="M27,4H5c-2.209,0-4,1.791-4,4V24c0,2.209,1.791,4,4,4H27c2.209,0,4-1.791,4-4V8c0-2.209-1.791-4-4-4Zm3,20c0,1.654-1.346,3-3,3H5c-1.654,0-3-1.346-3-3V8c0-1.654,1.346-3,3-3H27c1.654,0,3,1.346,3,3V24Z" opacity=".15"></path>
    <path d="M27,5H5c-1.657,0-3,1.343-3,3v1c0-1.657,1.343-3,3-3H27c1.657,0,3,1.343,3,3v-1c0-1.657-1.343-3-3-3Z" fill="#fff" opacity=".2"></path>
    <path fill="#fff" d="M14.201 16l-4.073 2.905 1.519-4.809-4.028-2.968 5.035-.047L14.201 6.3l1.546 4.78 5.035.047-4.028 2.968 1.519 4.809L14.201 16z"></path>
    <path fill="#fff" d="M18.451 16a4.956 4.956 0 01-4.865 4.043 4.956 4.956 0 01-4.865-4.043 4.956 4.956 0 014.865-4.043 4.956 4.956 0 014.865 4.043z"></path>
    <circle cx="12.549" cy="16" r="3.957" fill="#c8102e"></circle>
  </svg>
);

const EnglishFlag = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className={className}>
    <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#071b65"></rect>
    <path d="M5.101,4h-.101c-1.981,0-3.615,1.444-3.933,3.334L26.899,28h.101c1.981,0,3.615-1.444,3.933-3.334L5.101,4Z" fill="#fff"></path>
    <path d="M22.25,19h-2.5l9.934,7.947c.387-.353,.704-.777,.931-1.254l-8.365-6.693Z" fill="#b92932"></path>
    <path d="M1.387,6.309l8.363,6.691h2.5L2.316,5.053c-.387,.353-.704,.777-.931,1.254v.002Z" fill="#b92932"></path>
    <path d="M5,28h.101L30.933,7.334c-.318-1.891-1.952-3.334-3.933-3.334h-.101L1.067,24.666c.318,1.891,1.952,3.334,3.933,3.334Z" fill="#fff"></path>
    <path d="M22.25,13l9.934-7.947c-.387-.353-.704-.777-.931-1.254l-8.365,6.693-2.5,2.508h2.5-.638Z" fill="#b92932"></path>
    <path d="M1.387,25.693l8.363-6.693h2.5l-9.934,7.947v-.002c.387,.353,.704,.777,.931,1.254v-.002l-.002,.002,.142-.506Z" fill="#b92932"></path>
    <rect x="13" y="4" width="6" height="24" fill="#fff"></rect>
    <rect x="1" y="13" width="30" height="6" fill="#fff"></rect>
    <rect x="14" y="4" width="4" height="24" fill="#b92932"></rect>
    <rect x="14" y="1" width="4" height="30" transform="translate(32) rotate(90)" fill="#b92932"></rect>
    <path d="M28.222,4.21l-9.222,7.376v1.414h.75l9.943-7.94c-.419-.384-.918-.675-1.471-.85Z" fill="#b92932"></path>
    <path d="M2.328,26.957c.414,.374,.904,.658,1.447,.832l9.225-7.38v-1.408h-.75L2.328,26.955v.002Z" fill="#b92932"></path>
    <path d="M27,4H5c-2.209,0-4,1.791-4,4V24c0,2.209,1.791,4,4,4H27c2.209,0,4-1.791,4-4V8c0-2.209-1.791-4-4-4Zm3,20c0,1.654-1.346,3-3,3H5c-1.654,0-3-1.346-3-3V8c0-1.654,1.346-3,3-3H27c1.654,0,3,1.346,3,3V24Z" opacity=".15"></path>
    <path d="M27,5H5c-1.657,0-3,1.343-3,3v1c0-1.657,1.343-3,3-3H27c1.657,0,3,1.343,3,3v-1c0-1.657-1.343-3-3-3Z" fill="#fff" opacity=".2"></path>
  </svg>
);

// Flag component map
const FlagIcon: Record<string, React.FC<{ className?: string }>> = {
  tr: TurkishFlag,
  en: EnglishFlag,
};

const languages = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
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
      <div className="flex items-center gap-1">
        {languages.map((lang) => {
          const Flag = FlagIcon[lang.code];
          const isActive = activeLocale === lang.code;
          return (
            <Link
              key={lang.code}
              href={getAlternateUrl(pathname, lang.code)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              title={lang.label}
            >
              <Flag className="w-5 h-5" />
              <span className="text-sm font-medium">
                {lang.code.toUpperCase()}
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  // Dropdown variant
  const currentLang =
    languages.find((l) => l.code === activeLocale) || languages[0];
  const CurrentFlag = FlagIcon[currentLang.code];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-flex items-center gap-1">
            <CurrentFlag className="w-5 h-5" /> {currentLang.code.toUpperCase()}
          </span>
          <span className="sm:hidden"><CurrentFlag className="w-5 h-5" /></span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => {
          const Flag = FlagIcon[lang.code];
          return (
            <DropdownMenuItem key={lang.code} asChild>
              <Link
                href={getAlternateUrl(pathname, lang.code)}
                className={`flex items-center gap-2 w-full ${activeLocale === lang.code ? "font-semibold" : ""
                  }`}
              >
                <Flag className="w-5 h-5" />
                <span>{lang.label}</span>
                {activeLocale === lang.code && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
