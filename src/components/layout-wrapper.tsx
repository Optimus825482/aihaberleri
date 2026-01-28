"use client";

import { usePathname } from "next/navigation";

interface LayoutWrapperProps {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}

export function LayoutWrapper({
  children,
  header,
  footer,
}: LayoutWrapperProps) {
  const pathname = usePathname();
  // Check if current route is English
  // Also check admin routes if created separate layout for admin
  const isEnglish = pathname?.startsWith("/en");
  const isAdmin = pathname?.startsWith("/admin");

  // Don't show global header/footer on English pages (they assume en layout handles it)
  // Don't show global header/footer on Admin pages (admin has its own layout usually)
  const shouldHideGlobalNav = isEnglish || isAdmin;

  return (
    <>
      {!shouldHideGlobalNav && header}
      {children}
      {!shouldHideGlobalNav && footer}
    </>
  );
}
