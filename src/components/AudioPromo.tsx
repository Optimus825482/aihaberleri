"use client";

import { useState, useEffect } from "react";
import { Headphones, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AudioPromo() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenPromo = localStorage.getItem("has-seen-audio-promo");
    if (!hasSeenPromo) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closePromo = (neverShowAgain = false) => {
    setIsVisible(false);
    if (neverShowAgain) {
      localStorage.setItem("has-seen-audio-promo", "true");
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-right-10 duration-500">
      <div className="bg-card border-2 border-primary/30 shadow-2xl rounded-2xl p-5 overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />

        <button
          onClick={() => closePromo(false)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0 animate-bounce">
            <Headphones className="w-6 h-6" />
          </div>

          <div className="flex-1 pr-6">
            <h4 className="font-bold text-lg mb-1">
              Yeni Özellik: Sesli Dinle! 🎧
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Artık haberleri okumak yerine arkana yaslanıp dinleyebilirsin.
              Haber başlığındaki &quot;Sesli Dinle&quot; butonunu dene!
            </p>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                className="w-full font-bold shadow-lg shadow-primary/20"
                onClick={() => closePromo(true)}
              >
                HARİKA, ANLADIM!
              </Button>
              <button
                onClick={() => closePromo(true)}
                className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground text-center transition-colors"
              >
                BİR DAHA GÖSTERME
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
