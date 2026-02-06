/**
 * Tumblr OAuth Token Generator
 *
 * Bu script Tumblr API için gerekli access token'ları almanı sağlar.
 * Lokal HTTP sunucusu kullanarak callback yakalar.
 *
 * KULLANIM:
 * 1. Önce https://www.tumblr.com/oauth/apps adresinden uygulama oluştur
 *    - Default callback URL: http://localhost:8888/callback
 * 2. Consumer Key ve Consumer Secret al
 * 3. Bu scripti çalıştır: npx tsx scripts/tumblr-get-token.ts
 * 4. Tarayıcıda açılan linke git ve yetkilendir
 * 5. Otomatik olarak token alınacak
 */

import * as http from "http";
import * as crypto from "crypto";
import * as readline from "readline";

// Tumblr OAuth 1.0a endpoints
const REQUEST_TOKEN_URL = "https://www.tumblr.com/oauth/request_token";
const AUTHORIZE_URL = "https://www.tumblr.com/oauth/authorize";
const ACCESS_TOKEN_URL = "https://www.tumblr.com/oauth/access_token";

// Local callback server
const CALLBACK_PORT = 8888;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// OAuth 1.0a signature generation
function generateOAuthSignature(
  method: string,
  baseUrl: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = "",
): string {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
    )
    .join("&");

  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(sortedParams),
  ].join("&");

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  return signature;
}

// Generate OAuth header
function generateOAuthHeader(params: Record<string, string>): string {
  return (
    "OAuth " +
    Object.keys(params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`,
      )
      .join(", ")
  );
}

async function getRequestToken(
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string,
): Promise<{ token: string; tokenSecret: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams: Record<string, string> = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_version: "1.0",
  };

  // Generate signature
  oauthParams.oauth_signature = generateOAuthSignature(
    "POST",
    REQUEST_TOKEN_URL,
    oauthParams,
    consumerSecret,
  );

  const response = await fetch(REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: generateOAuthHeader(oauthParams),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request token failed: ${response.status} - ${text}`);
  }

  const body = await response.text();
  const params = new URLSearchParams(body);

  return {
    token: params.get("oauth_token") || "",
    tokenSecret: params.get("oauth_token_secret") || "",
  };
}

async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string,
): Promise<{ token: string; tokenSecret: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: requestToken,
    oauth_verifier: verifier,
    oauth_version: "1.0",
  };

  // Generate signature
  oauthParams.oauth_signature = generateOAuthSignature(
    "POST",
    ACCESS_TOKEN_URL,
    oauthParams,
    consumerSecret,
    requestTokenSecret,
  );

  const response = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: generateOAuthHeader(oauthParams),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Access token failed: ${response.status} - ${text}`);
  }

  const body = await response.text();
  const params = new URLSearchParams(body);

  return {
    token: params.get("oauth_token") || "",
    tokenSecret: params.get("oauth_token_secret") || "",
  };
}

// Wait for OAuth callback
function waitForCallback(): Promise<{ token: string; verifier: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(
        req.url || "",
        `http://localhost:${CALLBACK_PORT}`,
      );

      if (reqUrl.pathname === "/callback") {
        const token = reqUrl.searchParams.get("oauth_token") || "";
        const verifier = reqUrl.searchParams.get("oauth_verifier") || "";

        // Send success response
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Tumblr Yetkilendirme Başarılı</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #001935 0%, #00253a 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 16px;
                backdrop-filter: blur(10px);
              }
              h1 { color: #00cf35; margin-bottom: 20px; }
              p { color: #ccc; }
              .emoji { font-size: 64px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="emoji">✅</div>
              <h1>Yetkilendirme Başarılı!</h1>
              <p>Bu pencereyi kapatabilirsiniz.</p>
              <p>Token bilgileri terminalde görünecek.</p>
            </div>
          </body>
          </html>
        `);

        // Close server and resolve
        server.close();
        resolve({ token, verifier });
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${CALLBACK_PORT} kullanımda. Başka bir uygulama kapatın veya portu değiştirin.`,
          ),
        );
      } else {
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, () => {
      console.log(
        `\n📡 Callback sunucusu başlatıldı: http://localhost:${CALLBACK_PORT}`,
      );
    });

    // Timeout after 5 minutes
    setTimeout(
      () => {
        server.close();
        reject(
          new Error("Zaman aşımı: 5 dakika içinde yetkilendirme yapılmadı."),
        );
      },
      5 * 60 * 1000,
    );
  });
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          📝 Tumblr OAuth Token Generator                   ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log("║  Bu araç Tumblr API için access token almanı sağlar.       ║");
  console.log("║                                                            ║");
  console.log("║  ÖNCEMLİKLE:                                               ║");
  console.log("║  https://www.tumblr.com/oauth/apps adresinden              ║");
  console.log("║  bir uygulama oluşturun.                                   ║");
  console.log("║                                                            ║");
  console.log("║  ⚠️  Default callback URL şu olmalı:                       ║");
  console.log(`║     ${CALLBACK_URL}                       ║`);
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n",
  );

  try {
    // Get credentials from user
    const consumerKey = await question(
      "🔑 Consumer Key (OAuth consumer key): ",
    );
    if (!consumerKey) {
      console.log("❌ Consumer Key gerekli!");
      process.exit(1);
    }

    const consumerSecret = await question("🔒 Consumer Secret: ");
    if (!consumerSecret) {
      console.log("❌ Consumer Secret gerekli!");
      process.exit(1);
    }

    console.log("\n⏳ Request token alınıyor...");

    // Get request token
    const requestToken = await getRequestToken(
      consumerKey,
      consumerSecret,
      CALLBACK_URL,
    );

    console.log("✅ Request token alındı!");

    // Generate authorization URL
    const authUrl = `${AUTHORIZE_URL}?oauth_token=${requestToken.token}`;

    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  🌐 Aşağıdaki linki tarayıcıda aç:                         ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝",
    );
    console.log(`\n${authUrl}\n`);
    console.log("1. Linke tıkla (veya kopyala-yapıştır)");
    console.log("2. Tumblr'a giriş yap");
    console.log("3. 'Allow' butonuna tıkla");
    console.log("4. Otomatik olarak token alınacak...\n");

    // Wait for callback
    console.log("⏳ Yetkilendirme bekleniyor...");
    const callbackData = await waitForCallback();

    console.log("\n✅ Callback alındı!");
    console.log("⏳ Access token alınıyor...");

    // Get access token
    const accessToken = await getAccessToken(
      consumerKey,
      consumerSecret,
      callbackData.token,
      requestToken.tokenSecret,
      callbackData.verifier,
    );

    // Display results
    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  ✅ TOKEN BAŞARIYLA ALINDI!                                ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝\n",
    );

    console.log("📋 Aşağıdaki değerleri .env dosyasına ekle:\n");
    console.log("─".repeat(60));
    console.log(`TUMBLR_ENABLED=true`);
    console.log(`TUMBLR_CONSUMER_KEY=${consumerKey}`);
    console.log(`TUMBLR_CONSUMER_SECRET=${consumerSecret}`);
    console.log(`TUMBLR_ACCESS_TOKEN=${accessToken.token}`);
    console.log(`TUMBLR_ACCESS_TOKEN_SECRET=${accessToken.tokenSecret}`);
    console.log(`TUMBLR_BLOG_NAME=yourblogname`);
    console.log("─".repeat(60));

    console.log("\n⚠️  TUMBLR_BLOG_NAME değerini kendi blog adınla değiştir!");
    console.log("    Örnek: aihaberleri (aihaberleri.tumblr.com için)\n");
  } catch (error: any) {
    console.error("\n❌ Hata:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
