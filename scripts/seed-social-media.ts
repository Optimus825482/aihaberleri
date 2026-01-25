import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sosyal medya hesapları oluşturuluyor...");

  const socialMediaAccounts = [
    {
      platform: "youtube",
      url: "https://youtube.com/@aihaberleriorg",
      enabled: true,
    },
    {
      platform: "facebook",
      url: "https://facebook.com/aihaberleriorg",
      enabled: true,
    },
    {
      platform: "instagram",
      url: "https://instagram.com/aihaberleriorg",
      enabled: true,
    },
    {
      platform: "twitter",
      url: "https://twitter.com/aihaberleriorg",
      enabled: true,
    },
  ];

  for (const account of socialMediaAccounts) {
    await prisma.socialMedia.upsert({
      where: { platform: account.platform },
      update: account,
      create: account,
    });
    console.log(`✅ ${account.platform} hesabı oluşturuldu`);
  }

  console.log("✅ Sosyal medya hesapları başarıyla oluşturuldu!");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
