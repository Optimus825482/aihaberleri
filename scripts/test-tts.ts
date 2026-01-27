import { generateSpeech } from "../src/lib/edge-tts";
import fs from "fs";
import path from "path";

async function testTTS() {
  console.log("Testing TTS...");
  try {
    const text = "Merhaba, bu bir sesli okuma testidir. Yapay zeka tarafından oluşturulmuştur.";
    const buffer = await generateSpeech({ text });
    
    const outputPath = path.join(process.cwd(), "test-audio.mp3");
    fs.writeFileSync(outputPath, buffer);
    console.log(`Success! Audio saved to ${outputPath} (${buffer.length} bytes)`);
  } catch (error) {
    console.error("TTS Test Failed:", error);
  }
}

testTTS();
