import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/edge-tts";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const text = searchParams.get("text");
  const voice = searchParams.get("voice") || "tr-TR-AhmetNeural";

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // Basic cleaning of text (remove HTML tags if any leaks through)
  const cleanText = text.replace(/<[^>]*>/g, "").slice(0, 5000); // Higher limit

  try {
    const audioBuffer = await generateSpeech({
      text: cleanText,
      voice,
    });

    return new Response(audioBuffer as any, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("TTS Route Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to generate speech", details: error.message },
      { status: 500 },
    );
  }
}
