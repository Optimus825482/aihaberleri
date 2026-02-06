/**
 * 🎙️ Podcast Service
 *
 * Günün haberlerinden otomatik podcast üretir.
 * Desteklenen TTS Motorları:
 * - Edge-TTS (Mevcut, düşük kalite)
 * - XTTS v2 via Modal.com (Yüksek kalite, ücretsiz GPU)
 * - XTTS v2 via Colab (Manuel çalıştırma)
 */

import { prisma } from "@/lib/prisma";
import { generateSpeech } from "@/lib/edge-tts";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface PodcastConfig {
  /** Podcast başlığı */
  title?: string;
  /** Kaç haber dahil edilecek */
  articleCount?: number;
  /** TTS motoru */
  engine?: "edge-tts" | "modal" | "external";
  /** Dil */
  language?: "tr" | "en";
  /** Modal API URL (engine: modal için) */
  modalApiUrl?: string;
  /** Harici ses URL'i (engine: external için) */
  externalAudioUrl?: string;
}

export interface PodcastResult {
  success: boolean;
  podcastId?: string;
  audioPath?: string;
  audioUrl?: string;
  duration?: number;
  script?: string;
  error?: string;
}

const DEFAULT_CONFIG: Required<PodcastConfig> = {
  title: "AI Haberleri Günlük Podcast",
  articleCount: 5,
  engine: "edge-tts",
  language: "tr",
  modalApiUrl: process.env.MODAL_PODCAST_URL || "",
  externalAudioUrl: "",
};

/**
 * Günün haberlerinden podcast scripti oluştur
 */
export async function createPodcastScript(
  articleCount: number = 5,
  language: "tr" | "en" = "tr",
): Promise<string> {
  // Günün haberlerini al
  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      language: language === "tr" ? "tr" : "en",
    },
    orderBy: { publishedAt: "desc" },
    take: articleCount,
    select: {
      title: true,
      summary: true,
      content: true,
    },
  });

  if (articles.length === 0) {
    throw new Error("No published articles found for podcast");
  }

  const today = new Date().toLocaleDateString(
    language === "tr" ? "tr-TR" : "en-US",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  // Podcast scripti oluştur
  const intro =
    language === "tr"
      ? `Merhaba, AI Haberleri podcast'ine hoş geldiniz. Ben yapay zeka asistanınız. Bugün ${today}, sizler için günün en önemli yapay zeka haberlerini derledim.`
      : `Hello and welcome to AI News podcast. I'm your AI assistant. Today is ${today}, and I've gathered the most important AI news for you.`;

  const outro =
    language === "tr"
      ? `Bu günkü haberlerimiz bu kadardı. Bizi dinlediğiniz için teşekkür ederiz. Yarın yeni haberlerle tekrar görüşmek üzere, hoşça kalın!`
      : `That's all for today's news. Thank you for listening. See you tomorrow with more AI news. Goodbye!`;

  let script = intro + "\n\n";

  articles.forEach((article, index) => {
    const newsLabel =
      language === "tr" ? `Haber ${index + 1}` : `News ${index + 1}`;
    const summary = article.summary || article.content?.slice(0, 400) || "";

    script += `${newsLabel}: ${article.title}.\n`;
    script += `${summary}\n\n`;
  });

  script += outro;

  return script;
}

/**
 * Edge-TTS ile ses üret (düşük kalite ama hızlı)
 */
async function generateWithEdgeTTS(
  script: string,
  language: "tr" | "en",
): Promise<Buffer> {
  const voice = language === "tr" ? "tr-TR-AhmetNeural" : "en-US-GuyNeural";

  const result = await generateSpeech({
    text: script,
    voice,
  });

  return result.audio;
}

/**
 * Modal.com API ile ses üret (yüksek kalite)
 */
async function generateWithModal(
  script: string,
  apiUrl: string,
): Promise<Buffer> {
  if (!apiUrl) {
    throw new Error("Modal API URL is not configured");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: script,
      language: "tr",
    }),
  });

  if (!response.ok) {
    throw new Error(`Modal API error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Harici ses URL'inden indir
 */
async function downloadExternalAudio(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Podcast üret ve kaydet
 */
export async function generatePodcast(
  config: PodcastConfig = {},
): Promise<PodcastResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    console.log(`[Podcast] Generating with engine: ${finalConfig.engine}`);

    // 1. Script oluştur
    const script = await createPodcastScript(
      finalConfig.articleCount,
      finalConfig.language,
    );
    console.log(`[Podcast] Script created: ${script.length} chars`);

    // 2. Ses üret
    let audioBuffer: Buffer;

    switch (finalConfig.engine) {
      case "edge-tts":
        audioBuffer = await generateWithEdgeTTS(script, finalConfig.language);
        break;

      case "modal":
        audioBuffer = await generateWithModal(script, finalConfig.modalApiUrl);
        break;

      case "external":
        if (!finalConfig.externalAudioUrl) {
          throw new Error("External audio URL is required");
        }
        audioBuffer = await downloadExternalAudio(finalConfig.externalAudioUrl);
        break;

      default:
        throw new Error(`Unknown engine: ${finalConfig.engine}`);
    }

    console.log(`[Podcast] Audio generated: ${audioBuffer.length} bytes`);

    // 3. Dosyayı kaydet
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const podcastId = crypto.randomUUID();
    const fileName = `podcast_${timestamp}.mp3`;
    const publicDir = path.join(process.cwd(), "public", "podcasts");

    await fs.mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, fileName);
    await fs.writeFile(filePath, audioBuffer);

    console.log(`[Podcast] Saved to: ${filePath}`);

    // 4. Veritabanına kaydet (opsiyonel - Podcast modeli varsa)
    // await prisma.podcast.create({ ... });

    return {
      success: true,
      podcastId,
      audioPath: filePath,
      audioUrl: `/podcasts/${fileName}`,
      script,
    };
  } catch (error) {
    console.error("[Podcast] Generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Podcast RSS feed oluştur (Apple Podcasts/Spotify için)
 */
export async function generatePodcastRSS(): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://aihaberleri.org";
  const podcastDir = path.join(process.cwd(), "public", "podcasts");

  let files: string[] = [];
  try {
    files = await fs.readdir(podcastDir);
  } catch {
    files = [];
  }

  const podcastFiles = files
    .filter((f) => f.endsWith(".mp3"))
    .sort()
    .reverse()
    .slice(0, 50); // Son 50 episode

  const items = podcastFiles
    .map((file, index) => {
      const date = file.match(/podcast_(\d{4})-(\d{2})-(\d{2})/);
      const pubDate = date
        ? new Date(`${date[1]}-${date[2]}-${date[3]}`).toUTCString()
        : new Date().toUTCString();

      return `
    <item>
      <title>AI Haberleri - Bölüm ${podcastFiles.length - index}</title>
      <description>Günün yapay zeka haberleri</description>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${baseUrl}/podcasts/${file}" type="audio/mpeg" />
      <guid>${baseUrl}/podcasts/${file}</guid>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>AI Haberleri Podcast</title>
    <description>Türkiye'nin yapay zeka haber platformu - Günlük AI haberleri</description>
    <link>${baseUrl}</link>
    <language>tr</language>
    <itunes:author>AI Haberleri</itunes:author>
    <itunes:category text="Technology" />
    <itunes:image href="${baseUrl}/images/podcast-cover.png" />
    ${items}
  </channel>
</rss>`;
}
