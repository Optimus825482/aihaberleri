"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Clean text for API
  const cleanText = (html: string) => {
    // Remove all HTML tags and trim
    const tagless = html.replace(/<[^>]*>/g, " ");
    // Convert entities or just return
    return tagless.replace(/\s+/g, " ").trim();
  };

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("canplay", onPlaying);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("canplay", onPlaying);
    };
  }, [playbackRate, volume, isMuted]);

  const fetchAudioBlob = async () => {
    try {
      setIsLoading(true);
      const tagless = cleanText(text);
      const fullText = `${title}. ${tagless}`;

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, voice: "tr-TR-AhmetNeural" }),
      });

      if (!response.ok) throw new Error("TTS Request Failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      return url;
    } catch (error) {
      console.error("Audio fetch error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      let currentSrc = audioUrl;

      if (!currentSrc) {
        currentSrc = await fetchAudioBlob();
      }

      if (currentSrc && audioRef.current) {
        // Only load if src changed
        if (
          audioRef.current.src !== window.location.origin + currentSrc &&
          !audioUrl
        ) {
          audioRef.current.src = currentSrc;
        }

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((error) => {
              console.error("Playback failed:", error);
              setIsPlaying(false);
            });
        }
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (audioRef.current) {
      audioRef.current.volume = value[0];
    }
    if (value[0] > 0) setIsMuted(false);
  };

  const handleDownload = async () => {
    let url = audioUrl;
    if (!url) url = await fetchAudioBlob();
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.slice(0, 30)}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-primary/10">
      <audio ref={audioRef} preload="none" />

      {/* Top Controls: Play/Pause, Title, Rate */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={togglePlay}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-lg ${
            isPlaying
              ? "bg-primary text-primary-foreground hover:scale-105"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
          aria-label={isPlaying ? "Duraklat" : "Oynat"}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying ? (
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
            {isPlaying && (
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
            value={playbackRate.toString()}
            onValueChange={(v) => setPlaybackRate(parseFloat(v))}
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
            onClick={handleDownload}
            title="İndir"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Control (Desktop Only) */}
      <div className="hidden sm:flex items-center gap-2 mt-4 px-2">
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
          onValueChange={handleVolumeChange}
          className="w-24"
        />
      </div>
    </div>
  );
}
