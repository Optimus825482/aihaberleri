import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { generateSpeech, isValidVoice, getAllowedVoices } from "@/lib/edge-tts";
import { getRedis } from "@/lib/redis";
import {
  checkTTSRateLimit,
  getSimpleRateLimitHeaders as getRateLimitHeaders,
  TTS_RATE_LIMIT,
} from "@/lib/rate-limiter";
import { Errors, handleApiError } from "@/lib/errors";

// ============================================
// CACHE CONFIGURATION
// ============================================
const CACHE_TTL_SECONDS = 72 * 60 * 60; // 72 hours — haberler günlerce aynı, gereksiz regeneration'ı önle
const CACHE_PREFIX = "tts:cache:";
const MAX_CACHE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB - TTS audio genelde 700KB-3MB arası
const MAX_TTS_CACHE_COUNT = 200; // Max cached TTS entries (~200 * 1.5MB avg = ~300MB safe limit)

// ============================================
// IN-FLIGHT DEDUPLICATION
// Aynı cache key için eşzamanlı isteklerde tek Azure çağrısı yapılır
// ============================================
const inFlightRequests = new Map<
  string,
  Promise<{ audio: Buffer; metadata: unknown[] }>
>();

// ============================================
// CONCURRENCY LIMITER — max 3 simultaneous TTS generations
// Python process spawn CPU-intensive, bunu sınırla
// ============================================
let activeTTSGenerations = 0;
const MAX_CONCURRENT_TTS = 3;
const TTS_QUEUE_TIMEOUT_MS = 15_000; // 15s max bekleme

function waitForTTSSlot(): Promise<void> {
  if (activeTTSGenerations < MAX_CONCURRENT_TTS) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (activeTTSGenerations < MAX_CONCURRENT_TTS) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > TTS_QUEUE_TIMEOUT_MS) {
        clearInterval(interval);
        reject(new Error("TTS generation queue timeout — server busy"));
      }
    }, 200);
  });
}

function expandCommonAcronyms(text: string, voice?: string): string {
  const isTurkishVoice = voice?.toLowerCase().startsWith("tr-") ?? false;

  if (isTurkishVoice) {
    return text
      .replace(/\bAI\b/gi, " yapay zeka ")
      .replace(/\bLLM\b/gi, " büyük dil modeli ")
      .replace(/\bRAG\b/gi, " retrieval augmented generation ")
      .replace(/\bAPI\b/gi, " api ")
      .replace(/\bGPU\b/gi, " ekran kartı işlemcisi ")
      .replace(/\bCPU\b/gi, " işlemci ")
      .replace(/\bUI\b/gi, " kullanıcı arayüzü ")
      .replace(/\bUX\b/gi, " kullanıcı deneyimi ")
      .replace(/\bML\b/gi, " makine öğrenmesi ")
      .replace(/\bNLP\b/gi, " doğal dil işleme ");
  }

  return text
    .replace(/\bAI\b/gi, " artificial intelligence ")
    .replace(/\bLLM\b/gi, " large language model ")
    .replace(/\bRAG\b/gi, " retrieval augmented generation ")
    .replace(/\bAPI\b/gi, " API ")
    .replace(/\bGPU\b/gi, " graphics processing unit ")
    .replace(/\bCPU\b/gi, " central processing unit ")
    .replace(/\bUI\b/gi, " user interface ")
    .replace(/\bUX\b/gi, " user experience ")
    .replace(/\bML\b/gi, " machine learning ")
    .replace(/\bNLP\b/gi, " natural language processing ");
}

