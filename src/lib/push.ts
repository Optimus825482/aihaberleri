import webpush from "web-push";
import { db } from "@/lib/db";

// Configure VAPID key logic only if keys exist environment
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@aihaberleri.org",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  } catch (error) {
    console.error("VAPID setup failed (check keys in .env):", error);
  }
}

export async function sendPushNotification(
  title: string,
  body: string,
  url: string = "/",
) {
  // If keys are missing, don't attempt to send
  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    console.warn("⚠️ Push bildirimi atlandı: VAPID keys yapılandırılmamış");
    return { sent: 0, reason: "VAPID keys missing" };
  }

  const subscriptions = await db.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    console.warn("⚠️ Push bildirimi atlandı: Hiç subscription yok");
    return { sent: 0, reason: "No subscriptions" };
  }

  console.log(
    `📱 ${subscriptions.length} aboneye push bildirimi gönderiliyor...`,
  );

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icons/icon-192x192.png",
    url,
  });

  let successCount = 0;
  let failureCount = 0;

  const promises = subscriptions.map(async (sub) => {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: sub.keys as any,
    };

    try {
      await webpush.sendNotification(pushConfig, payload);
      successCount++;
      return { success: true, id: sub.id };
    } catch (error: any) {
      failureCount++;

      // 410 (Gone) or 404 (Not Found) means the subscription is no longer valid
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`🗑️  Removing expired push subscription: ${sub.id}`);
        return db.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch((e) => console.error("Error deleting expired sub:", e));
      }

      // 401 (Unauthorized) - Expired or invalid subscription
      if (error.statusCode === 401) {
        console.log(`🗑️  Removing unauthorized push subscription: ${sub.id}`);
        return db.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch((e) => console.error("Error deleting unauthorized sub:", e));
      }

      // 400 (Bad Request) - Invalid subscription format
      if (error.statusCode === 400) {
        console.log(`🗑️  Removing invalid push subscription: ${sub.id}`);
        return db.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch((e) => console.error("Error deleting invalid sub:", e));
      }

      // Network errors or temporary failures
      if (error.statusCode === 500 || error.statusCode === 503) {
        console.warn(
          `⚠️  Temporary push error (${error.statusCode}) for ${sub.id}, will retry later`,
        );
        return { success: false, id: sub.id, temporary: true };
      }

      // Log other unexpected errors with more details
      console.error(`❌ Error sending push to ${sub.id}:`, {
        statusCode: error.statusCode,
        message: error.message,
        body: error.body,
      });

      return { success: false, id: sub.id };
    }
  });

  await Promise.all(promises);

  console.log(
    `✅ Push bildirimi tamamlandı: ${successCount} başarılı, ${failureCount} başarısız`,
  );

  return { sent: successCount, failed: failureCount };
}
