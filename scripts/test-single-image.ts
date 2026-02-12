/**
 * Test: Tek bir makale için prompt üret + Pollinations'tan görsel al + locale kaydet
 * Usage: npx tsx scripts/test-single-image.ts
 */

import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as fs from "fs";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-2750fa1691164dd2940c2ec3cb37d2e6";
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
const POLLINATIONS_API_KEY =
  process.env.POLLINATIONS_API_KEY || "pk_sET1VlYd117D84BM";

const prisma = new PrismaClient();

// ---- Prompt generation (same logic as regenerate-images.ts) ----

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

const TOPIC_VISUALS: Record<string, string> = {
  robot:
    "humanoid robot in clean laboratory, white chassis, professional studio lighting",
  chip: "silicon wafer with microprocessors, clean room macro photography, blue tint",
  gpu: "high-end graphics card array in server rack, RGB lighting, data center",
  quantum: "quantum computer cooling chamber, golden wiring, cryogenic tubes",
  server: "data center corridor, symmetric server racks, blue LED ambient",
  cybersecurity:
    "digital security operations center, threat monitoring screens, dark room",
  startup: "modern tech startup lobby, glass and steel, minimalist design",
};

const PHOTO_STYLES = [
  "editorial photography, sharp focus, natural lighting",
  "cinematic composition, dramatic lighting, 8k resolution",
  "photojournalistic style, candid angle, high contrast",
  "architectural photography, symmetrical, golden hour",
  "macro photography, extreme detail, shallow depth of field",
  "studio product photography, clean background, professional",
];

async function generateImagePrompt(
  title: string,
  content: string,
  categorySlug: string,
): Promise<string> {
  const combinedText = `${title} ${content.substring(0, 600)}`.toLowerCase();

  const detectedCompanies: string[] = [];
  for (const [company] of Object.entries(COMPANY_VISUALS)) {
    const regex = new RegExp(`\\b${company}\\b`, "i");
    if (regex.test(combinedText)) detectedCompanies.push(company);
  }

  const detectedTopics: string[] = [];
  for (const [topic] of Object.entries(TOPIC_VISUALS)) {
    if (combinedText.includes(topic)) detectedTopics.push(topic);
  }

  const photoStyle =
    PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];

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
- Be SPECIFIC to the news topic
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
        temperature: 1.0,
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
    prompt = prompt
      .replace(/^["']|["']$/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (prompt.includes("\n")) {
      const lines = prompt.split("\n").filter((l: string) => l.trim());
      prompt = lines[lines.length - 1] || prompt;
    }
    prompt = prompt
      .replace(
        /\b(person|people|man|woman|human|face|portrait|silhouette|figure|employee|worker|user|staff|businessman|businesswoman|executive|ceo|head|hand|arm|finger|eye)\b/gi,
        "",
      )
      .replace(/\s+/g, " ")
      .replace(/\s,/g, ",")
      .trim();
    if (!prompt.toLowerCase().includes("no people"))
      prompt += ", no people, no humans";
    if (prompt.length > 200) prompt = prompt.substring(0, 197) + "...";
    if (!prompt || prompt.length < 20) {
      return `modern AI technology concept, clean design, professional photography, no people, no humans`;
    }
    return prompt;
  } catch (e: any) {
    console.error("DeepSeek error:", e.message);
    return `modern AI technology concept, clean design, professional photography, no people, no humans`;
  }
}

async function main() {
  console.log("🧪 Tek makale test — prompt üret + görsel indir\n");

  // DB'den görselsiz bir makale al
  const article = await prisma.article.findFirst({
    where: { language: "tr", OR: [{ imageUrl: null }, { imageUrl: "" }] },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      category: { select: { slug: true } },
    },
    orderBy: { publishedAt: "asc" },
    skip: Math.floor(Math.random() * 100), // Rastgele bir makale seç
  });

  if (!article) {
    console.log("❌ Görselsiz makale bulunamadı!");
    await prisma.$disconnect();
    return;
  }

  console.log(`📰 Makale: ${article.title}`);
  console.log(`🏷️  Slug: ${article.slug}`);
  console.log(`📂 Kategori: ${article.category?.slug || "yok"}`);
  console.log(`📝 İçerik: ${(article.content || "").substring(0, 120)}...\n`);

  // 1. Prompt üret
  console.log("🤖 DeepSeek'ten prompt üretiliyor...");
  const prompt = await generateImagePrompt(
    article.title,
    article.content || "",
    article.category?.slug || "teknoloji",
  );
  console.log(`📝 Prompt: ${prompt}\n`);

  // 2. Pollinations'tan görsel al
  console.log("🖼️  Pollinations'tan görsel alınıyor...");
  const encodedPrompt = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width: "1200",
    height: "630",
    model: "flux",
    enhance: "true",
  });

  const imageUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?${params.toString()}`;
  console.log(`🔗 URL: ${imageUrl.substring(0, 120)}...`);

  const resp = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 120000,
    headers: {
      Accept: "image/*",
      Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
    },
  });

  const buffer = Buffer.from(resp.data);
  console.log(`📦 İndirilen: ${(buffer.length / 1024).toFixed(0)} KB`);

  // 3. Locale kaydet
  const outPath = `scripts/test-image-${article.slug.substring(0, 40)}.png`;
  fs.writeFileSync(outPath, buffer);
  console.log(`\n✅ Kaydedildi: ${outPath}`);
  console.log(`📐 Boyut: ${(buffer.length / 1024).toFixed(0)} KB`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Hata:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
