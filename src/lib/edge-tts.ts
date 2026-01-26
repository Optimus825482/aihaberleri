import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";

const EDGE_WS_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4";

interface TTSOptions {
  text: string;
  voice?: string; // e.g. "tr-TR-AhmetNeural"
  rate?: string; // e.g. "+0%", "-10%"
  pitch?: string; // e.g. "+0Hz"
  volume?: string; // e.g. "+0%"
}

/**
 * Microsoft Edge TTS Service
 * Connects to the unofficial WebSocket API to generate speech
 */
export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const {
    text,
    voice = "tr-TR-AhmetNeural",
    rate = "+0%",
    pitch = "+0Hz",
    volume = "+0%",
  } = options;

  // Split text into chunks of ~500 characters
  const maxChunkSize = 500;
  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let endPos = currentPos + maxChunkSize;
    if (endPos < text.length) {
      const lastSentenceEnd = text.lastIndexOf(". ", endPos);
      if (lastSentenceEnd > currentPos) {
        endPos = lastSentenceEnd + 1;
      } else {
        const lastSpace = text.lastIndexOf(" ", endPos);
        if (lastSpace > currentPos) {
          endPos = lastSpace;
        }
      }
    } else {
      endPos = text.length;
    }
    const chunk = text.slice(currentPos, endPos).trim();
    if (chunk) chunks.push(chunk);
    currentPos = endPos;
  }

  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    try {
      const buffer = await synthesizeChunk(chunk, voice, rate, pitch, volume);
      audioBuffers.push(buffer);
    } catch (error) {
      console.error("Chunk synthesis failed:", error);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error("TTS failed: No audio could be generated");
  }

  return Buffer.concat(audioBuffers);
}

async function synthesizeChunk(
  text: string,
  voice: string,
  rate: string,
  pitch: string,
  volume: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(EDGE_WS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
    });

    const audioChunks: Buffer[] = [];
    const requestId = uuidv4().replace(/-/g, "");
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error("Timeout"));
    }, 15000);

    ws.on("open", () => {
      const configData = JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: {
                sentenceBoundaryEnabled: "false",
                wordBoundaryEnabled: "false",
              },
              outputFormat: "audio-24khz-48kbitrate-mono-mp3",
            },
          },
        },
      });

      ws.send(
        `X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${configData}`,
      );

      const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      const ssml = `
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='tr-TR'>
          <voice name='${voice}'>
            <prosody rate='${rate}' pitch='${pitch}' volume='${volume}'>
              ${escapedText}
            </prosody>
          </voice>
        </speak>
      `.trim();

      ws.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    ws.on("message", (data: Buffer | string) => {
      if (typeof data === "string") {
        if (data.includes("turn.end")) {
          ws.close();
        }
      } else if (data instanceof Buffer) {
        const headerLen = data.readUInt16BE(0);
        if (data.length > headerLen + 2) {
          const header = data.subarray(2, 2 + headerLen).toString();
          if (header.includes("Path:audio")) {
            audioChunks.push(data.subarray(2 + headerLen));
          }
        }
      }
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      if (audioChunks.length > 0) resolve(Buffer.concat(audioChunks));
      else reject(new Error("No audio"));
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
