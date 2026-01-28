import axios from "axios";

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID || "882602408279863";

async function testInstagramConnection() {
  console.log("📱 Instagram Bağlantı Testi Başlıyor...\n");

  try {
    // 1. Facebook Page'in Instagram hesabını kontrol et
    console.log("1️⃣ Instagram Business Account kontrolü...");
    const pageResponse = await axios.get(
      `https://graph.facebook.com/v21.0/${FACEBOOK_PAGE_ID}`,
      {
        params: {
          fields: "instagram_business_account,name",
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        },
      },
    );

    console.log("✅ Facebook Page Bilgisi:");
    console.log(`- Page Name: ${pageResponse.data.name}`);
    console.log(`- Page ID: ${pageResponse.data.id}`);

    if (pageResponse.data.instagram_business_account) {
      const instagramAccountId =
        pageResponse.data.instagram_business_account.id;
      console.log(`✅ Instagram Business Account bulundu!`);
      console.log(`- Instagram Account ID: ${instagramAccountId}\n`);

      // 2. Instagram hesap bilgilerini al
      console.log("2️⃣ Instagram hesap bilgileri alınıyor...");
      const instagramResponse = await axios.get(
        `https://graph.facebook.com/v21.0/${instagramAccountId}`,
        {
          params: {
            fields:
              "id,username,name,profile_picture_url,followers_count,media_count",
            access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
          },
        },
      );

      console.log("✅ Instagram Hesap Bilgileri:");
      console.log(JSON.stringify(instagramResponse.data, null, 2));
      console.log("\n");

      // 3. Token izinlerini kontrol et
      console.log("3️⃣ Token izinleri kontrol ediliyor...");
      const debugResponse = await axios.get(
        `https://graph.facebook.com/v21.0/debug_token`,
        {
          params: {
            input_token: FACEBOOK_PAGE_ACCESS_TOKEN,
            access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
          },
        },
      );

      const scopes = debugResponse.data.data.scopes || [];
      console.log("📋 Mevcut İzinler:");
      scopes.forEach((scope: string) => {
        console.log(`  ${scope.includes("instagram") ? "✅" : "⚪"} ${scope}`);
      });

      const hasInstagramBasic = scopes.includes("instagram_basic");
      const hasInstagramPublish = scopes.includes("instagram_content_publish");

      console.log("\n📊 Instagram İzin Durumu:");
      console.log(`  ${hasInstagramBasic ? "✅" : "❌"} instagram_basic`);
      console.log(
        `  ${hasInstagramPublish ? "✅" : "❌"} instagram_content_publish`,
      );

      if (hasInstagramBasic && hasInstagramPublish) {
        console.log("\n🎉 Instagram paylaşımı yapabilirsiniz!");
        console.log("\n📝 .env dosyasına ekleyin:");
        console.log(`INSTAGRAM_ENABLED="true"`);
        console.log(`INSTAGRAM_ACCOUNT_ID="${instagramAccountId}"`);
        console.log(`INSTAGRAM_ACCESS_TOKEN="${FACEBOOK_PAGE_ACCESS_TOKEN}"`);
      } else {
        console.log("\n⚠️ Instagram paylaşımı için gerekli izinler eksik!");
        console.log("\n📋 Yapılması Gerekenler:");
        console.log("1. Facebook Developer Console → Graph API Explorer");
        console.log("2. Add Permissions:");
        console.log("   - instagram_basic");
        console.log("   - instagram_content_publish");
        console.log("3. Generate Access Token");
        console.log("4. Yeni token ile tekrar test edin");
      }
    } else {
      console.log("❌ Instagram Business Account bulunamadı!\n");
      console.log("📋 Yapılması Gerekenler:");
      console.log("1. Instagram hesabınızı Business hesaba çevirin");
      console.log("2. Instagram → Ayarlar → Hesap → Profesyonel hesaba geç");
      console.log("3. Instagram → Ayarlar → Bağlı hesaplar → Facebook");
      console.log('4. "Aihaberleri.org" Facebook sayfasını bağlayın');
      console.log("5. Bu scripti tekrar çalıştırın\n");
      console.log("📚 Detaylı rehber: docs/INSTAGRAM-TOKEN-SETUP.md");
    }
  } catch (error: any) {
    console.error("❌ Hata:", error.response?.data || error.message);

    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      console.error("\n📋 Facebook Error Details:");
      console.error("- Type:", fbError.type);
      console.error("- Code:", fbError.code);
      console.error("- Message:", fbError.message);
    }
  }
}

testInstagramConnection();
