"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * VisitorTracker Component
 * 
 * Tracks real-time visitor presence on the site.
 * - Registers visitor on mount
 * - Updates current page on navigation
 * - Sends heartbeats every 30 seconds to maintain "active" status
 * - Uses localStorage to prevent duplicate tracking
 */

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const VISITOR_KEY = "aihaberleri_visitor_id";

async function getClientIP(): Promise<string> {
    try {
        // Try to get IP from a simple echo service
        const response = await fetch("https://api.ipify.org?format=json", {
            cache: "no-store",
        });
        if (response.ok) {
            const data = await response.json();
            return data.ip;
        }
    } catch (error) {
        console.warn("Could not get client IP:", error);
    }

    // Fallback to a pseudo-unique ID based on user agent and time
    return `unknown-${Date.now()}`;
}

export function VisitorTracker() {
    const pathname = usePathname();

    const trackVisitor = useCallback(async (currentPage: string) => {
        try {
            const ipAddress = await getClientIP();
            const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : "";

            const response = await fetch("/api/visitors/track", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ipAddress,
                    userAgent,
                    currentPage,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data?.id) {
                    localStorage.setItem(VISITOR_KEY, data.data.id);
                }
            }
        } catch (error) {
            console.warn("Failed to track visitor:", error);
        }
    }, []);

    // Track on mount and pathname change
    useEffect(() => {
        // Skip tracking in admin pages
        if (pathname.startsWith("/admin")) {
            return;
        }

        // Track current page
        trackVisitor(pathname);
    }, [pathname, trackVisitor]);

    // Heartbeat to maintain active status
    useEffect(() => {
        // Skip heartbeat in admin pages
        if (pathname.startsWith("/admin")) {
            return;
        }

        const interval = setInterval(() => {
            trackVisitor(pathname);
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, [pathname, trackVisitor]);

    return null;
}
