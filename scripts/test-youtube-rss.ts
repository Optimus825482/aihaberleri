/**
 * Quick test: YouTube RSS feed + Data API v3 fallback
 * Usage: npx tsx scripts/test-youtube-rss.ts
 */
import axios from "axios";
import "dotenv/config";

const TEST_CHANNELS = [
  { id: "UChpleBmo18P08aKCIgti38g", name: "Matt Wolfe" },
  { id: "UCsBjURrPoezykLs9EqgamOA", name: "Fireship" },
  { id: "UCbfYPyITQ-7l4upoX8nvctg", name: "Two Minute Papers" },
  { id: "UCNJ1Ymd5yFuUPtn21xtRbbw", name: "AI Explained" },
  { id: "UCbY9xX3_jW5c2fjlZVBI4cg", name: "TheAIGRID" },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function testRSS(channelId: string) {
  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": UA },
      validateStatus: () => true,
    });
    const entries = (res.data?.match(/<entry>/g) || []).length;
    return { status: res.status, ok: res.status === 200, entries };
  } catch (err: any) {
    return { status: 0, ok: false, entries: 0 };
  }
}

async function testDataAPI(channelId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ok: false, reason: "NO_API_KEY", videos: 0 };
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&type=video&key=${apiKey}`;
    const res = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true,
    });
    if (res.status === 200) {
      return { ok: true, reason: "OK", videos: res.data?.items?.length || 0 };
    }
    const errMsg = res.data?.error?.message || `HTTP_${res.status}`;
    return { ok: false, reason: errMsg.substring(0, 60), videos: 0 };
  } catch (err: any) {
    return { ok: false, reason: err.message.substring(0, 60), videos: 0 };
  }
}

async function main() {
  console.log(`=== YouTube Feed Test === (${new Date().toISOString()})\n`);

  console.log("--- RSS Feed (videos.xml) ---");
  for (const ch of TEST_CHANNELS) {
    const r = await testRSS(ch.id);
    console.log(
      `  ${r.ok ? "✅" : "❌"} ${ch.name.padEnd(20)} status=${r.status} entries=${r.entries}`,
    );
  }

  console.log("\n--- YouTube Data API v3 ---");
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.log("  ⚠️  YOUTUBE_API_KEY not set in .env — skipping API test");
  } else {
    for (const ch of TEST_CHANNELS) {
      const r = await testDataAPI(ch.id);
      console.log(
        `  ${r.ok ? "✅" : "❌"} ${ch.name.padEnd(20)} ${r.reason} videos=${r.videos}`,
      );
    }
  }

  console.log("\nDone.");
}

main();
