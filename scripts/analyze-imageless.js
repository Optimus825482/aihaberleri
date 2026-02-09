const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Görselsiz haberleri detaylı analiz et
    // null, boş string VEYA placeholder kontrolü
    const imagelessArticles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { imageUrl: null },
          { imageUrl: '' },
          { imageUrl: '/logos/og-image.png' }  // Placeholder da görselsiz sayılır
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: 15,
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        sourceUrl: true,
        publishedAt: true,
        keywords: true
      }
    });

    console.log('\n📊 GÖRSELSİZ HABER ANALİZİ\n');
    console.log(`Toplam görselsiz/placeholder: ${imagelessArticles.length}\n`);

    imagelessArticles.forEach((article, i) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📰 ${i + 1}. ${(article.title || '').substring(0, 55)}...`);
      console.log(`${'='.repeat(60)}`);
      console.log(`ID: ${article.id}`);
      console.log(`Slug: ${article.slug}`);
      console.log(`ImageUrl: ${article.imageUrl || 'NULL'}`);
      console.log(`Kaynak: ${article.sourceUrl}`);
      console.log(`Tarih: ${article.publishedAt}`);
      console.log(`\n🔍 İÇERİK ANALİZİ:`);
      
      // Shadow DOM veya hata kontrolü
      const contentStr = article.content || '';
      const excerptStr = article.excerpt || '';
      
      const shadowDomError = contentStr.includes('shadow DOM') || excerptStr.includes('shadow DOM');
      const publishedTimeError = contentStr.includes('Published Time:') || excerptStr.includes('Published Time:');
      const warningError = contentStr.includes('Warning:') || excerptStr.includes('Warning:');
      const jinaError = shadowDomError || publishedTimeError || warningError;
      
      if (jinaError) {
        console.log('⚠️  JINA READER HATASI TESPİT EDİLDİ!');
        if (shadowDomError) console.log('   - Shadow DOM hatası');
        if (publishedTimeError) console.log('   - Published Time hatası');
        if (warningError) console.log('   - Warning mesajı');
      } else {
        console.log('✅ Jina Reader hatası yok');
      }
      
      // İngilizce başlık kontrolü
      const titleTr = article.title || '';
      const hasEnglishTitle = /^[A-Za-z0-9\s\-\:\'\",\.!?]+$/.test(titleTr.trim());
      if (hasEnglishTitle && titleTr.length > 10) {
        console.log('⚠️  BAŞLIK İNGİLİZCE (çevrilmemiş)');
      }
      
      // İçerik uzunluğu
      const contentLength = contentStr.replace(/<[^>]*>/g, '').length;
      console.log(`📝 İçerik uzunluğu: ${contentLength} karakter`);
      if (contentLength < 200) {
        console.log('⚠️  ÇOK KISA İÇERİK!');
      }
      
      // Excerpt preview
      console.log(`\n📋 Excerpt: ${(excerptStr || '').substring(0, 150)}...`);
    });
    
  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
