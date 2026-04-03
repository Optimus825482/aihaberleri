import Link from "next/link";

export default function CategoryNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The category you are looking for does not exist or may have been
        removed. Browse all available categories using the link below.
      </p>
      <Link
        href="/en/categories"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Browse All Categories
      </Link>
    </div>
  );
}
