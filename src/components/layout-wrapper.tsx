"use client";

import { usePathname } from "next/navigation";

interface LayoutWrapperProps {
  children: React.ReactNode;
  header: React.ReactNode;
  headerEn: React.ReactNode;
  footer: React.ReactNode;
  footerEn: React.ReactNode;
}

export function LayoutWrapper({
  children,
  header,
  headerEn,
  footer,
  footerEn,
}: LayoutWrapperProps) {
  const pathname = usePathname();
  const isEnglish = pathname === "/en" || pathname?.startsWith("/en/");
  const isAdmin = pathname?.startsWith("/admin");

  // Admin pages have their own layout — no global header/footer
  if (isAdmin) {
    return <>{children}</>;
  }

  // Show locale-appropriate header and footer
  return (
    <>
      {isEnglish ? headerEn : header}
      {children}
      {isEnglish ? footerEn : footer}
    </>
  );
}
