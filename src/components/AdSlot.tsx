"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type AdSlotProps = {
    slot: string;
    className?: string;
    format?: "auto" | "horizontal" | "vertical" | "rectangle";
    responsive?: boolean;
    minHeight?: number;
    label?: string;
};

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

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

export const AdSlot = ({
    slot,
    className,
    format = "auto",
    responsive = true,
    minHeight = 120,
    label,
}: AdSlotProps) => {
    const pathname = usePathname();
    const [adElement, setAdElement] = useState<HTMLModElement | null>(null);
    const [isInViewport, setIsInViewport] = useState(false);
    const [canLoad, setCanLoad] = useState(false);

    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
    const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";

    const shouldRender = useMemo(() => {
        if (!isEnabled || !clientId) return false;
        if (pathname?.startsWith("/admin")) return false;
        return canLoad;
    }, [isEnabled, clientId, pathname, canLoad]);

    useEffect(() => {
        setCanLoad(hasAdvertisingConsent());
    }, []);

    useEffect(() => {
        if (!shouldRender || !adElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    setIsInViewport(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" },
        );

        observer.observe(adElement);
        return () => observer.disconnect();
    }, [shouldRender, adElement]);

    useEffect(() => {
        if (!shouldRender || !isInViewport || !adElement) return;

        if (adElement.getAttribute("data-adsbygoogle-status")) return;

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // No-op: fail safe to avoid breaking page render
        }
    }, [shouldRender, isInViewport, adElement]);

    if (!shouldRender || !clientId) return null;

    const minHeightClass =
        minHeight >= 180
            ? "min-h-[180px]"
            : minHeight >= 160
                ? "min-h-[160px]"
                : minHeight >= 140
                    ? "min-h-[140px]"
                    : minHeight >= 120
                        ? "min-h-[120px]"
                        : "min-h-[100px]";

    return (
        <div
            className={`${minHeightClass} ${className || ""}`.trim()}
            aria-label={label || "reklam"}
        >
            {label ? (
                <p className="mb-2 text-[11px] uppercase tracking-wide text-ai-text-muted">
                    {label}
                </p>
            ) : null}

            <ins
                ref={setAdElement}
                className={`adsbygoogle block ${minHeightClass}`}
                data-ad-client={clientId}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive ? "true" : "false"}
            />
        </div>
    );
};
