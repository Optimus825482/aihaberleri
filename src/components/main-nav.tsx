"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

export function MainNav({
  items,
  children,
}: {
  items?: any[];
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="flex items-center space-x-2">
        <div className="relative h-10 w-40">
          <Image
            src="/logos/brand/ai-logo-dark.png"
            alt="AI Haberleri"
            fill
            className="object-contain"
            priority
          />
        </div>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items?.map((item, index) => (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm",
                item.href.startsWith(`/${pathname?.split("/")[1]}`)
                  ? "text-foreground"
                  : "text-foreground/60",
                item.disabled && "cursor-not-allowed opacity-80",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      ) : null}
      <button
        className="flex items-center space-x-2 md:hidden"
        onClick={() => false}
      >
        <Icons.menu className="h-6 w-6" />
        <span className="font-bold">Menu</span>
      </button>
      {children}
    </div>
  );
}
