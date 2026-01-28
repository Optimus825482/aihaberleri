import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    // Initialize Firebase Admin with service account
    const serviceAccount = require("../../firebase-admin-key.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

export const firebaseAdmin = admin;

// Helper function to send push notification via FCM
export async function sendFCMNotification(
  token: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    clickAction?: string;
  },
) {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || "/logos/brand/logo-icon.png",
      },
      webpush: notification.clickAction
        ? {
            fcmOptions: {
              link: notification.clickAction,
            },
          }
        : undefined,
      token,
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ FCM notification sent successfully: ${response}`);
    return { success: true, messageId: response };
  } catch (error: any) {
    // Handle specific Firebase errors
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      console.log(`🗑️  Invalid FCM token, should be removed from database`);
      return { success: false, error: "INVALID_TOKEN", shouldDelete: true };
    }

    if (error.code === "messaging/message-rate-exceeded") {
      console.warn(`⚠️  FCM rate limit exceeded, retry later`);
      return { success: false, error: "RATE_LIMIT" };
    }

    console.error("❌ FCM send error:", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return { success: false, error: error.code || "UNKNOWN_ERROR" };
  }
}
