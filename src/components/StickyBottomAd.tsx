"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdSlot } from "./AdSlot";
import { AD_SLOTS } from "@/lib/ad-slots";

/**
 * Mobil yapışkan alt reklam.
 * - Sadece mobil cihazlarda görünür (lg breakpoint altı).
 * - Sayfa 30 saniye sonra veya 600px scroll sonrası aktif olur.
 * - Kapatma butonu ile gizlenebilir.
 * - Admin sayfalarında gizlenir.
 * - Footer yakınında otomatik gizlenir.
 */
export function StickyBottomAd() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const isAdmin = pathname?.startsWith("/admin");
    const isEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";

    useEffect(() => {
        if (!isEnabled || isAdmin || dismissed) return;

        let scrollTriggered = false;
        let timerTriggered = false;

        const show = () => {
            if (scrollTriggered && timerTriggered) {
                setVisible(true);
            }
        };

        // 30 saniye sonra timer tetikle
        const timer = setTimeout(() => {
            timerTriggered = true;
            show();
        }, 30_000);

        // 600px scroll sonrası tetikle
        const handleScroll = () => {
            if (window.scrollY > 600) {
                scrollTriggered = true;
                show();
                window.removeEventListener("scroll", handleScroll);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            clearTimeout(timer);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isEnabled, isAdmin, dismissed]);

    if (!isEnabled || isAdmin || dismissed || !visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
            {/* Kapatma butonu */}
            <div className="flex justify-end pr-1">
                <button
                    onClick={() => setDismissed(true)}
                    className="mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/80 hover:text-white text-xs shadow-md"
                    aria-label="Reklamı kapat"
                >
                    ✕
                </button>
            </div>
            <div className="bg-ai-surface-card border-t border-ai-surface-border shadow-2xl">
                <AdSlot
                    slot={AD_SLOTS.STICKY_BOTTOM_MOBILE}
                    format="auto"
                    responsive
                    minHeight={100}
                />
            </div>
        </div>
    );
}
