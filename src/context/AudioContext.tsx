'use client';

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';

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
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean text helper
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

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error("Audio fetch error:", error);
      return null;
    } finally {
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  const play = async (article?: { title: string; text: string }) => {
    if (article) {
      // If new article, stop current and fetch
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
      const url = await fetchAudio(article.text, article.title);
      if (url) {
        setState(s => ({ 
          ...s, 
          audioUrl: url, 
          title: article.title, 
          text: article.text,
          isPlaying: true 
        }));
        if (audioRef.current) {
          audioRef.current.src = url;
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
      setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
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

    const handleTimeUpdate = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    const handleDurationChange = () => setState(s => ({ ...s, duration: audio.duration }));
    const handleEnded = () => setState(s => ({ ...s, isPlaying: false }));

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
      setIsLoading: (isLoading) => setState(s => ({ ...s, isLoading }))
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