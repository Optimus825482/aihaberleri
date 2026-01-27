"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Logo } from "@/components/Logo";

export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function MainNav({
  items,
  children,
}: {
  items?: NavItem[];
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = React.useState<boolean>(false);

  return (
    <div className="flex flex-1 items-center justify-between">
      <div className="flex gap-6 md:gap-10 items-center">
        <Logo className="hidden md:flex" size="md" showText={true} />
        <Logo className="flex md:hidden" size="sm" showText={false} />
      </div>

      <div className="flex items-center gap-6">
        {/* Desktop Menu - Right Aligned */}
        <nav className="hidden md:flex gap-6 items-center">
          {items?.map((item, index) => (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href ? "text-primary" : "text-muted-foreground",
                item.disabled && "cursor-not-allowed opacity-80",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <button
          className="flex items-center space-x-2 md:hidden"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          {showMobileMenu ? (
            <Icons.close className="h-6 w-6" />
          ) : (
            <Icons.menu className="h-6 w-6" />
          )}
          <span className="font-bold">Menü</span>
        </button>
      </div>

      {showMobileMenu && items && (
        <div className="fixed inset-0 top-16 z-50 grid h-[calc(100vh-4rem)] grid-flow-row auto-rows-max overflow-auto p-6 pb-32 shadow-md animate-in slide-in-from-bottom-80 md:hidden bg-background">
          <div className="relative z-20 grid gap-6 rounded-md bg-popover p-4 text-popover-foreground shadow-md border">
            <nav className="grid grid-flow-row auto-rows-max text-sm">
              {items.map((item, index) => (
                <Link
                  key={index}
                  href={item.disabled ? "#" : item.href}
                  className={cn(
                    "flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline",
                    item.disabled && "cursor-not-allowed opacity-60",
                  )}
                  onClick={() => setShowMobileMenu(false)}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
