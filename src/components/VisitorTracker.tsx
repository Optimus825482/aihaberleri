"use client";

import { usePageTracking } from "@/hooks/usePageTracking";

/**
 * VisitorTracker Component
 *
 * Comprehensive visitor tracking:
 * - Records every page view with full metrics
 * - Tracks duration, scroll depth, device, browser, OS
 * - GeoIP location detection (server-side)
 * - Referrer tracking for traffic source analysis
 * - Uses sendBeacon for reliable data on page exit
 */

export function VisitorTracker() {
  usePageTracking();
  return null;
}
