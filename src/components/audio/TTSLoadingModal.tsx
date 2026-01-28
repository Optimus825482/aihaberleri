"use client";

import { Loader2 } from "lucide-react";

interface TTSLoadingModalProps {
  isOpen: boolean;
}

export function TTSLoadingModal({ isOpen }: TTSLoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border-2 border-primary/20 shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative bg-primary/10 rounded-full w-full h-full flex items-center justify-center border-2 border-primary/30">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase tracking-tight">
            Hazırlanıyor <span className="text-primary italic">...</span>
          </h3>
          <div className="space-y-1">
            <p className="text-sm font-bold text-muted-foreground animate-pulse">
              Lütfen bekleyin / Please wait
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">
              Yapay Zeka Seslendiriyor
            </p>
          </div>
        </div>

        <div className="flex gap-1 justify-center">
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
