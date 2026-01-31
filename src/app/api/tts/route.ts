import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { generateSpeech, isValidVoice, getAllowedVoices } from "@/lib/edge-tts";
import { getRedis } from "@/lib/redis";
import {
  checkTTSRateLimit,
  getRateLimitHeaders,
  TTS_RATE_LIMIT,
} from "@/lib/rate-limit";

// ============================================
// CACHE CONFIGURATION
// ============================================
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const CACHE_PREFIX = "tts:cache:";

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
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${rateLimitResult.resetInSeconds} seconds.`,
          retryAfter: rateLimitResult.resetInSeconds,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult, TTS_RATE_LIMIT.limit),
        },
      );
    }

    const { text, voice = "tr-TR-AhmetNeural" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // ============================================
    // VOICE VALIDATION
    // ============================================
    if (!isValidVoice(voice)) {
      console.log(`[TTS POST] Invalid voice rejected: ${voice}`);
      return NextResponse.json(
        {
          error: "Invalid voice",
          allowedVoices: getAllowedVoices(),
        },
        { status: 400 },
      );
    }

    // High limit for POST
    const cleanText = text.replace(/<[^>]*>/g, "").slice(0, 4000);
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
  } catch (error: any) {
    console.error(`[TTS POST] Error:`, error.message || error);
    return NextResponse.json(
      { error: "Synthesis failed", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const clientIP = getClientIP(req);

  // ============================================
  // RATE LIMITING CHECK
  // ============================================
  const rateLimitResult = await checkTTSRateLimit(clientIP);

  if (!rateLimitResult.success) {
    console.log(`[TTS GET] Rate limit exceeded for IP: ${clientIP}`);
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${rateLimitResult.resetInSeconds} seconds.`,
        retryAfter: rateLimitResult.resetInSeconds,
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult, TTS_RATE_LIMIT.limit),
      },
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const text = searchParams.get("text");
  const voice = searchParams.get("voice") || "tr-TR-AhmetNeural";

  if (!text || text.length > 300) {
    return NextResponse.json(
      { error: "Please use POST for long texts" },
      { status: 400 },
    );
  }

  // ============================================
  // VOICE VALIDATION
  // ============================================
  if (!isValidVoice(voice)) {
    console.log(`[TTS GET] Invalid voice rejected: ${voice}`);
    return NextResponse.json(
      {
        error: "Invalid voice",
        allowedVoices: getAllowedVoices(),
      },
      { status: 400 },
    );
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

  try {
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
  } catch (error: any) {
    console.error(`[TTS GET] Error:`, error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
