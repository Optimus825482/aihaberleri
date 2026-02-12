"use client";

import useSWR, { SWRConfiguration } from "swr";
import useSWRMutation from "swr/mutation";

// Global fetcher function
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("API request failed");
    throw error;
  }
  return res.json();
};

// Default SWR config for admin panel
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 seconds deduplication
  errorRetryCount: 3,
};

/**
 * Dashboard Stats Hook with SWR caching
 */
export function useDashboardStats(refreshInterval = 30000) {
  return useSWR("/api/admin/dashboard", fetcher, {
    ...defaultConfig,
    refreshInterval,
  });
}

/**
 * Agent Stats Hook with SWR caching
 */
export function useAgentStats(refreshInterval = 30000) {
  return useSWR("/api/agent/stats", fetcher, {
    ...defaultConfig,
    refreshInterval,
  });
}

/**
 * System Stats Hook (RAM, Disk) with SWR caching
 */
export function useSystemStats(refreshInterval = 30000) {
  return useSWR("/api/admin/system-stats", fetcher, {
    ...defaultConfig,
    refreshInterval,
  });
}

/**
 * Categories Data Hook with SWR caching
 */
export function useCategories() {
  return useSWR("/api/admin/categories", fetcher, {
    ...defaultConfig,
    revalidateOnFocus: true,
  });
}

/**
 * Newsletter Preview Hook
 */
export function useNewsletterPreview() {
  return useSWR("/api/admin/newsletter/preview", fetcher, {
    ...defaultConfig,
    revalidateOnFocus: true,
  });
}

/**
 * Newsletter Logs Hook
 */
export function useNewsletterLogs() {
  return useSWR("/api/admin/newsletter/logs", fetcher, {
    ...defaultConfig,
  });
}

/**
 * Newsletter Subscribers Hook
 */
export function useNewsletterSubscribers() {
  return useSWR("/api/admin/newsletter/subscribers", fetcher, {
    ...defaultConfig,
    revalidateOnFocus: true,
  });
}

/**
 * Realtime Visitors SSE Hook - custom implementation
 */
export function useRealtimeVisitors() {
  return useSWR(
    "/api/admin/realtime",
    async () => {
      // Return initial empty state, SSE will update
      return { visitors: [], count: 0 };
    },
    {
      ...defaultConfig,
      revalidateOnMount: true,
    },
  );
}

/**
 * Mutation hook for triggering agent
 */
export function useTriggerAgent() {
  return useSWRMutation("/api/agent/trigger", async (url: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executeNow: true }),
    });
    if (!res.ok) throw new Error("Failed to trigger agent");
    return res.json();
  });
}

/**
 * Mutation hook for deleting subscriber
 */
export function useDeleteSubscriber() {
  return useSWRMutation(
    "/api/admin/newsletter/subscribers",
    async (url: string, { arg }: { arg: { id: string } }) => {
      const res = await fetch(`${url}?id=${arg.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete subscriber");
      return res.json();
    },
  );
}
