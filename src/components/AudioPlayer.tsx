"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Headphones, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  text: string;
  title: string;
}

export function AudioPlayer({ text, title }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const synth = useRef<SpeechSynthesis | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synth.current = window.speechSynthesis;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, []);

  const cleanText = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const startSpeaking = () => {
    if (!synth.current) return;

    if (isPaused) {
      synth.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const contentToRead = `${title}. ${cleanText(text)}`;
    utterance.current = new SpeechSynthesisUtterance(contentToRead);
    utterance.current.lang = "tr-TR";
    utterance.current.rate = 1.0;

    utterance.current.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.current.onerror = (event) => {
      console.error("SpeechSynthesisUtterance error", event);
      setIsPlaying(false);
      setIsPaused(false);
    };

    synth.current.speak(utterance.current);
    setIsPlaying(true);
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
    <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-xl border border-secondary/20 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
        <Headphones className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
          Haberi Dinle
        </p>
        <div className="flex items-center gap-1.5">
          {!isPlaying && !isPaused ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all group"
              onClick={startSpeaking}
            >
              <Play className="w-4 h-4 mr-1.5 fill-current group-hover:scale-110 transition-transform" />
              BAŞLAT
            </Button>
          ) : (
            <>
              {isPlaying ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-all"
                  onClick={pauseSpeaking}
                >
                  <Pause className="w-4 h-4 mr-1.5 fill-current" />
                  DURAKLAT
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-all"
                  onClick={startSpeaking}
                >
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  DEVAM ET
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all"
                onClick={stopSpeaking}
              >
                <Square className="w-4 h-4 mr-1.5 fill-current" />
                DURDUR
              </Button>
            </>
          )}
        </div>
      </div>

      {(isPlaying || isPaused) && (
        <div className="flex items-center gap-1 pr-1">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[10px] font-bold text-primary">CANLI</span>
        </div>
      )}
    </div>
  );
}
