/**
 * Initialize Cron Jobs
 * This file is imported in the root layout to start cron jobs on app startup
 */

import { startCronJobs } from "./cron";

// Only run in production or when explicitly enabled
if (
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_CRON_JOBS === "true"
) {
  // Start cron jobs after a short delay to ensure app is ready
  setTimeout(() => {
    startCronJobs();
  }, 5000); // 5 second delay
}

export {};
