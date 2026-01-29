/**
 * Test Push Notification
 * Usage: npx tsx scripts/test-push-notification.ts
 */

import { sendPushNotification } from "@/lib/push";
import { db } from "@/lib/db";

async function testPushNotification() {
  console.log("🧪 Push Notification Test Başlatılıyor...\n");

  // Check VAPID keys
  console.log("1️⃣ VAPID Keys Kontrolü:");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.error("❌ VAPID keys bulunamadı!");
    console.log(
      "   NEXT_PUBLIC_VAPID_PUBLIC_KEY:",
      publicKey ? "✅ Var" : "❌ Yok",
    );
    console.log("   VAPID_PRIVATE_KEY:", privateKey ? "✅ Var" : "❌ Yok");
    process.exit(1);
  }

  console.log("✅ VAPID keys mevcut");
  console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
  console.log(`   Private Key: ${privateKey.substring(0, 20)}...\n`);

  // Check subscriptions
  console.log("2️⃣ Push Subscriptions Kontrolü:");
  const subscriptions = await db.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    console.warn("⚠️ Hiç push subscription yok!");
    console.log("   Önce bir tarayıcıdan bildirimlere izin verin.\n");
    process.exit(0);
  }

  console.log(`✅ ${subscriptions.length} adet subscription bulundu`);
  subscriptions.forEach((sub, i) => {
    console.log(`   ${i + 1}. ${sub.endpoint.substring(0, 50)}...`);
  });
  console.log();

  // Send test notification
  console.log("3️⃣ Test Bildirimi Gönderiliyor:");
  try {
    const result = await sendPushNotification(
      "🧪 Test Bildirimi",
      "Bu bir test bildirimidir. Push notification sistemi çalışıyor!",
      "/",
    );

    console.log("\n✅ Test tamamlandı!");
    console.log(`   Başarılı: ${result.sent}`);
    console.log(`   Başarısız: ${result.failed}`);

    if (result.sent === 0 && result.failed === 0) {
      console.warn("\n⚠️ Hiç bildirim gönderilemedi!");
      console.log("   Sebep:", result.reason || "Bilinmiyor");
    }
  } catch (error) {
    console.error("\n❌ Test başarısız:", error);
    process.exit(1);
  }

  await db.$disconnect();
}

testPushNotification().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
