export class AudioService {
  private synth: SpeechSynthesis;
  private rate: number = 1;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
    } else {
      // Mock for SSR/Server context
      this.synth = {
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [],
        paused: false,
        pending: false,
        speaking: false,
        onvoiceschanged: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    }
  }

  play(text: string): void {
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    if (this.voice) {
      utterance.voice = this.voice;
    }
    this.synth.speak(utterance);
  }

  pause(): void {
    this.synth.pause();
  }

  resume(): void {
    this.synth.resume();
  }

  stop(): void {
    this.synth.cancel();
  }

  setRate(rate: number): void {
    this.rate = rate;
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this.voice = voice;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }
}
