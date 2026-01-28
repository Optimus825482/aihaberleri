import axios from "axios";

const FACEBOOK_PAGE_ACCESS_TOKEN =
  "EAAj3ypqCAuUBQhP4ttRhKZAo8SifbyT64EGCog6HUisZAi2lU6rFwawZBc9qnYDO1JZBTBQHFKmbZC6x7qAKTYSMBxfpyDOl5FelUXBDAsmNpB0FdSMRpaxFGlSxQpBu2qPmQKqPAQ6ncC5438kpgamGpF6eqpImpZAyWcOQlIZAHiuFbbIZBhTrO3odnJ41vt902ETgCAZDZD";
const FACEBOOK_PAGE_ID = "882602408279863";

async function testFacebookToken() {
  console.log("🔍 Facebook Token Test Başlıyor...\n");

  try {
    // 1. Token Debug - Token bilgilerini kontrol et
    console.log("1️⃣ Token Debug API çağrısı...");
    const debugResponse = await axios.get(
      `https://graph.facebook.com/v21.0/debug_token`,
      {
        params: {
          input_token: FACEBOOK_PAGE_ACCESS_TOKEN,
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        },
      },
    );

    console.log("✅ Token Debug Sonucu:");
    console.log(JSON.stringify(debugResponse.data, null, 2));
    console.log("\n");

    // 2. Page Info - Sayfa bilgilerini al
    console.log("2️⃣ Page Info API çağrısı...");
    const pageResponse = await axios.get(
      `https://graph.facebook.com/v21.0/${FACEBOOK_PAGE_ID}`,
      {
        params: {
          fields: "id,name,access_token,category,fan_count",
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        },
      },
    );

    console.log("✅ Page Info Sonucu:");
    console.log(JSON.stringify(pageResponse.data, null, 2));
    console.log("\n");

    // 3. Test Post - Deneme paylaşımı (gerçekten paylaşmaz, sadece test)
    console.log("3️⃣ Test Post Permissions...");
    const permissionsResponse = await axios.get(
      `https://graph.facebook.com/v21.0/me/permissions`,
      {
        params: {
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        },
      },
    );

    console.log("✅ Token Permissions:");
    console.log(JSON.stringify(permissionsResponse.data, null, 2));
    console.log("\n");

    console.log("🎉 Tüm testler başarılı!");
  } catch (error: any) {
    console.error("❌ Hata:", error.response?.data || error.message);

    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      console.error("\n📋 Facebook Error Details:");
      console.error("- Type:", fbError.type);
      console.error("- Code:", fbError.code);
      console.error("- Message:", fbError.message);
      console.error("- Subcode:", fbError.error_subcode);

      if (fbError.code === 190) {
        console.error("\n💡 Token süresi dolmuş veya geçersiz!");
        console.error("Çözüm:");
        console.error("1. Facebook Developer Console'a git");
        console.error("2. Graph API Explorer'ı aç");
        console.error("3. Yeni bir Page Access Token oluştur");
        console.error('4. Token\'ı "Never Expire" olarak ayarla');
      }
    }
  }
}

testFacebookToken();
