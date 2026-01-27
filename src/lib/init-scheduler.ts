/**
 * Scheduler Initialization
 * This file is imported in the root layout to start the scheduler
 */

import { initializeScheduler } from "./scheduler";

// Only run on server side
if (typeof window === "undefined") {
  // Wait for app to be ready before initializing
  setTimeout(() => {
    initializeScheduler().catch((error) => {
      console.error("❌ Failed to initialize scheduler:", error);
    });
  }, 10000); // Wait 10 seconds for app to be fully ready
}

export {};
