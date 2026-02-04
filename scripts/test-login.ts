/**
 * Script to test login credentials
 * Run with: npx tsx scripts/test-login.ts
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

async function testLogin() {
  console.log("🔍 Login Test - Şifre Doğrulama\n");

  const email = await question("E-posta: ");
  const password = await question("Şifre: ");

  if (!email || !password) {
    console.error("❌ E-posta ve şifre gereklidir");
    process.exit(1);
  }

  try {
    // Find user
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
      },
    });

    if (!user) {
      console.error("❌ Bu e-posta ile kayıtlı kullanıcı bulunamadı");
      process.exit(1);
    }

    console.log("\n✅ Kullanıcı bulundu:");
    console.log(`   ID: ${user.id}`);
    console.log(`   E-posta: ${user.email}`);
    console.log(`   İsim: ${user.name || "Yok"}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   Şifre Hash: ${user.password?.substring(0, 20)}...`);

    if (!user.password) {
      console.error("\n❌ HATA: Kullanıcının şifresi veritabanında yok!");
      console.log("   Çözüm: Şifreyi yeniden ayarlayın");
      process.exit(1);
    }

    // Test password
    console.log("\n🔐 Şifre doğrulanıyor...");
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log("✅ ŞİFRE DOĞRU! Login başarılı olmalı.");
    } else {
      console.error("❌ ŞİFRE YANLIŞ!");
      console.log("\n🔧 Şifreyi sıfırlamak için:");
      console.log("   npx tsx scripts/reset-password.ts");
    }
  } catch (error) {
    console.error("❌ Test hatası:", error);
    process.exit(1);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

testLogin();
