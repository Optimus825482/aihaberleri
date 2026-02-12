"use client";

import { useEffect, useState } from "react";

interface ReadCountProps {
    slug: string;
    fallbackViews: number;
}

/**
 * Google Analytics'ten gerçek okunma sayısını çeken client component.
 * GA4 bağlanamazsa DB'deki views alanını fallback olarak gösterir.
 */
export function ReadCount({ slug, fallbackViews }: ReadCountProps) {
    const [views, setViews] = useState<number>(fallbackViews);
    const [source, setSource] = useState<"db" | "ga4">("db");

    useEffect(() => {
        let cancelled = false;

        async function fetchGAViews() {
            try {
                const res = await fetch(`/api/analytics/ga-views?slug=${encodeURIComponent(slug)}`);
                if (!res.ok) return;

                const data = await res.json();
                if (!cancelled && data.success) {
                    setViews(data.views);
                    setSource(data.source);
                }
            } catch {
                // GA ulaşılamazsa fallback kullan (zaten set)
            }
        }

        fetchGAViews();
        return () => { cancelled = true; };
    }, [slug]);

    return (
        <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">
                visibility
            </span>
            <span>
                {views.toLocaleString("tr-TR")} okunma
            </span>
        </div>
    );
}
