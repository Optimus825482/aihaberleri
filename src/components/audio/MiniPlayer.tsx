"use client";

import { useAudio } from "@/context/AudioContext";
import { Play, Pause, X, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function MiniPlayer() {
  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    title,
    togglePlay,
    stop,
    isMainPlayerVisible,
    seek
  } = useAudio();

  // Only show if playing (or loading) AND main player is NOT visible
  const shouldShow = (isPlaying || isLoading) && !isMainPlayerVisible;

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-40 animate-in slide-in-from-bottom-10 duration-300">
      <div className="bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl overflow-hidden">
        {/* Progress Bar (at the top edge of mini player) */}
        <div className="h-1 bg-secondary w-full">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}
          />
        </div>

        <div className="p-3 flex items-center gap-3">
          {/* Play/Pause Button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
            onClick={togglePlay}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </Button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter truncate">
              Şu an dinleniyor
            </p>
            <h4 className="text-xs font-bold truncate leading-tight">
              {title}
            </h4>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={stop}
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
