/**
 * Title A/B Testing React Hook
 *
 * Handles title display and tracking for A/B testing
 */

"use client";

import { useEffect, useState, useCallback } from "react";

export type TitleVariantType = "primary" | "clickbait" | "seo";

interface UseABTestingOptions {
  articleId: string;
  defaultTitle: string;
  trackView?: boolean;
}

interface ABTestingState {
  title: string;
  variant: TitleVariantType | null;
  isABTest: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for A/B testing title display
 * Automatically tracks views when title is displayed
 */
export function useABTesting({
  articleId,
  defaultTitle,
  trackView = true,
}: UseABTestingOptions): ABTestingState & {
  trackClick: () => Promise<void>;
} {
  const [state, setState] = useState<ABTestingState>({
    title: defaultTitle,
    variant: null,
    isABTest: false,
    isLoading: true,
    error: null,
  });

  // Fetch active title on mount
  useEffect(() => {
    const fetchTitle = async () => {
      try {
        const response = await fetch(`/api/ab-testing/${articleId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          // No A/B test for this article, use default
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
          return;
        }

        const data = await response.json();

        if (data.success && data.data) {
          const { activeVariant, variants, winner } = data.data;
          const variant = winner || activeVariant;
          const title = variants[variant] || defaultTitle;

          setState({
            title,
            variant,
            isABTest: !winner,
            isLoading: false,
            error: null,
          });

          // Track view if this is an active A/B test
          if (trackView && !winner) {
            await fetch(`/api/ab-testing/${articleId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "view", variant }),
            });
          }
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    fetchTitle();
  }, [articleId, defaultTitle, trackView]);

  // Track click
  const trackClick = useCallback(async () => {
    if (!state.variant || !state.isABTest) return;

    try {
      await fetch(`/api/ab-testing/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "click", variant: state.variant }),
      });
    } catch (error) {
      console.error("Failed to track click:", error);
    }
  }, [articleId, state.variant, state.isABTest]);

  return {
    ...state,
    trackClick,
  };
}

/**
 * Track click for server-side rendering
 * Use this when you don't have access to the hook
 */
export async function trackABClick(
  articleId: string,
  variant: TitleVariantType,
): Promise<void> {
  try {
    await fetch(`/api/ab-testing/${articleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "click", variant }),
    });
  } catch (error) {
    console.error("Failed to track A/B click:", error);
  }
}

/**
 * Track view for server-side rendering
 */
export async function trackABView(
  articleId: string,
  variant: TitleVariantType,
): Promise<void> {
  try {
    await fetch(`/api/ab-testing/${articleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "view", variant }),
    });
  } catch (error) {
    console.error("Failed to track A/B view:", error);
  }
}

export default useABTesting;
