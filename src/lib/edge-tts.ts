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
  return new Promise((resolve, reject) => {
    const {
      text,
      voice = "tr-TR-AhmetNeural",
      rate = "+0%",
      pitch = "+0Hz",
      volume = "+0%",
    } = options;

    const ws = new WebSocket(EDGE_WS_URL, {
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41",
      },
    });

    const audioChunks: Buffer[] = [];
    const requestId = uuidv4().replace(/-/g, "");

    ws.on("open", () => {
      // Send config
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

      // Send synthesis request (SSML)
      const ssml = `
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='tr-TR'>
          <voice name='${voice}'>
            <prosody rate='${rate}' pitch='${pitch}' volume='${volume}'>
              ${text}
            </prosody>
          </voice>
        </speak>
      `.trim();

      ws.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    ws.on("message", (data: Buffer | string, isBinary) => {
      if (!isBinary) {
        const textData = data.toString();
        // Check for end of turn
        if (textData.includes("turn.end")) {
          ws.close();
        }
      } else if (data instanceof Buffer) {
        // Find the start of the audio data (skip headers)
        // Usually headers are separated by 0x00 0x80 (for binary)
        // Simple heuristic: look for "Path:audio" in header
        const headerEnd = data.indexOf("\r\n\r\n") + 4;
        if (headerEnd > 4) {
          const audioPart = data.slice(headerEnd);
          audioChunks.push(audioPart);
        }
      }
    });

    ws.on("close", () => {
      resolve(Buffer.concat(audioChunks));
    });

    ws.on("error", (err) => {
      reject(err);
    });
  });
}
