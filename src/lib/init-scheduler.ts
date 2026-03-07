/**
 * Scheduler Initialization
 * This file is imported in the root layout to start the scheduler
 */

import { initializeScheduler } from "./scheduler";

const shouldAutoInitializeScheduler =
  typeof window === "undefined" &&
  (process.env.ENABLE_IN_PROCESS_SCHEDULER === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.DISABLE_IN_PROCESS_SCHEDULER !== "true"));

// Only auto-start the in-process fallback outside production.
// In production, prefer the dedicated BullMQ worker unless explicitly enabled.
if (shouldAutoInitializeScheduler) {
  // Wait for app to be ready before initializing
  setTimeout(() => {
    initializeScheduler().catch((error) => {
      console.error("❌ Failed to initialize scheduler:", error);
    });
  }, 10000); // Wait 10 seconds for app to be fully ready
}

export {};
