"use client";

import { useAudio } from "@/context/AudioContext";
import { useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    rate,
    volume,
    isMuted,
    play,
    pause,
    togglePlay,
    setRate,
    setVolume,
    setIsMuted,
    seek,
    download,
    title: currentTitle,
    setIsMainPlayerVisible
  } = useAudio();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMainPlayerVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [setIsMainPlayerVisible]);

  const handleToggle = () => {
    if (currentTitle !== title) {
      play({ title, text });
    } else {
      togglePlay();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="bg-card rounded-xl p-4 shadow-sm border border-primary/10">
      {/* Top Controls: Play/Pause, Title, Rate */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={handleToggle}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-lg ${
            isPlaying && currentTitle === title
              ? "bg-primary text-primary-foreground hover:scale-105"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
          aria-label={isPlaying && currentTitle === title ? "Duraklat" : "Oynat"}
        >
          {isLoading && currentTitle === title ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying && currentTitle === title ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-1" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary/60">
              YAPAY ZEKA SPİKERİ
            </span>
            {isPlaying && currentTitle === title && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 animate-pulse">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> CANLI
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm truncate">{title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <Select
            value={rate.toString()}
            onValueChange={(v) => setRate(parseFloat(v))}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs font-bold bg-secondary/50 border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1.0x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2.0x</SelectItem>
            </SelectContent>
          </Select>

          {/* Download Button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            onClick={download}
            title="İndir"
            disabled={currentTitle !== title}
          >
            <Download className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Progress Bar (Only show for current article) */}
      <div className={`space-y-2 ${currentTitle === title ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
        <Slider
          value={[currentTitle === title ? currentTime : 0]}
          max={currentTitle === title ? duration || 100 : 100}
          step={1}
          onValueChange={(val) => seek(val[0])}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
          <span>{formatTime(currentTitle === title ? currentTime : 0)}</span>
          <span>{formatTime(currentTitle === title ? duration : 0)}</span>
        </div>
      </div>

      {/* Volume Control (Desktop Only) */}
      <div className={`hidden sm:flex items-center gap-2 mt-4 px-2 ${currentTitle === title ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.1}
          onValueChange={(val) => setVolume(val[0])}
          className="w-24"
        />
      </div>
    </div>
  );
}