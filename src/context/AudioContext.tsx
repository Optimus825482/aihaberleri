'use client';

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';

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
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    rate: 1,
    voice: 'tr-TR-AhmetNeural',
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    audioUrl: null,
    metadata: [],
    currentWordIndex: -1,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanText = (html: string) => {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const fetchAudio = async (text: string, title: string) => {
    try {
      setState(s => ({ ...s, isLoading: true }));
      const fullText = `${title}. ${cleanText(text)}`;
      
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, voice: state.voice }),
      });

      if (!response.ok) throw new Error("TTS Request Failed");

      const data = await response.json();
      
      // Convert base64 to blob
      const byteCharacters = atob(data.audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });
      
      const url = URL.createObjectURL(blob);
      return { url, metadata: data.metadata };
    } catch (error) {
      console.error("Audio fetch error:", error);
      return null;
    } finally {
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  const play = async (article?: { title: string; text: string }) => {
    if (article) {
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
      const result = await fetchAudio(article.text, article.title);
      if (result) {
        setState(s => ({ 
          ...s, 
          audioUrl: result.url, 
          metadata: result.metadata,
          title: article.title, 
          text: article.text,
          isPlaying: true,
          currentWordIndex: -1
        }));
        if (audioRef.current) {
          audioRef.current.src = result.url;
          audioRef.current.playbackRate = state.rate;
          audioRef.current.play();
        }
      }
    } else if (audioRef.current && state.audioUrl) {
      audioRef.current.play();
      setState(s => ({ ...s, isPlaying: true }));
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(s => ({ ...s, isPlaying: false }));
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
      setState(s => ({ ...s, isPlaying: false, currentTime: 0, currentWordIndex: -1 }));
    }
  };

  const setRate = (rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setState(s => ({ ...s, rate }));
  };

  const setVoice = (voice: string) => setState(s => ({ ...s, voice }));

  const setVolume = (volume: number) => {
    if (audioRef.current) audioRef.current.volume = volume;
    setState(s => ({ ...s, volume, isMuted: volume === 0 }));
  };

  const setIsMuted = (isMuted: boolean) => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    setState(s => ({ ...s, isMuted }));
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  };

  const download = () => {
    if (state.audioUrl) {
      const link = document.createElement("a");
      link.href = state.audioUrl;
      link.download = `${state.title || 'haber'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      
      // Update current word index based on time and metadata
      // Since we added the title at the beginning, we need to be careful with indexing
      // but metadata from edge-tts usually matches the text exactly as sent.
      setState(s => {
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

    const handleDurationChange = () => setState(s => ({ ...s, duration: audio.duration }));
    const handleEnded = () => setState(s => ({ ...s, isPlaying: false, currentWordIndex: -1 }));

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    };
  }, []);

  return (
    <AudioContext.Provider value={{ 
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
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
