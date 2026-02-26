"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useSavedArticles } from "@/hooks/useSavedArticles";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface HeaderProps {
  categories: Category[];
}

export function Header({ categories }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isActive = (path: string) => pathname === path;

  const { savedCount } = useSavedArticles();

  const navLinks = [
    { href: "/", label: "Ana Sayfa", icon: "home" },
    { href: "/news", label: "Haberler", icon: "newspaper" },
    { href: "/ai-terimler", label: "AI Sözlük", icon: "menu_book" },
    { href: "/categories", label: "Kategoriler", icon: "category" },
    { href: "/about", label: "Hakkımızda", icon: "info" },
    { href: "/contact", label: "İletişim", icon: "mail" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ai-surface-border bg-ai-surface-dark/95 backdrop-blur supports-[backdrop-filter]:bg-ai-surface-dark/80">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Logo size="md" showText={false} />
            <span className="text-lg font-bold text-white tracking-tight hidden sm:block">
              AI Haberleri
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(link.href)
                    ? "bg-ai-primary text-white"
                    : "text-ai-text-secondary hover:text-white hover:bg-ai-surface-card",
                )}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
            {savedCount > 0 && (
              <Link
                href="/favoriler"
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive("/favoriler")
                    ? "bg-ai-primary text-white"
                    : "text-ai-text-secondary hover:text-white hover:bg-ai-surface-card",
                )}
              >
                <span className="material-symbols-outlined text-[20px]">bookmark</span>
                Favorilerim
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ai-primary/20 px-1.5 text-[10px] font-bold text-ai-primary">
                  {savedCount}
                </span>
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search Bar - Desktop */}
            <div className="hidden md:flex items-center">
              <form onSubmit={handleSearch} className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ai-text-muted text-[20px]">
                  search
                </span>
                <Input
                  placeholder="Haber ara..."
                  className="h-10 w-48 lg:w-56 pl-10 bg-ai-surface-card border-ai-surface-border text-white placeholder:text-ai-text-muted focus:border-ai-primary focus:ring-ai-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-ai-text-secondary hover:text-white hover:bg-ai-surface-card transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isSearchOpen ? "close" : "search"}
              </span>
            </button>

            {/* Notification Bell */}
            <button className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg text-ai-text-secondary hover:text-white hover:bg-ai-surface-card transition-colors relative">
              <span className="material-symbols-outlined text-[22px]">
                notifications
              </span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-ai-primary rounded-full"></span>
            </button>

            {/* Language Switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher variant="inline" />
            </div>

            {/* Subscribe Button */}
            <Button
              size="sm"
              className="bg-ai-primary hover:bg-ai-primary-hover text-white font-semibold px-4 h-10 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] mr-1.5">
                bookmark_add
              </span>
              <span className="hidden sm:inline">Abone Ol</span>
            </Button>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-ai-text-secondary hover:text-white hover:bg-ai-surface-card transition-colors">
                  <span className="material-symbols-outlined text-[24px]">
                    menu
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[350px] bg-ai-surface-dark border-ai-surface-border p-0"
              >
                <SheetHeader className="p-4 border-b border-ai-surface-border">
                  <SheetTitle className="flex items-center gap-3">
                    <Logo size="sm" showText={false} />
                    <span className="text-lg font-bold text-white">
                      AI Haberleri
                    </span>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Search */}
                <div className="p-4 border-b border-ai-surface-border">
                  <form onSubmit={handleSearch} className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ai-text-muted text-[20px]">
                      search
                    </span>
                    <Input
                      placeholder="Haber ara..."
                      className="h-10 w-full pl-10 bg-ai-surface-card border-ai-surface-border text-white placeholder:text-ai-text-muted"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>

                <ScrollArea className="h-[calc(100vh-180px)]">
                  <div className="p-4 space-y-1">
                    {/* Navigation Links */}
                    <p className="text-xs font-medium text-ai-text-muted uppercase tracking-wider mb-3 px-3">
                      Menü
                    </p>
                    {navLinks.map((link) => (
                      <SheetClose key={link.href} asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                            isActive(link.href)
                              ? "bg-ai-primary text-white"
                              : "text-ai-text-secondary hover:text-white hover:bg-ai-surface-card",
                          )}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {link.icon}
                          </span>
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                    {savedCount > 0 && (
                      <SheetClose asChild>
                        <Link
                          href="/favoriler"
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                            isActive("/favoriler")
                              ? "bg-ai-primary text-white"
                              : "text-ai-text-secondary hover:text-white hover:bg-ai-surface-card",
                          )}
                        >
                          <span className="material-symbols-outlined text-[20px]">bookmark</span>
                          Favori Haberlerim
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ai-primary/20 px-1.5 text-[10px] font-bold text-ai-primary">
                            {savedCount}
                          </span>
                        </Link>
                      </SheetClose>
                    )}

                    {/* Categories */}
                    <div className="pt-4 mt-4 border-t border-ai-surface-border">
                      <p className="text-xs font-medium text-ai-text-muted uppercase tracking-wider mb-3 px-3">
                        Kategoriler
                      </p>
                      {categories.map((category) => (
                        <SheetClose key={category.id} asChild>
                          <Link
                            href={`/category/${category.slug}`}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                              isActive(`/category/${category.slug}`)
                                ? "bg-ai-primary/10 text-ai-primary"
                                : "text-ai-text-secondary hover:text-white hover:bg-ai-surface-card",
                            )}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              tag
                            </span>
                            {category.name}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>

                    {/* Language Switcher - Mobile */}
                    <div className="pt-4 mt-4 border-t border-ai-surface-border">
                      <p className="text-xs font-medium text-ai-text-muted uppercase tracking-wider mb-3 px-3">
                        Dil / Language
                      </p>
                      <div className="px-3">
                        <LanguageSwitcher variant="inline" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Mobile Subscribe Button */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-ai-surface-border bg-ai-surface-dark">
                  <SheetClose asChild>
                    <Button className="w-full bg-ai-primary hover:bg-ai-primary-hover text-white font-semibold h-11 rounded-lg">
                      <span className="material-symbols-outlined text-[20px] mr-2">
                        bookmark_add
                      </span>
                      Abone Ol
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {isSearchOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-ai-surface-border animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearch} className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ai-text-muted text-[20px]">
                search
              </span>
              <Input
                autoFocus
                placeholder="Haber ara..."
                className="h-10 w-full pl-10 bg-ai-surface-card border-ai-surface-border text-white placeholder:text-ai-text-muted"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
