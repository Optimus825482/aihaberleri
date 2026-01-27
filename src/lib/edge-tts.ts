import { spawn } from "child_process";
import path from "path";

interface TTSOptions {
  text: string;
  voice?: string; // e.g. "tr-TR-AhmetNeural"
  rate?: string; // e.g. "+0%", "-10%"
  pitch?: string; // e.g. "+0Hz"
  volume?: string; // e.g. "+0%"
}

/**
 * Microsoft Edge TTS Service (via Python edge-tts)
 * Uses the official python library for better reliability
 */
export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const { text, voice = "tr-TR-AhmetNeural" } = options;
  // Note: rate, pitch, volume are currently ignored in this implementation
  // but can be added to the python script if needed.

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), "src", "lib", "tts_engine.py");
    
    // Check if python is available, otherwise might need 'python3' on some systems
    // On Windows 'python' is usually correct.
    const pythonCommand = process.platform === "win32" ? "python" : "python3";
    
    const pythonProcess = spawn(pythonCommand, [pythonScript, voice]);
    
    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    pythonProcess.stdout.on("data", (chunk) => {
      chunks.push(chunk);
    });

    pythonProcess.stderr.on("data", (chunk) => {
      errorChunks.push(chunk);
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        const errorMessage = Buffer.concat(errorChunks).toString();
        // Log the full error for debugging
        console.error(`TTS Python Error: ${errorMessage}`);
        reject(new Error(`TTS failed with code ${code}: ${errorMessage}`));
      } else {
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) {
           reject(new Error("TTS produced no audio output"));
        } else {
           resolve(buffer);
        }
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to spawn python process: ${err.message}`));
    });

    // Write text to stdin to avoid command line length limits
    pythonProcess.stdin.write(text);
    pythonProcess.stdin.end();
  });
}