import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/db";

export async function SiteHeader() {
  let categories: any[] = [];

  // Skip database queries during build if SKIP_ENV_VALIDATION is set
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return (
      <header className="bg-background sticky top-0 z-40 w-full border-b shadow-sm">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <MainNav items={siteConfig.mainNav} categories={[]} />
          <div className="flex flex-1 items-center justify-end space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </header>
    );
  }

  try {
    categories = await db.category.findMany({
      orderBy: { order: "asc" },
      take: 6,
    });
  } catch (error) {
    console.error("Error fetching categories for header:", error);
  }

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b shadow-sm">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={siteConfig.mainNav} categories={categories} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-block"
            >
              <div
                className={buttonVariants({
                  size: "icon",
                  variant: "ghost",
                })}
              >
                <Icons.gitHub className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </div>
            </Link>
            <Link
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-block"
            >
              <div
                className={buttonVariants({
                  size: "icon",
                  variant: "ghost",
                })}
              >
                <Icons.twitter className="h-5 w-5 fill-current" />
                <span className="sr-only">Twitter</span>
              </div>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
