/**
 * Script to reset user password
 * Run with: npx tsx scripts/reset-password.ts
 */

import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetPassword() {
  console.log("🔧 Şifre Sıfırlama\n");

  const email = await question("E-posta: ");
  const newPassword = await question("Yeni Şifre: ");
  const confirmPassword = await question("Yeni Şifre (Tekrar): ");

  if (!email || !newPassword) {
    console.error("❌ E-posta ve şifre gereklidir");
    process.exit(1);
  }

  if (newPassword !== confirmPassword) {
    console.error("❌ Şifreler eşleşmiyor");
    process.exit(1);
  }

  try {
    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error("❌ Bu e-posta ile kayıtlı kullanıcı bulunamadı");
      process.exit(1);
    }

    console.log(`\n✅ Kullanıcı bulundu: ${user.email}`);
    console.log("🔐 Şifre hash'leniyor...");

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log("💾 Veritabanı güncelleniyor...");

    // Update password
    await db.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    console.log("\n✅ Şifre başarıyla güncellendi!");
    console.log(`   E-posta: ${user.email}`);
    console.log(`   Yeni Şifre Hash: ${hashedPassword.substring(0, 20)}...`);
    console.log(
      `\n🔗 Giriş: ${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/login`,
    );

    // Test the new password
    console.log("\n🧪 Yeni şifre test ediliyor...");
    const isValid = await bcrypt.compare(newPassword, hashedPassword);

    if (isValid) {
      console.log("✅ Şifre doğrulaması başarılı! Login çalışmalı.");
    } else {
      console.error("❌ UYARI: Şifre doğrulaması başarısız!");
    }
  } catch (error) {
    console.error("❌ Şifre sıfırlama hatası:", error);
    process.exit(1);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

resetPassword();
