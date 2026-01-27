import { spawn } from "child_process";
import path from "path";

interface WordBoundary {
  text: string;
  start: number;
  duration: number;
}

interface TTSResponse {
  audio: Buffer;
  metadata: WordBoundary[];
}

interface TTSOptions {
  text: string;
  voice?: string;
}

/**
 * Microsoft Edge TTS Service (via Python edge-tts)
 * Uses the official python library for better reliability
 */
export async function generateSpeech(options: TTSOptions): Promise<TTSResponse> {
  const { text, voice = "tr-TR-AhmetNeural" } = options;

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), "src", "lib", "tts_engine.py");
    const pythonCommand = process.platform === "win32" ? "python" : "python3";
    
    const pythonProcess = spawn(pythonCommand, [pythonScript, voice]);
    
    const audioChunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];
    let fullStderr = "";

    pythonProcess.stdout.on("data", (chunk) => {
      audioChunks.push(chunk);
    });

    pythonProcess.stderr.on("data", (chunk) => {
      fullStderr += chunk.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0 && !fullStderr.includes("METADATA_START")) {
        console.error(`TTS Python Error: ${fullStderr}`);
        reject(new Error(`TTS failed with code ${code}: ${fullStderr}`));
      } else {
        const audio = Buffer.concat(audioChunks);
        if (audio.length === 0) {
           reject(new Error("TTS produced no audio output"));
        } else {
           let metadata: WordBoundary[] = [];
           try {
             if (fullStderr.includes("METADATA_START") && fullStderr.includes("METADATA_END")) {
               const start = fullStderr.indexOf("METADATA_START") + "METADATA_START".length;
               const end = fullStderr.indexOf("METADATA_END");
               const jsonStr = fullStderr.slice(start, end).trim();
               if (jsonStr) {
                 metadata = JSON.parse(jsonStr);
               }
             }
           } catch (e) {
             console.error("Failed to parse TTS metadata:", e);
           }
           resolve({ audio, metadata });
        }
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to spawn python process: ${err.message}`));
    });

    pythonProcess.stdin.write(text);
    pythonProcess.stdin.end();
  });
}