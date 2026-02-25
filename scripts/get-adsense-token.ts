/**
 * AdSense OAuth 2.0 Refresh Token Alma Script'i
 *
 * Kullanım:
 *   npx ts-node scripts/get-adsense-token.ts
 *
 * Tarayıcıda açılan URL'ye git, izin ver — token otomatik alınır.
 */

import { google } from "googleapis";
import http from "http";
import { exec } from "child_process";

const CLIENT_ID =
  "380820887168-i2t32uqfa3mu4kctrrtk75b4jh74g95f.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:3000/oauth/callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/adsense.readonly"],
});

// Mini HTTP server — Google callback'i yakalar
const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth/callback")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const url = new URL(req.url, "http://localhost:3000");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Hata: ${error}</h1><p>Tarayıcıyı kapatabilirsin.</p>`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Kod bulunamadı</h1>");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>Başarılı!</h1><p>Refresh token alındı. Terminale bak. Bu sayfayı kapatabilirsin.</p>",
    );

    console.log("\n=== BAŞARILI ===\n");
    console.log("Refresh Token:", tokens.refresh_token);
    console.log("\n.env dosyana şunları ekle:\n");
    console.log(`ADSENSE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
    console.log(`ADSENSE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`ADSENSE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err: unknown) {
    const error = err as Error;
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Token alma hatası</h1><p>${error.message}</p>`);
    console.error("\nToken hatası:", error.message);
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 1000);
  }
});

server.listen(3000, () => {
  console.log("\n=== AdSense OAuth Token Alma ===\n");
  console.log("Tarayıcı açılıyor...\n");
  // Windows'ta start, macOS'ta open, Linux'ta xdg-open
  const cmd =
    process.platform === "win32"
      ? "start"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  exec(`${cmd} "${authUrl}"`, (err) => {
    if (err) {
      console.log("Tarayıcı açılamadı. Bu URL'yi manuel aç:\n");
      console.log(authUrl);
    }
  });
});
