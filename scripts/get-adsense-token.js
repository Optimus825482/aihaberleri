/**
 * AdSense OAuth 2.0 Refresh Token Alma Script'i
 * Kullanım: node scripts/get-adsense-token.js
 */

const { google } = require("googleapis");
const http = require("http");
const { exec } = require("child_process");

const CLIENT_ID =
  "380820887168-i2t32uqfa3mu4kctrrtk75b4jh74g95f.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:3001/oauth/callback";

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

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.url.startsWith("/oauth/callback")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const url = new URL(req.url, "http://localhost:3001");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Hata: " + error + "</h1>");
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Kod bulunamadi</h1>");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>Basarili!</h1><p>Terminale bak. Bu sayfayi kapatabilirsin.</p>",
    );

    console.log("\n=== BASARILI ===\n");
    console.log("Refresh Token:", tokens.refresh_token);
    console.log("\n.env dosyana sunlari ekle:\n");
    console.log("ADSENSE_OAUTH_CLIENT_ID=" + CLIENT_ID);
    console.log("ADSENSE_OAUTH_CLIENT_SECRET=" + CLIENT_SECRET);
    console.log("ADSENSE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Token hatasi</h1><p>" + err.message + "</p>");
    console.error("\nToken hatasi:", err.message);
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 1000);
  }
});

server.listen(3001, () => {
  console.log("\n=== AdSense OAuth Token Alma ===\n");
  console.log("Tarayici aciliyor...\n");
  const cmd = process.platform === "win32" ? "start" : "open";
  exec(cmd + ' "' + authUrl + '"', (err) => {
    if (err) {
      console.log("Tarayici acilamadi. Bu URL'yi manuel ac:\n");
      console.log(authUrl);
    }
  });
});
