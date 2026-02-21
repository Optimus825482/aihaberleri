import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { generateSpeech, isValidVoice, getAllowedVoices } from "@/lib/edge-tts";
import { getRedis } from "@/lib/redis";
import {
  checkTTSRateLimit,
  getRateLimitHeaders,
  TTS_RATE_LIMIT,
} from "@/lib/rate-limit";
import { Errors, handleApiError } from "@/lib/errors";

// ============================================
// CACHE CONFIGURATION
// ============================================
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const CACHE_PREFIX = "tts:cache:";

function normalizeTTSInput(text: string): string {
  return text
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
 * Get client IP from request headers
 */
function getClientIP(req: NextRequest): string {
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

    // High limit for POST
    const cleanText = normalizeTTSInput(text).slice(0, 4000);
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
    // GENERATE SPEECH
    // ============================================
    const { audio, metadata } = await generateSpeech({
      text: cleanText,
      voice,
    });

    console.log(
      `[TTS POST] Success: ${audio.length} bytes, ${metadata.length} words`,
    );

    const responseData = {
      audio: audio.toString("base64"),
      metadata,
    };

    // ============================================
    // CACHE RESULT
    // ============================================
    if (redis) {
      try {
        await redis.setex(
          cacheKey,
          CACHE_TTL_SECONDS,
          JSON.stringify(responseData),
        );
        console.log(`[TTS POST] Cached result with TTL ${CACHE_TTL_SECONDS}s`);
      } catch (cacheError) {
        console.error(`[TTS POST] Cache write error:`, cacheError);
        // Continue without caching
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        "X-Cache": "MISS",
        ...getRateLimitHeaders(rateLimitResult, TTS_RATE_LIMIT.limit),
      },
    });
  } catch (error) {
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
    const cacheKey = generateCacheKey(text, voice);

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

    const { audio } = await generateSpeech({ text, voice });

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
