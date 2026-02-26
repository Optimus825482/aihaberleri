"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type AdSlotProps = {
  slot: string;
  className?: string;
  format?:
    | "auto"
    | "horizontal"
    | "vertical"
    | "rectangle"
    | "fluid"
    | "autorelaxed";
  layout?: string;
  layoutKey?: string;
  responsive?: boolean;
  minHeight?: number;
  label?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export const AdSlot = ({
  slot,
  className,
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
  minHeight = 120,
  label,
}: AdSlotProps) => {
  const pathname = usePathname();
  const [adElement, setAdElement] = useState<HTMLModElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";

  const shouldRender = useMemo(() => {
    if (!isEnabled || !clientId) return false;
    if (pathname?.startsWith("/admin")) return false;
    return true; // Always render — AdSenseBootstrap handles NPA for GDPR
  }, [isEnabled, clientId, pathname]);

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
      setShowFallback(false);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // No-op: fail safe to avoid breaking page render
      setShowFallback(true);
    }
  }, [shouldRender, isInViewport, adElement]);

  useEffect(() => {
    if (!shouldRender || !isInViewport || !adElement) return;

    const updateFallback = () => {
      const status = adElement.getAttribute("data-adsbygoogle-status");
      if (status === "unfilled") {
        // Reklam dolmadı — alanı tamamen gizle (boş kutu kalsın diye)
        setShowFallback(false);
        adElement.style.display = "none";
        const parent = adElement.closest('[aria-label]') as HTMLElement;
        if (parent) parent.style.display = "none";
        return;
      }
      if (status) {
      // Reklam yüklendi
        setShowFallback(false);
      }
    };

    const observer = new MutationObserver(updateFallback);
    observer.observe(adElement, {
      attributes: true,
      attributeFilter: ["data-adsbygoogle-status"],
    });

    // 3 saniye içinde reklam gelmezse gizle
    const timeout = window.setTimeout(() => {
      const status = adElement.getAttribute("data-adsbygoogle-status");
      if (!status || status === "unfilled") {
        setShowFallback(false);
        adElement.style.display = "none";
        const parent = adElement.closest('[aria-label]') as HTMLElement;
        if (parent) parent.style.display = "none";
      }
    }, 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
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
        {...(layout ? { "data-ad-layout": layout } : {})}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        {...(format !== "fluid" && format !== "autorelaxed"
          ? { "data-full-width-responsive": responsive ? "true" : "false" }
          : {})}
      />

      {showFallback ? (
        <div className="mt-1 animate-pulse rounded-lg bg-ai-surface-dark/30">
          <div className="h-[90px] rounded-lg bg-gradient-to-r from-ai-surface-dark/20 via-ai-surface-dark/40 to-ai-surface-dark/20" />
        </div>
      ) : null}
    </div>
  );
};
