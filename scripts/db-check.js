const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Bozuk SpaceX haberini sil
    const deleted = await prisma.article.delete({
      where: { slug: 'spacex-is-pivoting-to-focus-on-a-moon-base-before-mars' }
    });
    console.log('✅ Haber silindi!');
    console.log('ID:', deleted.id);
    console.log('Title:', deleted.title);
  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
