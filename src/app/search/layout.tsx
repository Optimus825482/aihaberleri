import type { Metadata } from "next";

// Force dynamic rendering to prevent prerendering issues with root layout client providers
export const dynamic = "force-dynamic";

// Prevent search pages from being indexed — duplicate content & crawl budget waste
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
