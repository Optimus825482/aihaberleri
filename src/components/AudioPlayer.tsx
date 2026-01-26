"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Headphones,
  Activity,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AudioPlayerProps {
  text: string;
  title: string;
}

export function AudioPlayer({ text, title }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [speed, setSpeed] = useState("1");
  const [currentVoiceName, setCurrentVoiceName] = useState<string>("");

  const synth = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synth.current = window.speechSynthesis;

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const best = getBestTurkishVoice(voices);
        if (best) setCurrentVoiceName(best.name);
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      if (synth.current) synth.current.cancel();
    };
  }, []);

  const cleanText = (html: string) => {
    if (typeof document === "undefined") return html;
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;

    // Remove scripts and styles
    const scripts = tmp.getElementsByTagName("script");
    let i = scripts.length;
    while (i--) scripts[i].parentNode?.removeChild(scripts[i]);

    const styles = tmp.getElementsByTagName("style");
    let j = styles.length;
    while (j--) styles[j].parentNode?.removeChild(styles[j]);

    return tmp.textContent || tmp.innerText || "";
  };

  const getBestTurkishVoice = (voices: SpeechSynthesisVoice[]) => {
    const preferred = ["Google", "Natural", "Online", "Siri", "Premium"];
    for (const p of preferred) {
      const found = voices.find(
        (v) =>
          (v.lang.startsWith("tr") || v.lang === "tr-TR") && v.name.includes(p),
      );
      if (found) return found;
    }
    return voices.find((v) => v.lang.startsWith("tr") || v.lang === "tr-TR");
  };

  const startSpeaking = () => {
    if (!synth.current) return;

    if (isPaused) {
      synth.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    synth.current.cancel();

    const fullContent = `${title}. ${cleanText(text)}`;
    const utterance = new SpeechSynthesisUtterance(fullContent);

    const voices = synth.current.getVoices();
    const bestVoice = getBestTurkishVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.lang = "tr-TR";
    utterance.rate = parseFloat(speed);
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    synth.current.speak(utterance);

    // iOS and Android often need a second resume to kickstart
    if (synth.current.paused) {
      setTimeout(() => {
        synth.current?.resume();
      }, 100);
    }
  };

  const pauseSpeaking = () => {
    if (synth.current && isPlaying) {
      synth.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const stopSpeaking = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="group relative overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-5 bg-card/40 hover:bg-card/60 backdrop-blur-md rounded-3xl border-2 border-primary/10 hover:border-primary/30 transition-all duration-500 shadow-xl shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex items-center gap-4 flex-1 relative z-10">
        <div
          className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ${isPlaying ? "bg-primary text-primary-foreground scale-105 shadow-lg shadow-primary/30" : "bg-primary/10 text-primary group-hover:bg-primary/20"}`}
        >
          {isPlaying ? (
            <Activity className="w-7 h-7" />
          ) : (
            <Headphones className="w-7 h-7" />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
              Yapay Zeka Spikeri
            </span>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 animate-pulse">
                <div className="w-1 h-1 bg-green-500 rounded-full" /> CANLI
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-foreground">
            Haberi Sesli Dinle
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {currentVoiceName || "Sistem Sesi"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 relative z-10">
        <div className="flex items-center bg-secondary/50 rounded-xl px-2 h-11 border border-primary/5">
          <span className="text-[10px] font-bold text-muted-foreground mr-1 ml-1 uppercase">
            HIZ
          </span>
          <Select value={speed} onValueChange={setSpeed}>
            <SelectTrigger className="w-[75px] h-8 bg-transparent border-0 font-bold text-sm focus:ring-0 shadow-none">
              <SelectValue placeholder="Hız" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.8">0.8x</SelectItem>
              <SelectItem value="1">1.0x</SelectItem>
              <SelectItem value="1.2">1.2x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2.0x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-none">
          {!isPlaying && !isPaused ? (
            <Button
              className="flex-1 sm:flex-none px-8 h-11 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-all group/btn"
              onClick={startSpeaking}
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              BAŞLAT
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className={`flex-1 sm:flex-none h-11 px-5 rounded-xl font-bold border-2 active:scale-95 transition-all ${isPlaying ? "hover:bg-orange-50 text-orange-600 border-orange-200" : "border-primary text-primary hover:bg-primary/5"}`}
                onClick={isPlaying ? pauseSpeaking : startSpeaking}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2 fill-current" /> DURAKLAT
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2 fill-current" /> DEVAM ET
                  </>
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10 active:scale-95 transition-all border border-destructive/10"
                onClick={stopSpeaking}
              >
                <Square className="w-4 h-4 fill-current" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
