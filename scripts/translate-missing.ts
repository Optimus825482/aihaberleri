/**
 * Eksik 3 haberi çevir
 * Kullanım: npx tsx scripts/translate-missing.ts
 */

import { translateAndSaveArticle } from "../src/lib/translation";

const missingIds = [
  "cml4a9uxi0002hkvxcmcy2pyh", // Capgemini ICE
  "cml6mhzq90003iyyxgura634i", // Waymo 16 Milyar
  "cmky85k950006rlqpyph118ck", // Logitech CEO
];

async function main() {
  console.log("🌍 3 eksik haberi çeviriyorum...\n");

  for (const id of missingIds) {
    try {
      console.log(`📝 Çevriliyor: ${id}`);
      await translateAndSaveArticle(id, "tr");
      console.log(`✅ Başarılı: ${id}\n`);
      // Rate limit için 3 saniye bekle
      await new Promise((r) => setTimeout(r, 3000));
    } catch (error: any) {
      console.error(`❌ Hata: ${id}`, error.message);
    }
  }

  console.log("\n🏁 Tamamlandı!");
  process.exit(0);
}

main();
