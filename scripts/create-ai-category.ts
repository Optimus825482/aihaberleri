// Yapay Zeka kategorisi oluşturma scripti
// Kullanım: npx ts-node scripts/create-ai-category.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Mevcut kategoriler kontrol ediliyor...');
  
  // Mevcut kategorileri listele
  const existingCategories = await prisma.category.findMany({
    orderBy: { order: 'asc' }
  });
  
  console.log('\n📋 Mevcut Kategoriler:');
  existingCategories.forEach(cat => {
    console.log(`  - ${cat.name} (slug: ${cat.slug}, order: ${cat.order})`);
  });

  // yapay-zeka kategorisi var mı kontrol et
  const aiCategory = existingCategories.find(c => c.slug === 'yapay-zeka');
  
  if (aiCategory) {
    console.log('\n✅ "yapay-zeka" kategorisi zaten mevcut!');
    return aiCategory;
  }

  // En düşük order değerini bul (en üste eklemek için)
  const minOrder = existingCategories.length > 0 
    ? Math.min(...existingCategories.map(c => c.order || 0)) - 1 
    : 0;

  console.log('\n🆕 "yapay-zeka" kategorisi oluşturuluyor...');
  
  const newCategory = await prisma.category.create({
    data: {
      name: 'Yapay Zeka',
      slug: 'yapay-zeka',
      description: 'Yapay zeka, makine öğrenimi ve AI teknolojileri hakkında güncel haberler',
      order: minOrder, // En üste ekle
    }
  });

  console.log('\n✅ Kategori oluşturuldu:');
  console.log(`  - Name: ${newCategory.name}`);
  console.log(`  - Slug: ${newCategory.slug}`);
  console.log(`  - Order: ${newCategory.order}`);

  return newCategory;
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🎉 İşlem tamamlandı!');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('\n❌ Hata:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
