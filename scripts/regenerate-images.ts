/**
 * Regenerate Missing Images for TR Articles
 *
 * Flow per article:
 * 1. Generate image prompt from title via DeepSeek
 * 2. Fetch image from Pollinations.ai (authenticated, flux model)
 * 3. Download, optimize with sharp (4 sizes: large/medium/small/thumb)
 * 4. Upload to Cloudflare R2
 * 5. Update Article DB record
 *
 * Pollinations Rate Limit: With API key ~10 req/min safe
 * We process 1 at a time with configurable delay (default 8s)
 *
 * Usage: npx tsx scripts/regenerate-images.ts
 *   --start=N       Resume from index N
 *   --delay=N       Delay between images in ms (default: 8000)
 *   --dry-run       Preview without changes
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import axios from "axios";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-2750fa1691164dd2940c2ec3cb37d2e6";
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
const POLLINATIONS_API_KEY =
  process.env.POLLINATIONS_API_KEY || "pk_sET1VlYd117D84BM";
const POLLINATIONS_GEN_URL = "https://gen.pollinations.ai/image";

const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  "https://aeccc306d39052bd2f83982530dd11a5.r2.cloudflarestorage.com";
const R2_ACCESS_KEY_ID =
  process.env.R2_ACCESS_KEY_ID || "28a9b95872b15484627a7713c1b57998";
const R2_SECRET_ACCESS_KEY =
  process.env.R2_SECRET_ACCESS_KEY ||
  "a3ebac7f653609c7502a969952832681f98d6c114ce077085a2677dccd1de575";
const R2_BUCKET = process.env.R2_BUCKET || "aihaberleri-images";
const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL || "https://images.aihaberleri.org";

const START_INDEX = parseInt(
  process.argv.find((a) => a.startsWith("--start="))?.split("=")[1] || "0",
);
const DELAY = parseInt(
  process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1] || "2000",
);
const CONCURRENCY = parseInt(
  process.argv.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ||
    "4",
);
const DRY_RUN = process.argv.includes("--dry-run");

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const stats = {
  total: 0,
  generated: 0,
  failed: 0,
  skipped: 0,
  errors: [] as string[],
};

// Image sizes config
const IMAGE_SIZES = [
  { name: "large", width: 1200, height: 630 },
  { name: "medium", width: 800, height: 420 },
  { name: "small", width: 400, height: 210 },
  { name: "thumb", width: 200, height: 105 },
] as const;

// ============================================================================
// ADVANCED IMAGE PROMPT GENERATION VIA DEEPSEEK
// Enhanced version of the existing system with better variety & specificity
// ============================================================================

// Company → visual mapping for precise imagery
const COMPANY_VISUALS: Record<string, string> = {
  openai: "OpenAI logo on glass building facade, San Francisco skyline",
  google: "Google campus courtyard, colorful logo, Mountain View",
  microsoft: "Microsoft headquarters Redmond, glass towers, cloudy sky",
  apple: "Apple Park circular building aerial view, Cupertino",
  nvidia: "Nvidia H100 GPU array, green PCB, macro photography",
  tesla: "Tesla Gigafactory exterior, solar panels, desert landscape",
  meta: "Meta headquarters sign, Menlo Park campus",
  amazon: "Amazon Web Services data center exterior, industrial scale",
  anthropic: "Modern AI research lab, clean white interior, server racks",
  deepseek: "Chinese tech campus, modern architecture, AI research center",
  samsung: "Samsung semiconductor fab clean room, wafer processing",
  intel: "Intel chip wafer close-up, silicon die, blue lighting",
  amd: "AMD Ryzen processor macro shot, golden pins, red accent",
  qualcomm: "Qualcomm Snapdragon chip on circuit board, mobile tech",
  huawei: "Huawei R&D center, Shenzhen skyline, modern campus",
  bytedance: "ByteDance headquarters Beijing, modern tech office exterior",
  mistral: "European AI startup office, Paris architecture, modern interior",
};

// Topic → visual style mapping
const TOPIC_VISUALS: Record<string, string> = {
  robot:
    "humanoid robot in clean laboratory, white chassis, professional studio lighting, product photography",
  drone:
    "autonomous drone in flight against clear sky, propellers spinning, motion blur, editorial photo",
  chip: "silicon wafer with microprocessors, clean room macro photography, extreme detail, blue tint",
  gpu: "high-end graphics card array in server rack, RGB lighting, data center environment",
  quantum:
    "quantum computer cooling chamber, golden wiring, cryogenic tubes, IBM-style",
  ev: "electric vehicle charging port close-up, LED indicator glowing, modern design",
  satellite:
    "communication satellite orbiting Earth, solar panels deployed, space photography",
  server:
    "data center corridor, symmetric server racks, blue LED ambient, long perspective",
  vr: "VR headset on minimalist display stand, studio lighting, product shot",
  blockchain:
    "abstract blockchain visualization, interconnected nodes, dark background, cyan glow",
  cybersecurity:
    "digital security operations center, threat monitoring screens, dark room, blue glow",
  medical:
    "AI-powered medical imaging scanner, hospital technology room, clean white environment",
  education:
    "digital classroom with AI interface, interactive screens, modern learning space",
  autonomous:
    "self-driving car sensor array close-up, LIDAR spinning, urban environment",
  regulation:
    "European Parliament building exterior, Brussels, official architecture, overcast sky",
  startup:
    "modern tech startup lobby, glass and steel, minimalist design, venture capital aesthetic",
  funding:
    "stock exchange digital board, green numbers, financial district architecture",
  launch:
    "product reveal stage setup, dramatic spotlight, tech conference aesthetic, empty stage",
  acquisition:
    "corporate handshake sculpture, modern art installation, business district",
  layoff:
    "empty modern office floor, abandoned workstations, dramatic window light",
};

// Photography styles for variety
const PHOTO_STYLES = [
  "editorial photography, sharp focus, natural lighting",
  "cinematic composition, dramatic lighting, 8k resolution",
  "photojournalistic style, candid angle, high contrast",
  "architectural photography, symmetrical, golden hour",
  "macro photography, extreme detail, shallow depth of field",
  "aerial perspective, drone shot, wide angle",
  "studio product photography, clean background, professional",
  "documentary style, authentic, high dynamic range",
];

async function generateImagePrompt(
  title: string,
  content: string,
  categorySlug: string,
): Promise<string> {
  const combinedText = `${title} ${content.substring(0, 600)}`.toLowerCase();

  // Pre-detect entities for context
  const detectedCompanies: string[] = [];
  for (const [company, visual] of Object.entries(COMPANY_VISUALS)) {
    const regex = new RegExp(`\\b${company}\\b`, "i");
    if (regex.test(combinedText)) {
      detectedCompanies.push(company);
    }
  }

  const detectedTopics: string[] = [];
  for (const [topic] of Object.entries(TOPIC_VISUALS)) {
    if (combinedText.includes(topic)) {
      detectedTopics.push(topic);
    }
  }

  // Pick a random photo style for variety
  const styleIdx = Math.floor(Math.random() * PHOTO_STYLES.length);
  const photoStyle = PHOTO_STYLES[styleIdx];

  // Build entity context for DeepSeek
  const entityHints: string[] = [];
  if (detectedCompanies.length > 0) {
    entityHints.push(
      `DETECTED COMPANIES: ${detectedCompanies.join(", ").toUpperCase()}`,
    );
    entityHints.push(
      `SUGGESTED VISUAL: ${COMPANY_VISUALS[detectedCompanies[0]]}`,
    );
  }
  if (detectedTopics.length > 0) {
    entityHints.push(
      `DETECTED TOPICS: ${detectedTopics.join(", ").toUpperCase()}`,
    );
    entityHints.push(`SUGGESTED VISUAL: ${TOPIC_VISUALS[detectedTopics[0]]}`);
  }

  const entityContext =
    entityHints.length > 0
      ? `\n\nKEY SUBJECTS:\n${entityHints.join("\n")}`
      : "";

  try {
    const resp = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are an award-winning news photographer creating image prompts for AI/tech news.
RULES:
- Return ONLY the prompt text, nothing else
- Max 140 characters
- NEVER include humans, faces, hands, body parts
- NEVER use generic "office" or "meeting room" scenes
- Be SPECIFIC to the news topic — reference actual products, buildings, devices
- End with ", no people, no humans"
- Use this photography style: ${photoStyle}`,
          },
          {
            role: "user",
            content: `Create a unique, specific image prompt for this news:

TITLE: ${title}
CATEGORY: ${categorySlug}
CONTENT PREVIEW: ${content.substring(0, 400)}
${entityContext}

PRIORITY ORDER:
1. If company detected → show their iconic product/building/logo
2. If specific tech detected → show that technology close-up
3. If event type detected → show symbolic representation
4. Fallback → abstract tech visualization related to topic

RETURN ONLY THE PROMPT.`,
          },
        ],
        temperature: 1.0, // High for variety
        max_tokens: 150,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 20000,
      },
    );

    let prompt = (resp.data.choices[0]?.message?.content || "").trim();

    // Clean up
    prompt = prompt.replace(/^["']|["']$/g, "");
    prompt = prompt.replace(/<[^>]+>/g, "").trim();

    // Extract last line if multi-line
    if (prompt.includes("\n")) {
      const lines = prompt.split("\n").filter((l: string) => l.trim());
      prompt = lines[lines.length - 1] || prompt;
    }

    // Remove human references that AI might sneak in
    prompt = prompt
      .replace(
        /\b(person|people|man|woman|human|face|portrait|silhouette|figure|employee|worker|user|staff|businessman|businesswoman|executive|ceo|head|hand|arm|finger|eye)\b/gi,
        "",
      )
      .replace(/\s+/g, " ")
      .replace(/\s,/g, ",")
      .trim();

    // Ensure no-humans suffix
    if (!prompt.toLowerCase().includes("no people")) {
      prompt += ", no people, no humans";
    }

    // Length check
    if (prompt.length > 200) {
      prompt = prompt.substring(0, 197) + "...";
    }

    // Fallback if too short or empty
    if (!prompt || prompt.length < 20) {
      return buildFallbackPrompt(title, detectedCompanies, detectedTopics);
    }

    return prompt;
  } catch {
    return buildFallbackPrompt(title, detectedCompanies, detectedTopics);
  }
}

function buildFallbackPrompt(
  title: string,
  companies: string[],
  topics: string[],
): string {
  if (companies.length > 0 && COMPANY_VISUALS[companies[0]]) {
    return `${COMPANY_VISUALS[companies[0]]}, editorial photography, no people, no humans`;
  }
  if (topics.length > 0 && TOPIC_VISUALS[topics[0]]) {
    return `${TOPIC_VISUALS[topics[0]]}, no people, no humans`;
  }
  // Generic tech fallback
  const keywords = title.substring(0, 60).replace(/[^\w\s]/g, "");
  return `modern technology concept related to ${keywords}, clean design, professional photography, no people, no humans`;
}

// ============================================================================
// FETCH IMAGE FROM POLLINATIONS
// ============================================================================

async function fetchImage(prompt: string): Promise<Buffer> {
  const cleanPrompt = prompt.replace(/[^\w\s,.-]/g, " ").substring(0, 200);
  const encodedPrompt = encodeURIComponent(cleanPrompt);

  const params = new URLSearchParams({
    width: "1200",
    height: "630",
    model: "flux",
    enhance: "true",
    nologo: "true",
    safe: "true",
  });

  const url = `${POLLINATIONS_GEN_URL}/${encodedPrompt}?${params.toString()}`;

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000, // 2 min timeout — Pollinations can be slow
    headers: {
      Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
    },
  });

  if (response.status !== 200) {
    throw new Error(`Pollinations HTTP ${response.status}`);
  }

  return Buffer.from(response.data);
}

// ============================================================================
// OPTIMIZE & UPLOAD TO R2
// ============================================================================

async function optimizeAndUpload(
  imageBuffer: Buffer,
  slug: string,
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};

  for (const size of IMAGE_SIZES) {
    const optimized = await sharp(imageBuffer)
      .resize(size.width, size.height, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `${slug}-${size.name}.webp`;

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: optimized,
        ContentType: "image/webp",
      }),
    );

    urls[size.name] = `${R2_PUBLIC_URL}/${key}`;
  }

  return urls;
}

// ============================================================================
// PROCESS SINGLE ARTICLE
// ============================================================================

async function processArticle(
  article: {
    id: string;
    slug: string;
    title: string;
    content: string;
    category: { slug: string } | null;
  },
  index: number,
): Promise<boolean> {
  const label = `[${index + 1}/${stats.total}]`;

  try {
    console.log(`${label} 🎨 ${article.title.substring(0, 55)}...`);

    // 1. Generate prompt
    const prompt = await generateImagePrompt(
      article.title,
      article.content || "",
      article.category?.slug || "teknoloji",
    );
    console.log(`  📝 Prompt: ${prompt.substring(0, 80)}...`);

    if (DRY_RUN) {
      console.log(`${label} ✅ [DRY] Would generate image`);
      stats.generated++;
      return true;
    }

    // 2. Fetch from Pollinations
    console.log(`  🖼️  Pollinations'tan görsel alınıyor...`);
    const imageBuffer = await fetchImage(prompt);
    console.log(`  📦 ${(imageBuffer.length / 1024).toFixed(0)}KB indirildi`);

    // 3. Optimize & upload to R2
    console.log(`  ☁️  R2'ye yükleniyor (4 boyut)...`);
    const urls = await optimizeAndUpload(imageBuffer, article.slug);

    // 4. Update DB
    await prisma.article.update({
      where: { id: article.id },
      data: {
        imageUrl: urls.large,
        imageUrlMedium: urls.medium,
        imageUrlSmall: urls.small,
        imageUrlThumb: urls.thumb,
      },
    });

    console.log(`${label} ✅ ${article.slug}`);
    stats.generated++;
    return true;
  } catch (e: any) {
    console.error(`${label} ❌ ${e.message}`);
    stats.errors.push(`${article.slug}: ${e.message}`);
    stats.failed++;
    return false;
  }
}

// ============================================================================
// CHECKPOINT
// ============================================================================

function saveCheckpoint(index: number) {
  fs.writeFileSync(
    "scripts/regenerate-images-checkpoint.json",
    JSON.stringify(
      { lastIndex: index, timestamp: new Date().toISOString(), stats },
      null,
      2,
    ),
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🖼️  Image Regeneration — Pollinations → R2 (PARALLEL)");
  console.log(
    `⚙️  Start: ${START_INDEX} | Concurrency: ${CONCURRENCY} | Delay: ${DELAY}ms | DryRun: ${DRY_RUN}`,
  );
  console.log("=".repeat(60));

  // Get articles without images
  const articles = await prisma.article.findMany({
    where: {
      language: "tr",
      OR: [{ imageUrl: null }, { imageUrl: "" }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      category: { select: { slug: true } },
    },
    orderBy: { publishedAt: "asc" },
  });

  stats.total = articles.length;
  console.log(`📰 Görselsiz makale: ${articles.length}`);
  console.log("=".repeat(60));

  if (articles.length === 0) {
    console.log("✅ Tüm makalelerde görsel var!");
    await prisma.$disconnect();
    return;
  }

  const toProcess = articles.slice(START_INDEX);
  const startTime = Date.now();

  // Process in parallel batches
  for (
    let batchStart = 0;
    batchStart < toProcess.length;
    batchStart += CONCURRENCY
  ) {
    const batch = toProcess.slice(batchStart, batchStart + CONCURRENCY);
    const batchNum = Math.floor(batchStart / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(toProcess.length / CONCURRENCY);

    console.log(
      `\n--- Batch ${batchNum}/${totalBatches} (${batch.length} paralel) ---`,
    );

    // Run batch in parallel
    const results = await Promise.allSettled(
      batch.map((article, i) =>
        processArticle(article, START_INDEX + batchStart + i),
      ),
    );

    // Count results
    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;
    const failed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && r.value === false),
    ).length;

    // Save checkpoint after each batch
    saveCheckpoint(START_INDEX + batchStart + batch.length);

    // Progress
    const processed = batchStart + batch.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = toProcess.length - processed;
    const eta = remaining / rate;
    console.log(
      `⏱️  ${processed}/${toProcess.length} | ${(rate * 60).toFixed(0)} img/dk | ✅${succeeded} ❌${failed} | ETA: ${Math.ceil(eta / 60)} dk`,
    );

    // Delay between batches (not between individual images)
    if (batchStart + CONCURRENCY < toProcess.length) {
      await new Promise((r) => setTimeout(r, DELAY));
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log("\n" + "=".repeat(60));
  console.log("📊 SONUÇLAR:");
  console.log(`  ✅ Oluşturulan: ${stats.generated}`);
  console.log(`  ❌ Başarısız: ${stats.failed}`);
  console.log(`  ⏱️  Süre: ${(totalTime / 60).toFixed(1)} dk`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ HATALAR (${stats.errors.length}):`);
    stats.errors.slice(0, 20).forEach((e) => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});
