/**
 * Quick test: Verify Facebook TR token is valid
 * Usage: npx tsx scripts/test-facebook-token.ts
 */

import "dotenv/config";
import axios from "axios";

const GRAPH_API_URL = "https://graph.facebook.com/v21.0";
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

async function testFacebookToken() {
  console.log("🔍 Facebook TR Token Test\n");

  if (!PAGE_ID) {
    console.error("❌ FACEBOOK_PAGE_ID tanımlı değil (.env)");
    process.exit(1);
  }
  if (!TOKEN) {
    console.error("❌ FACEBOOK_PAGE_ACCESS_TOKEN tanımlı değil (.env)");
    process.exit(1);
  }

  console.log(`📋 Page ID: ${PAGE_ID}`);
  console.log(
    `🔑 Token: ${TOKEN.substring(0, 15)}...${TOKEN.substring(TOKEN.length - 10)}\n`,
  );

  // Test 1: Page info
  try {
    const pageRes = await axios.get(`${GRAPH_API_URL}/${PAGE_ID}`, {
      params: {
        fields: "name,id,fan_count,followers_count",
        access_token: TOKEN,
      },
    });
    console.log("✅ Sayfa bilgisi alındı:");
    console.log(`   Sayfa: ${pageRes.data.name}`);
    console.log(`   ID: ${pageRes.data.id}`);
    if (pageRes.data.fan_count)
      console.log(`   Beğeni: ${pageRes.data.fan_count}`);
    if (pageRes.data.followers_count)
      console.log(`   Takipçi: ${pageRes.data.followers_count}`);
  } catch (err: any) {
    const fbErr = err?.response?.data?.error;
    console.error("❌ Sayfa bilgisi alınamadı:");
    if (fbErr) {
      console.error(`   Kod: ${fbErr.code}`);
      console.error(`   Mesaj: ${fbErr.message}`);
      if (fbErr.code === 190)
        console.error("   ⚠️ TOKEN EXPIRED — Yeni token oluştur!");
    } else {
      console.error(`   ${err.message}`);
    }
    process.exit(1);
  }

  // Test 2: Token debug info
  try {
    const debugRes = await axios.get(`${GRAPH_API_URL}/debug_token`, {
      params: {
        input_token: TOKEN,
        access_token: TOKEN,
      },
    });
    const data = debugRes.data.data;
    console.log("\n🔍 Token detayları:");
    console.log(`   Geçerli: ${data.is_valid ? "✅ EVET" : "❌ HAYIR"}`);
    console.log(`   Tip: ${data.type}`);
    if (data.expires_at) {
      const expDate = new Date(data.expires_at * 1000);
      const now = new Date();
      const daysLeft = Math.floor(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      console.log(
        `   Son kullanma: ${expDate.toLocaleDateString("tr-TR")} (${daysLeft > 0 ? daysLeft + " gün kaldı" : "EXPIRED!"})`,
      );
    } else {
      console.log("   Son kullanma: ♾️ Never expires (long-lived)");
    }
    if (data.scopes) {
      console.log(`   İzinler: ${data.scopes.join(", ")}`);
      const hasPublish =
        data.scopes.includes("pages_manage_posts") ||
        data.scopes.includes("publish_pages");
      console.log(
        `   Paylaşım izni: ${hasPublish ? "✅ VAR" : "❌ YOK — pages_manage_posts gerekli!"}`,
      );
    }
  } catch (err: any) {
    console.warn(
      "\n⚠️ Token debug bilgisi alınamadı (normal olabilir):",
      err?.response?.data?.error?.message || err.message,
    );
  }

  // Test 3: Can we read recent posts?
  try {
    const postsRes = await axios.get(`${GRAPH_API_URL}/${PAGE_ID}/feed`, {
      params: {
        fields: "message,created_time",
        limit: 3,
        access_token: TOKEN,
      },
    });
    const posts = postsRes.data.data || [];
    console.log(`\n📝 Son ${posts.length} paylaşım:`);
    for (const post of posts) {
      const date = new Date(post.created_time).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const msg = post.message
        ? post.message.substring(0, 80) + "..."
        : "(mesajsız)";
      console.log(`   ${date} — ${msg}`);
    }
  } catch (err: any) {
    console.warn(
      "\n⚠️ Son paylaşımlar okunamadı:",
      err?.response?.data?.error?.message || err.message,
    );
  }

  console.log("\n✅ Facebook TR token testi tamamlandı.");

  // === EN Token Test ===
  const EN_PAGE_ID = process.env.FACEBOOK_EN_PAGE_ID;
  const EN_TOKEN = process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN;
  const EN_ENABLED = process.env.FACEBOOK_EN_ENABLED === "true";

  if (!EN_ENABLED) {
    console.log("\n⏭️ Facebook EN devre dışı (FACEBOOK_EN_ENABLED != true)");
    return;
  }

  if (!EN_PAGE_ID || !EN_TOKEN) {
    console.error("\n❌ Facebook EN credentials eksik (.env)");
    return;
  }

  console.log("\n" + "=".repeat(50));
  console.log("🔍 Facebook EN Token Test\n");
  console.log(`📋 EN Page ID: ${EN_PAGE_ID}`);
  console.log(
    `🔑 EN Token: ${EN_TOKEN.substring(0, 15)}...${EN_TOKEN.substring(EN_TOKEN.length - 10)}\n`,
  );

  try {
    const pageRes = await axios.get(`${GRAPH_API_URL}/${EN_PAGE_ID}`, {
      params: {
        fields: "name,id,fan_count,followers_count",
        access_token: EN_TOKEN,
      },
    });
    console.log("✅ EN Sayfa bilgisi alındı:");
    console.log(`   Sayfa: ${pageRes.data.name}`);
    console.log(`   ID: ${pageRes.data.id}`);
  } catch (err: any) {
    const fbErr = err?.response?.data?.error;
    console.error("❌ EN Sayfa bilgisi alınamadı:");
    if (fbErr) console.error(`   Kod: ${fbErr.code} — ${fbErr.message}`);
    else console.error(`   ${err.message}`);
    return;
  }

  try {
    const debugRes = await axios.get(`${GRAPH_API_URL}/debug_token`, {
      params: { input_token: EN_TOKEN, access_token: EN_TOKEN },
    });
    const data = debugRes.data.data;
    console.log("\n🔍 EN Token detayları:");
    console.log(`   Geçerli: ${data.is_valid ? "✅ EVET" : "❌ HAYIR"}`);
    console.log(`   Tip: ${data.type}`);
    if (data.scopes) {
      console.log(`   İzinler: ${data.scopes.join(", ")}`);
      const hasPublish = data.scopes.includes("pages_manage_posts");
      const hasRead = data.scopes.includes("pages_read_engagement");
      console.log(`   pages_manage_posts: ${hasPublish ? "✅" : "❌ EKSİK"}`);
      console.log(`   pages_read_engagement: ${hasRead ? "✅" : "❌ EKSİK"}`);
    }
  } catch (err: any) {
    console.warn(
      "⚠️ EN Token debug alınamadı:",
      err?.response?.data?.error?.message || err.message,
    );
  }

  console.log("\n✅ Facebook EN token testi tamamlandı.");
}

testFacebookToken().catch(console.error);
