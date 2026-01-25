"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface HeaderProps {
  categories: Category[];
}

export function Header({ categories }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  return (
    <header className="border-b bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Logo
            size="md"
            showText={true}
            priority
            className="transition-opacity hover:opacity-80"
          />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-blue-400"
            >
              Anasayfa
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="text-sm font-medium transition-colors hover:text-blue-400"
              >
                {category.name}
              </Link>
            ))}
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-blue-400"
            >
              Hakkımızda
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Menü"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-gray-900 z-40 overflow-y-auto">
          <nav className="container mx-auto px-4 py-6 flex flex-col space-y-4">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium py-3 px-4 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Anasayfa
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium py-3 px-4 hover:bg-gray-800 rounded-lg transition-colors"
              >
                {category.name}
              </Link>
            ))}
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium py-3 px-4 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Hakkımızda
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