function normalizeTTSInput(text: string, voice?: string): string {
  return expandCommonAcronyms(text, voice)
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\*\*|__|`|#+/g, " ")
    .replace(/\s*[-•]\s+/g, ". ")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate cache key from text and voice using MD5 hash
 */
function generateCacheKey(text: string, voice: string): string {
  const hash = createHash("md5").update(`${text}:${voice}`).digest("hex");
  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Get real client IP from request headers
 * Cloudflare arkasında cf-connecting-ip gerçek kullanıcı IP'sini verir
 * x-forwarded-for'daki IP'ler Cloudflare proxy IP'leridir
 */
function getClientIP(req: NextRequest): string {
  // Cloudflare'ın gerçek kullanıcı IP header'ı (en güvenilir)
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);

  try {
    // ============================================
    // RATE LIMITING CHECK
    // ============================================
    const rateLimitResult = await checkTTSRateLimit(clientIP);

    if (!rateLimitResult.success) {
      console.log(`[TTS POST] Rate limit exceeded for IP: ${clientIP}`);
      throw Errors.rateLimit(
        `Rate limit exceeded. Try again in ${rateLimitResult.resetInSeconds} seconds.`,
      );
    }

    const { text, voice = "tr-TR-AhmetNeural" } = await req.json();

    if (!text) {
      throw Errors.validation("Text is required", { field: "text" });
    }

    // ============================================
    // VOICE VALIDATION
    // ============================================
    if (!isValidVoice(voice)) {
      console.log(`[TTS POST] Invalid voice rejected: ${voice}`);
      throw Errors.validation("Invalid voice", {
        field: "voice",
        allowedVoices: getAllowedVoices(),
      });
    }

    // High limit for POST (10000 chars — haberlerin sonuna kadar seslendirilmesi için)
    const cleanText = normalizeTTSInput(text, voice).slice(0, 10000);
    console.log(
      `[TTS POST] Processing ${cleanText.length} chars, voice=${voice}, IP=${clientIP}`,
    );

    // ============================================
    // REDIS CACHE CHECK
    // ============================================
    const redis = getRedis();
    const cacheKey = generateCacheKey(cleanText, voice);

    if (redis) {
      try {
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
          console.log(`[TTS POST] CACHE HIT: ${cacheKey}`);
          const parsed = JSON.parse(cachedData);
          return NextResponse.json(parsed, {
            headers: {
              "X-Cache": "HIT",
              ...getRateLimitHeaders(rateLimitResult, TTS_RATE_LIMIT.limit),
            },
          });
        }

        console.log(`[TTS POST] CACHE MISS: ${cacheKey}`);
      } catch (cacheError) {
        console.error(`[TTS POST] Cache read error:`, cacheError);
        // Continue without cache
      }
    }

    // ============================================
    // GENERATE SPEECH (with in-flight deduplication)
    // ============================================
    let audio: Buffer;
    let metadata: unknown[];
    let isOriginalGenerator = false;

    const existingRequest = inFlightRequests.get(cacheKey);
    if (existingRequest) {
      // Aynı içerik zaten üretiliyor — bekle, tekrar Azure çağrısı yapma
      console.log(
        `[TTS POST] IN-FLIGHT HIT: ${cacheKey} — reusing active generation`,
      );
      const result = await existingRequest;
      audio = result.audio;
      metadata = result.metadata;
    } else {
      // Concurrency slot bekle — max 3 simultaneous Python process
      await waitForTTSSlot();
      activeTTSGenerations++;

      // Yeni üretim başlat ve map'e kaydet
      isOriginalGenerator = true;
      const generationPromise = generateSpeech({
        text: cleanText,
        voice,
      });
      inFlightRequests.set(cacheKey, generationPromise);

      try {
        const result = await generationPromise;
        audio = result.audio;
        metadata = result.metadata;
      } finally {
        activeTTSGenerations--;
        inFlightRequests.delete(cacheKey);
      }
    }

    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    console.log(
      `[TTS POST] Success: ${audio.length} bytes, ${wordCount} words, ${metadata.length} boundaries${!isOriginalGenerator ? " (in-flight reuse)" : ""}`,
    );

    const responseData = {
      audio: audio.toString("base64"),
      metadata,
    };

    // ============================================
    // CACHE RESULT (sadece original generator yazar — in-flight bekleyenler YAZMAZ)
    // ============================================
    if (redis && isOriginalGenerator) {
      const cachePayload = JSON.stringify(responseData);
      const payloadSize = Buffer.byteLength(cachePayload);

      if (payloadSize > MAX_CACHE_SIZE_BYTES) {
        console.log(
          `[TTS POST] Cache SKIP: payload too large (${(payloadSize / 1024).toFixed(0)}KB > ${MAX_CACHE_SIZE_BYTES / 1024}KB)`,
        );
      } else {
        try {
          // Evict oldest TTS cache entries if count exceeds limit
          const existingKeys = await redis.keys(`${CACHE_PREFIX}*`);
          if (existingKeys.length >= MAX_TTS_CACHE_COUNT) {
            // Get TTLs to find entries closest to expiry (oldest)
            const keyTTLs = await Promise.all(
              existingKeys.map(async (k) => ({
                key: k,
                ttl: await redis.ttl(k),
              })),
            );
            keyTTLs.sort((a, b) => a.ttl - b.ttl); // lowest TTL = oldest
            const toDelete = keyTTLs.slice(
              0,
              existingKeys.length - MAX_TTS_CACHE_COUNT + 10,
            ); // free 10 slots
            if (toDelete.length > 0) {
              await redis.del(...toDelete.map((d) => d.key));
              console.log(
                `[TTS POST] Evicted ${toDelete.length} old TTS cache entries`,
              );
            }
          }

          await redis.setex(cacheKey, CACHE_TTL_SECONDS, cachePayload);
          console.log(
            `[TTS POST] Cached ${(payloadSize / 1024).toFixed(0)}KB with TTL ${CACHE_TTL_SECONDS}s`,
          );
        } catch (cacheError) {
          console.error(`[TTS POST] Cache write error:`, cacheError);
        }
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        "X-Cache": isOriginalGenerator ? "MISS" : "IN-FLIGHT",
        ...getRateLimitHeaders(rateLimitResult, TTS_RATE_LIMIT.limit),
      },
    });
  } catch (error) {
    // Client bağlantıyı kapattıysa sessizce logla (abort = normal durum)
    if (error instanceof Error && error.message === "aborted") {
      console.log(
        `[TTS POST] Client disconnected before response, IP=${clientIP}`,
      );
      return new Response(null, { status: 499 }); // Client Closed Request
    }
    return handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      {
        endpoint: "/api/tts",
        method: "POST",
        clientIP,
      },
    );
  }
}

export async function GET(req: NextRequest) {
  const clientIP = getClientIP(req);

  try {
    // ============================================
    // RATE LIMITING CHECK
    // ============================================
    const rateLimitResult = await checkTTSRateLimit(clientIP);

    if (!rateLimitResult.success) {
      console.log(`[TTS GET] Rate limit exceeded for IP: ${clientIP}`);
      throw Errors.rateLimit(
        `Rate limit exceeded. Try again in ${rateLimitResult.resetInSeconds} seconds.`,
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const text = searchParams.get("text");
    const voice = searchParams.get("voice") || "tr-TR-AhmetNeural";

    if (!text || text.length > 300) {
      throw Errors.validation("Please use POST for long texts", {
        field: "text",
        maxLength: 300,
      });
    }

    // ============================================
    // VOICE VALIDATION
    // ============================================
    if (!isValidVoice(voice)) {
      console.log(`[TTS GET] Invalid voice rejected: ${voice}`);
      throw Errors.validation("Invalid voice", {
        field: "voice",
        allowedVoices: getAllowedVoices(),
      });
    }

    // ============================================
    // REDIS CACHE CHECK
    // ============================================
    const redis = getRedis();
    const cleanText = normalizeTTSInput(text, voice).slice(0, 300);
    const cacheKey = generateCacheKey(cleanText, voice);

    if (redis) {
      try {
        const cachedAudio = await redis.getBuffer(`${cacheKey}:audio`);

        if (cachedAudio) {
          console.log(`[TTS GET] CACHE HIT: ${cacheKey}`);
          return new Response(cachedAudio as any, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=86400",
              "X-Cache": "HIT",
              ...getRateLimitHeaders(rateLimitResult, TTS_RATE_LIMIT.limit),
            },
          });
        }

        console.log(`[TTS GET] CACHE MISS: ${cacheKey}`);
      } catch (cacheError) {
        console.error(`[TTS GET] Cache read error:`, cacheError);
      }
    }

    const { audio } = await generateSpeech({ text: cleanText, voice });

    // ============================================
    // CACHE RESULT
    // ============================================
    if (redis) {
      try {
        await redis.setex(`${cacheKey}:audio`, CACHE_TTL_SECONDS, audio);
        console.log(`[TTS GET] Cached audio with TTL ${CACHE_TTL_SECONDS}s`);
      } catch (cacheError) {
        console.error(`[TTS GET] Cache write error:`, cacheError);
      }
    }

    return new Response(audio as any, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Cache": "MISS",
        ...getRateLimitHeaders(rateLimitResult, TTS_RATE_LIMIT.limit),
      },
    });
  } catch (error) {
    // Client bağlantıyı kapattıysa sessizce logla
    if (error instanceof Error && error.message === "aborted") {
      console.log(
        `[TTS GET] Client disconnected before response, IP=${clientIP}`,
      );
      return new Response(null, { status: 499 });
    }
    return handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      {
        endpoint: "/api/tts",
        method: "GET",
        clientIP,
      },
    );
  }
}
