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
    console.warn("Skipping Push: VAPID keys not configured in .env");
    return;
  }

  const subscriptions = await db.pushSubscription.findMany();

  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icons/icon-192x192.png",
    url,
  });

  const promises = subscriptions.map((sub) => {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: sub.keys as any,
    };

    return webpush.sendNotification(pushConfig, payload).catch((error: any) => {
      // 410 (Gone) or 404 (Not Found) means the subscription is no longer valid
      if (error.statusCode === 410 || error.statusCode === 404) {
        return db.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch((e) => console.error("Error deleting expired sub", e));
      }
      // Other errors are just logged
      console.error(
        `Error sending push to ${sub.id}:`,
        error instanceof Error ? error.message : error,
      );
    });
  });

  await Promise.all(promises);
}
