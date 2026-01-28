"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Menu, Search, X } from "lucide-react";
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
      // Implement search functionality here or redirect to search page
      // For now, just close the search bar
      console.log("Searching for:", searchQuery);
      setIsSearchOpen(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center space-x-2">
              <Logo size="md" showText={true} />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/")
                  ? "text-primary font-bold"
                  : "text-muted-foreground",
              )}
            >
              Anasayfa
            </Link>
            {categories.slice(0, 5).map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive(`/category/${category.slug}`)
                    ? "text-primary font-bold"
                    : "text-muted-foreground",
                )}
              >
                {category.name}
              </Link>
            ))}
            <Link
              href="/about"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/about")
                  ? "text-primary font-bold"
                  : "text-muted-foreground",
              )}
            >
              Hakkımızda
            </Link>
            <Link
              href="/contact"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/contact")
                  ? "text-primary font-bold"
                  : "text-muted-foreground",
              )}
            >
              İletişim
            </Link>
            {categories.length > 5 && (
              <Link
                href="/categories"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Diğer
              </Link>
            )}
          </nav>

          {/* Right Actions: Search & Subscribe & Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Search Bar - Desktop Expanded / Mobile Toggle */}
            <div
              className={cn(
                "flex items-center",
                isSearchOpen
                  ? "w-full absolute left-0 top-0 h-16 bg-background px-4 z-50 lg:static lg:w-auto lg:bg-transparent lg:p-0"
                  : "",
              )}
            >
              {isSearchOpen ? (
                <form
                  onSubmit={handleSearch}
                  className="flex w-full items-center gap-2 lg:w-64"
                >
                  <Input
                    autoFocus
                    placeholder="Haber ara..."
                    className="h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Arama</span>
                </Button>
              )}
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher variant="inline" />

            <div className="hidden sm:flex">
              <Button size="sm" className="hidden md:flex font-semibold">
                Abone Ol
              </Button>
            </div>

            {/* Mobile Menu (Sheet) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-muted-foreground hover:text-primary"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Menü</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[400px] pr-0"
              >
                <SheetHeader className="px-1 text-left">
                  <SheetTitle className="flex items-center gap-2 ml-4">
                    <Logo size="sm" showText={true} />
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col space-y-3 pt-4">
                      <h4 className="font-medium leading-none">Menü</h4>
                      <SheetClose asChild>
                        <Link
                          href="/"
                          className={cn(
                            "block py-2 text-lg font-medium transition-colors hover:text-primary",
                            isActive("/")
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          Anasayfa
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/about"
                          className={cn(
                            "block py-2 text-lg font-medium transition-colors hover:text-primary",
                            isActive("/about")
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          Hakkımızda
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/contact"
                          className={cn(
                            "block py-2 text-lg font-medium transition-colors hover:text-primary",
                            isActive("/contact")
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          İletişim
                        </Link>
                      </SheetClose>
                    </div>

                    <div className="flex flex-col space-y-3 pt-4 border-t">
                      <h4 className="font-medium leading-none">Kategoriler</h4>
                      {categories.map((category) => (
                        <SheetClose key={category.id} asChild>
                          <Link
                            href={`/category/${category.slug}`}
                            className={cn(
                              "block py-2 text-base transition-colors hover:text-primary",
                              isActive(`/category/${category.slug}`)
                                ? "text-primary font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {category.name}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>

                    {/* Language Switcher - Mobile */}
                    <div className="pt-4 border-t mr-6">
                      <h4 className="font-medium leading-none mb-3">
                        Dil / Language
                      </h4>
                      <LanguageSwitcher variant="inline" />
                    </div>

                    <div className="pt-4 border-t mr-6">
                      <Button className="w-full font-semibold">Abone Ol</Button>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
