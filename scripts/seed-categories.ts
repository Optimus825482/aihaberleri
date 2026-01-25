/**
 * Script to seed initial categories
 * Run with: npx tsx scripts/seed-categories.ts
 */

import { db } from "../src/lib/db";
import { generateSlug } from "../src/lib/utils";

const categories = [
  {
    name: "Makine Öğrenmesi",
    description:
      "Makine öğrenmesi algoritmalarında ve uygulamalarında son gelişmeler",
    order: 1,
  },
  {
    name: "Doğal Dil İşleme",
    description: "Doğal dil işleme atılımları ve dil modeli gelişmeleri",
    order: 2,
  },
  {
    name: "Bilgisayarlı Görü",
    description: "Görüntü tanıma, nesne algılama ve görsel yapay zeka",
    order: 3,
  },
  {
    name: "Robotik",
    description: "Yapay zeka destekli robotik ve otomasyon",
    order: 4,
  },
  {
    name: "Yapay Zeka Etiği",
    description: "Etik değerlendirmeler ve sorumlu yapay zeka geliştirme",
    order: 5,
  },
  {
    name: "Yapay Zeka Araçları",
    description: "Yeni yapay zeka araçları, platformlar ve uygulamalar",
    order: 6,
  },
  {
    name: "Sektör Haberleri",
    description:
      "Yapay zeka sektörü güncellemeleri, yatırımlar ve iş haberleri",
    order: 7,
  },
  {
    name: "Araştırma",
    description: "Akademik araştırmalar ve bilimsel makaleler",
    order: 8,
  },
];

async function seedCategories() {
  console.log("🌱 Kategoriler oluşturuluyor...\n");

  try {
    for (const category of categories) {
      const slug = generateSlug(category.name);

      const created = await db.category.upsert({
        where: { slug },
        update: {},
        create: {
          ...category,
          slug,
        },
      });

      console.log(`✅ ${created.name} (${created.slug})`);
    }

    console.log(`\n✅ ${categories.length} kategori başarıyla oluşturuldu`);
  } catch (error) {
    console.error("❌ Kategori oluşturma hatası:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedCategories();
