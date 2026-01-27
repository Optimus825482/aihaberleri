import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/edge-tts";

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "tr-TR-AhmetNeural" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // High limit for POST
    const cleanText = text.replace(/<[^>]*>/g, "").slice(0, 4000);
    console.log(`[TTS POST] Processing ${cleanText.length} chars...`);

    const { audio, metadata } = await generateSpeech({
      text: cleanText,
      voice,
    });

    console.log(`[TTS POST] Success: ${audio.length} bytes, ${metadata.length} words`);

    // Return as JSON to include metadata
    return NextResponse.json({
      audio: audio.toString("base64"),
      metadata,
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
  // Legacy short text support - keep returning direct audio for backwards compat if needed
  // but most of our app now uses POST
  const searchParams = req.nextUrl.searchParams;
  const text = searchParams.get("text");

  if (!text || text.length > 300) {
    return NextResponse.json(
      { error: "Please use POST for long texts" },
      { status: 400 },
    );
  }

  try {
    const { audio } = await generateSpeech({ text });
    return new Response(audio as any, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}