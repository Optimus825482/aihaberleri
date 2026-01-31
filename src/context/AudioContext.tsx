"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { TTSLoadingModal } from "@/components/audio/TTSLoadingModal";

interface WordBoundary {
  text: string;
  start: number;
  duration: number;
}

type AudioState = {
  isPlaying: boolean;
  isLoading: boolean;
  rate: number;
  voice: string;
  title?: string;
  text?: string;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  audioUrl: string | null;
  metadata: WordBoundary[];
  currentWordIndex: number;
  isMainPlayerVisible: boolean;
};

type AudioContextType = AudioState & {
  play: (article?: { title: string; text: string }) => void;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setVoice: (voice: string) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  seek: (time: number) => void;
  download: () => void;
  setIsMainPlayerVisible: (visible: boolean) => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    rate: 1,
    voice: "tr-TR-EmelNeural",
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    audioUrl: null,
    metadata: [],
    currentWordIndex: -1,
    isMainPlayerVisible: true,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref to track current audio URL for proper cleanup (prevents stale closure)
  const currentAudioUrlRef = useRef<string | null>(null);

  // Load settings from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("audio-settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setState((s) => ({
          ...s,
          rate: settings.rate ?? 1,
          voice: settings.voice ?? "tr-TR-EmelNeural",
          volume: settings.volume ?? 1,
          isMuted: settings.isMuted ?? false,
        }));
      } catch (e) {
        console.error("Failed to load audio settings:", e);
      }
    }
  }, []);

  // Save settings to LocalStorage when they change
  useEffect(() => {
    const settings = {
      rate: state.rate,
      voice: state.voice,
      volume: state.volume,
      isMuted: state.isMuted,
    };
    localStorage.setItem("audio-settings", JSON.stringify(settings));
  }, [state.rate, state.voice, state.volume, state.isMuted]);

  /**
   * Revokes the current audio URL to prevent memory leaks
   */
  const revokeCurrentAudioUrl = useCallback(() => {
    if (currentAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      } catch (e) {
        console.warn("Failed to revoke audio URL:", e);
      }
      currentAudioUrlRef.current = null;
    }
  }, []);

  const cleanText = (html: string) => {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const fetchAudio = async (text: string, title: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true }));
      const fullText = `${title}. ${cleanText(text)}`;

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, voice: state.voice }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`TTS Request Failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.audio) {
        throw new Error("TTS response missing audio data");
      }

      // Revoke previous URL before creating new one
      revokeCurrentAudioUrl();

      // Optimized base64 decode using Uint8Array.from
      const byteArray = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "audio/mpeg" });

      const url = URL.createObjectURL(blob);
      // Track the new URL in ref for cleanup
      currentAudioUrlRef.current = url;

      return { url, metadata: data.metadata || [] };
    } catch (error) {
      console.error("Audio fetch error:", error);
      // Clean up any partial state
      revokeCurrentAudioUrl();
      return null;
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  };

  const play = async (article?: { title: string; text: string }) => {
    if (article) {
      // Note: revokeCurrentAudioUrl is called inside fetchAudio before creating new URL
      const result = await fetchAudio(article.text, article.title);
      if (result) {
        setState((s) => ({
          ...s,
          audioUrl: result.url,
          metadata: result.metadata,
          title: article.title,
          text: article.text,
          isPlaying: true,
          currentWordIndex: -1,
        }));
        if (audioRef.current) {
          audioRef.current.src = result.url;
          audioRef.current.playbackRate = state.rate;
          audioRef.current.play().catch((e) => {
            console.error("Audio play failed:", e);
            setState((s) => ({ ...s, isPlaying: false }));
          });
        }
      }
    } else if (audioRef.current && state.audioUrl) {
      audioRef.current.play().catch((e) => {
        console.error("Audio play failed:", e);
        setState((s) => ({ ...s, isPlaying: false }));
      });
      setState((s) => ({ ...s, isPlaying: true }));
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((s) => ({ ...s, isPlaying: false }));
    }
  };

  const togglePlay = () => {
    if (state.isPlaying) pause();
    else play();
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Clean up the audio URL when stopping
      revokeCurrentAudioUrl();
      setState((s) => ({
        ...s,
        isPlaying: false,
        currentTime: 0,
        currentWordIndex: -1,
        audioUrl: null,
      }));
    }
  };

  const setRate = (rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setState((s) => ({ ...s, rate }));
  };

  const setVoice = (voice: string) => setState((s) => ({ ...s, voice }));

  const setVolume = (volume: number) => {
    if (audioRef.current) audioRef.current.volume = volume;
    setState((s) => ({ ...s, volume, isMuted: volume === 0 }));
  };

  const setIsMuted = (isMuted: boolean) => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    setState((s) => ({ ...s, isMuted }));
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((s) => ({ ...s, currentTime: time }));
    }
  };

  const download = () => {
    if (state.audioUrl) {
      const link = document.createElement("a");
      link.href = state.audioUrl;
      link.download = `${state.title || "haber"}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "KeyM":
          setIsMuted(!state.isMuted);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isPlaying, state.isMuted, state.audioUrl]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;

      // Update current word index based on time and metadata
      // Since we added the title at the beginning, we need to be careful with indexing
      // but metadata from edge-tts usually matches the text exactly as sent.
      setState((s) => {
        let newWordIndex = -1;
        if (s.metadata.length > 0) {
          // Binary search for efficiency if needed, but linear is fine for < 1000 words
          for (let i = 0; i < s.metadata.length; i++) {
            if (time >= s.metadata[i].start) {
              newWordIndex = i;
            } else {
              break;
            }
          }
        }
        return { ...s, currentTime: time, currentWordIndex: newWordIndex };
      });
    };

    const handleDurationChange = () =>
      setState((s) => ({ ...s, duration: audio.duration }));
    const handleEnded = () =>
      setState((s) => ({ ...s, isPlaying: false, currentWordIndex: -1 }));

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    // Cleanup function uses ref to avoid stale closure
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
      // Use ref for cleanup to avoid stale closure issue
      if (currentAudioUrlRef.current) {
        try {
          URL.revokeObjectURL(currentAudioUrlRef.current);
        } catch (e) {
          console.warn("Failed to revoke audio URL on cleanup:", e);
        }
        currentAudioUrlRef.current = null;
      }
    };
  }, []);

  return (
    <AudioContext.Provider
      value={{
        ...state,
        play,
        pause,
        togglePlay,
        stop,
        setRate,
        setVoice,
        setVolume,
        setIsMuted,
        seek,
        download,
        setIsMainPlayerVisible: (visible: boolean) =>
          setState((s) => ({ ...s, isMainPlayerVisible: visible })),
      }}
    >
      <TTSLoadingModal isOpen={state.isLoading} />
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
