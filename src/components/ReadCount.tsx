"use client";

import { useEffect, useState } from "react";

interface ReadCountProps {
    slug: string;
    fallbackViews: number;
}

/**
 * Okunma sayısını gösteren client component.
 * GA4 ve DB'den hangisi yüksekse onu gösterir.
 */
export function ReadCount({ slug, fallbackViews }: ReadCountProps) {
    const [views, setViews] = useState<number>(fallbackViews);

    useEffect(() => {
        let cancelled = false;

        async function fetchBestViews() {
            try {
                const res = await fetch(`/api/analytics/ga-views?slug=${encodeURIComponent(slug)}`);
                if (!res.ok) return;

                const data = await res.json();
                if (!cancelled && data.success) {
                    // GA4 ve DB'den hangisi yüksekse onu göster
                    const gaViews = data.views || 0;
                    const bestViews = Math.max(gaViews, fallbackViews);
                    setViews(bestViews);
                }
            } catch {
                // GA ulaşılamazsa fallback kullan (zaten set)
            }
        }

        fetchBestViews();
        return () => { cancelled = true; };
    }, [slug, fallbackViews]);

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
