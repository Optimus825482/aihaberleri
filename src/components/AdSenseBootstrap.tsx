"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const COOKIE_CONSENT_KEY = "cookie-consent";

const hasAdvertisingConsent = () => {
    if (typeof window === "undefined") return false;

    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;

    if (raw === "accepted") return true;
    if (raw === "rejected") return false;

    try {
        const parsed = JSON.parse(raw) as { advertising?: boolean };
        return Boolean(parsed.advertising);
    } catch {
        return false;
    }
};

export const AdSenseBootstrap = () => {
    const pathname = usePathname();
    const [hasConsent, setHasConsent] = useState(false);

    const clientId =
        process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-2444093901783574";
    const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";

    // Admin sayfalarında reklam yok
    const isAdminPage = pathname?.startsWith("/admin");

    useEffect(() => {
        const syncConsent = () => {
            setHasConsent(hasAdvertisingConsent());
        };

        syncConsent();

        window.addEventListener("cookie-consent-updated", syncConsent);
        window.addEventListener("storage", syncConsent);

        return () => {
            window.removeEventListener("cookie-consent-updated", syncConsent);
            window.removeEventListener("storage", syncConsent);
        };
    }, [pathname]);

    if (!isEnabled || !clientId || isAdminPage) return null;

    return (
        <>
            {/* Non-personalized ads signal for GDPR compliance */}
            {!hasConsent && (
                <Script
                    id="adsense-npa"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;`,
                    }}
                />
            )}

            {/* AdSense bootstrap — always loads (non-personalized if no consent) */}
            <Script
                id="adsense-bootstrap"
                async
                strategy="afterInteractive"
                src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
                    clientId,
                )}`}
                crossOrigin="anonymous"
            />
        </>
    );
};
