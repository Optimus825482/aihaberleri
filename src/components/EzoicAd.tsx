"use client";

import { useEffect, useRef } from "react";

interface EzoicAdProps {
    /**
     * Ezoic placeholder ID (e.g., 101, 102, 103)
     * You'll get these IDs from Ezoic dashboard after approval
     */
    placeholderId: number;
    className?: string;
}

/**
 * Ezoic Ad Placeholder Component
 * 
 * Usage:
 * <EzoicAd placeholderId={101} />
 * 
 * Common placeholder positions:
 * - 101: Header/Top of page
 * - 102: Sidebar
 * - 103: In-content (between paragraphs)
 * - 104: Footer/Bottom of page
 * 
 * Note: Placeholder IDs are assigned by Ezoic after site approval.
 * The actual IDs will be provided in your Ezoic dashboard.
 */
export function EzoicAd({ placeholderId, className = "" }: EzoicAdProps) {
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Only run on client side
        if (typeof window === "undefined") return;

        // Check if Ezoic is loaded
        const ezstandalone = (window as any).ezstandalone;
        if (!ezstandalone) {
            console.warn("Ezoic not loaded yet");
            return;
        }

        // Push ad display command
        ezstandalone.cmd.push(function () {
            ezstandalone.displayMore(placeholderId);
        });
    }, [placeholderId]);

    return (
        <div
            ref={adRef}
            id={`ezoic-pub-ad-placeholder-${placeholderId}`}
            className={`ezoic-ad ${className}`}
        >
            {/* Ezoic will inject the ad here */}
        </div>
    );
}

/**
 * Ezoic In-Article Ad
 * Specifically designed for placement between article paragraphs
 */
export function EzoicInArticleAd({ placeholderId }: { placeholderId: number }) {
    return (
        <div className="my-6">
            <EzoicAd placeholderId={placeholderId} className="min-h-[250px]" />
        </div>
    );
}

/**
 * Ezoic Sidebar Ad
 * Sticky ad for sidebar placement
 */
export function EzoicSidebarAd({ placeholderId }: { placeholderId: number }) {
    return (
        <div className="sticky top-4">
            <EzoicAd placeholderId={placeholderId} className="min-h-[600px]" />
        </div>
    );
}

/**
 * Initialize Ezoic ads on page load
 * Call this in your page component after content is rendered
 */
export function initEzoicAds() {
    if (typeof window === "undefined") return;

    const ezstandalone = (window as any).ezstandalone;
    if (!ezstandalone) return;

    ezstandalone.cmd.push(function () {
        ezstandalone.define(101, 102, 103, 104); // Define placeholder IDs
        ezstandalone.enable();
        ezstandalone.display();
    });
}
