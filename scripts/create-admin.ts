/**
 * Script to create admin user
 * Run with: npx tsx scripts/create-admin.ts
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

async function createAdmin() {
  console.log("🔧 Admin Kullanıcısı Oluştur\n");

  const email = await question("E-posta: ");
  const password = await question("Şifre: ");
  const name = await question("İsim (opsiyonel): ");

  if (!email || !password) {
    console.error("❌ E-posta ve şifre gereklidir");
    process.exit(1);
  }

  try {
    // Check if user exists
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.error("❌ Bu e-posta ile kayıtlı kullanıcı zaten var");
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || undefined,
        role: "ADMIN",
      },
    });

    console.log("\n✅ Admin kullanıcısı başarıyla oluşturuldu!");
    console.log(`   E-posta: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(
      `\n🔗 Giriş: ${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/login`,
    );
  } catch (error) {
    console.error("❌ Admin kullanıcısı oluşturma hatası:", error);
    process.exit(1);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

createAdmin();
