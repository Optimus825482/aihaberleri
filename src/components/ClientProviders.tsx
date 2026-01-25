"use client";

import dynamic from "next/dynamic";

const CookieConsent = dynamic(
  () =>
    import("@/components/CookieConsent").then((mod) => ({
      default: mod.CookieConsent,
    })),
  { ssr: false },
);
const NotificationPrompt = dynamic(
  () =>
    import("@/components/NotificationPrompt").then((mod) => ({
      default: mod.NotificationPrompt,
    })),
  { ssr: false },
);
const PWAInstallPrompt = dynamic(
  () =>
    import("@/components/PWAInstallPrompt").then((mod) => ({
      default: mod.PWAInstallPrompt,
    })),
  { ssr: false },
);

export function ClientProviders() {
  return (
    <>
      <CookieConsent />
      <NotificationPrompt />
      <PWAInstallPrompt />
    </>
  );
}
