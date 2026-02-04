/**
 * Clear NextAuth cache and sessions
 * Run with: npx tsx scripts/clear-auth-cache.ts
 */

import { db } from "../src/lib/db";

async function clearAuthCache() {
  console.log("🧹 NextAuth Cache Temizleniyor...\n");

  try {
    // Clear all sessions from database
    const deletedSessions = await db.session.deleteMany({});
    console.log(`✅ ${deletedSessions.count} session silindi`);

    // Clear all accounts
    const deletedAccounts = await db.account.deleteMany({});
    console.log(`✅ ${deletedAccounts.count} account silindi`);

    // Clear verification tokens
    const deletedTokens = await db.verificationToken.deleteMany({});
    console.log(`✅ ${deletedTokens.count} verification token silindi`);

    console.log("\n✅ Cache başarıyla temizlendi!");
    console.log("\n🔧 Şimdi yapmanız gerekenler:");
    console.log(
      "  1. Browser'da tüm cookie'leri temizleyin (Ctrl+Shift+Delete)",
    );
    console.log("  2. Sunucuyu yeniden başlatın: npm run dev");
    console.log("  3. Login'i deneyin: http://localhost:3000/admin/login");
  } catch (error) {
    console.error("❌ Cache temizleme hatası:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

clearAuthCache();
