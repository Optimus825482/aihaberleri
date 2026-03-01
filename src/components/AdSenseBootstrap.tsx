"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

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
    // ============================================================
    // ⛔ ADSENSE CEZASI AKTIF — SCRIPT INJECTION DEVRE DIŞI
    // Ceza süresi bitince bu return'u kaldır.
    // ============================================================
    return null;

    const pathname = usePathname();
    const [hasConsent, setHasConsent] = useState(false);
    const scriptInjected = useRef(false);

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

    // NPA (Non-Personalized Ads) signal for GDPR compliance
    useEffect(() => {
        if (!isEnabled || !clientId || isAdminPage) return;
        if (!hasConsent) {
            (window as any).adsbygoogle = (window as any).adsbygoogle || [];
            (window as any).adsbygoogle.requestNonPersonalizedAds = 1;
        }
    }, [isEnabled, clientId, isAdminPage, hasConsent]);

    // Inject AdSense script without data-nscript attribute
    useEffect(() => {
        if (!isEnabled || !clientId || isAdminPage) return;
        if (scriptInjected.current) return;
        if (document.querySelector('script[src*="adsbygoogle.js"]')) {
            scriptInjected.current = true;
            return;
        }

        const script = document.createElement("script");
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        scriptInjected.current = true;
    }, [isEnabled, clientId, isAdminPage]);

    return null;
};
