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
    const [canLoad, setCanLoad] = useState(false);

    const clientId =
        process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-2444093901783574";
    const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";

    useEffect(() => {
        if (!isEnabled || !clientId) {
            setCanLoad(false);
            return;
        }

        if (pathname?.startsWith("/admin")) {
            setCanLoad(false);
            return;
        }

        setCanLoad(hasAdvertisingConsent());
    }, [pathname, isEnabled, clientId]);

    if (!canLoad || !clientId) return null;

    return (
        <Script
            id="adsense-bootstrap"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
                clientId,
            )}`}
            crossOrigin="anonymous"
        />
    );
};
