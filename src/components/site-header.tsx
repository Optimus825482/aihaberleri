import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/db";

export async function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b shadow-sm">
      <div className="container flex h-16 items-center">
        <MainNav items={siteConfig.mainNav} />
        <div className="flex items-center ml-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
