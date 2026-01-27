'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type AudioContextType = {
  isPlaying: boolean;
  rate: number;
  voice: 'male' | 'female';
  play: () => void;
  pause: () => void;
  setRate: (rate: number) => void;
  setVoice: (voice: 'male' | 'female') => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState<'male' | 'female'>('male');

  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);

  return (
    <AudioContext.Provider value={{ isPlaying, rate, voice, play, pause, setRate, setVoice }}>
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
