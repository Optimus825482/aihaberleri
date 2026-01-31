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

// ============================================
// VOICE WHITELIST - Security Layer
// ============================================
const ALLOWED_VOICES = [
  // Turkish voices
  "tr-TR-AhmetNeural",
  "tr-TR-EmelNeural",
  // English voices
  "en-US-JennyNeural",
  "en-US-GuyNeural",
] as const;

type AllowedVoice = (typeof ALLOWED_VOICES)[number];

/**
 * Type guard to validate voice selection
 * @param voice - Voice string to validate
 * @returns True if voice is in whitelist
 */
export function isValidVoice(voice: string): voice is AllowedVoice {
  return ALLOWED_VOICES.includes(voice as AllowedVoice);
}

/**
 * Get list of allowed voices
 */
export function getAllowedVoices(): readonly string[] {
  return ALLOWED_VOICES;
}

/**
 * Sanitize text input to prevent shell injection
 * Removes potentially dangerous shell metacharacters
 * @param text - Raw text input
 * @returns Sanitized text safe for shell execution
 */
export function sanitizeText(text: string): string {
  // Remove shell metacharacters that could be exploited
  const shellMetacharacters = /[`$\\|;&<>(){}[\]!#*?~^]/g;

  // Also remove control characters
  const controlCharacters = /[\x00-\x1F\x7F]/g;

  let sanitized = text
    .replace(shellMetacharacters, "")
    .replace(controlCharacters, "")
    .trim();

  // Log if sanitization changed the text
  if (sanitized !== text.trim()) {
    console.log(
      `[TTS Security] Text sanitized: removed ${text.length - sanitized.length} dangerous characters`,
    );
  }

  return sanitized;
}

/**
 * Microsoft Edge TTS Service (via Python edge-tts)
 * Uses the official python library for better reliability
 */
export async function generateSpeech(
  options: TTSOptions,
): Promise<TTSResponse> {
  const { text, voice = "tr-TR-AhmetNeural" } = options;

  // ============================================
  // SECURITY: Voice Whitelist Validation
  // ============================================
  if (!isValidVoice(voice)) {
    console.error(`[TTS Security] Invalid voice rejected: ${voice}`);
    throw new Error(
      `Invalid voice: ${voice}. Allowed voices: ${ALLOWED_VOICES.join(", ")}`,
    );
  }

  // ============================================
  // SECURITY: Input Sanitization
  // ============================================
  const sanitizedText = sanitizeText(text);

  if (!sanitizedText) {
    throw new Error("Text is empty after sanitization");
  }

  console.log(
    `[TTS] Generating speech: voice=${voice}, textLength=${sanitizedText.length}`,
  );

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(
      process.cwd(),
      "src",
      "lib",
      "tts_engine.py",
    );
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
            if (
              fullStderr.includes("METADATA_START") &&
              fullStderr.includes("METADATA_END")
            ) {
              const start =
                fullStderr.indexOf("METADATA_START") + "METADATA_START".length;
              const end = fullStderr.indexOf("METADATA_END");
              const jsonStr = fullStderr.slice(start, end).trim();
              if (jsonStr) {
                metadata = JSON.parse(jsonStr);
              }
            }
          } catch (e) {
            console.error("Failed to parse TTS metadata:", e);
          }
          console.log(`[TTS] Success: ${audio.length} bytes generated`);
          resolve({ audio, metadata });
        }
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to spawn python process: ${err.message}`));
    });

    // Send sanitized text to Python process
    pythonProcess.stdin.write(sanitizedText);
    pythonProcess.stdin.end();
  });
}
