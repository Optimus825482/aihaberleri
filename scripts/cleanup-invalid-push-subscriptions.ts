/**
 * Cleanup Invalid Push Subscriptions
 *
 * Bu script geçersiz push subscription'ları temizler
 */

import { db } from "../src/lib/db";
import webpush from "web-push";

// Configure VAPID
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@aihaberleri.org",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

async function cleanupInvalidSubscriptions() {
  console.log("🧹 Starting push subscription cleanup...\n");

  const subscriptions = await db.pushSubscription.findMany();
  console.log(`📊 Total subscriptions: ${subscriptions.length}\n`);

  let validCount = 0;
  let invalidCount = 0;
  let errorCount = 0;

  for (const sub of subscriptions) {
    try {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: sub.keys as any,
      };

      // Send a test notification (empty payload)
      const testPayload = JSON.stringify({
        title: "Test",
        body: "Subscription validation",
      });

      await webpush.sendNotification(pushConfig, testPayload);

      validCount++;
      console.log(`✅ Valid: ${sub.id}`);
    } catch (error: any) {
      // Invalid subscription - delete it
      if (
        error.statusCode === 410 ||
        error.statusCode === 404 ||
        error.statusCode === 400
      ) {
        try {
          await db.pushSubscription.delete({ where: { id: sub.id } });
          invalidCount++;
          console.log(
            `🗑️  Deleted invalid subscription: ${sub.id} (Status: ${error.statusCode})`,
          );
        } catch (deleteError) {
          console.error(`❌ Failed to delete ${sub.id}:`, deleteError);
          errorCount++;
        }
      } else {
        // Other errors (network, etc.) - keep the subscription
        console.warn(
          `⚠️  Error testing ${sub.id} (Status: ${error.statusCode}), keeping subscription`,
        );
        validCount++;
      }
    }
  }

  console.log("\n📊 Cleanup Summary:");
  console.log(`   ✅ Valid subscriptions: ${validCount}`);
  console.log(`   🗑️  Deleted invalid: ${invalidCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Total processed: ${subscriptions.length}`);
}

// Run cleanup
cleanupInvalidSubscriptions()
  .then(() => {
    console.log("\n✅ Cleanup completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  });
