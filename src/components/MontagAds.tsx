"use client";

/**
 * MontagAds - Reklam Komponenti
 * 
 * ⚠️ REKLAMLAR DEVRE DIŞI BIRAKILDI (7 Şubat 2026)
 * 
 * Tekrar etkinleştirmek için aşağıdaki kodu uncomment edin:
 * 
 * import { usePathname } from "next/navigation";
 * import Script from "next/script";
 * 
 * export function MontagAds() {
 *   const pathname = usePathname();
 *   
 *   // Admin panelinde reklam gösterme
 *   if (pathname?.startsWith("/admin")) {
 *     return null;
 *   }
 *
 *   return (
 *     <Script
 *       src="https://quge5.com/88/tag.min.js"
 *       data-zone="209156"
 *       strategy="afterInteractive"
 *       data-cfasync="false"
 *     />
 *   );
 * }
 */

export function MontagAds() {
  // Reklamlar tamamen devre dışı - hiçbir şey render etme
  return null;
}
