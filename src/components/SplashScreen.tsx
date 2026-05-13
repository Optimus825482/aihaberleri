"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const splashFrames = Array.from(
  { length: 24 },
  (_, index) => `/splash/frames/ai-splash-${String(index).padStart(2, "0")}.png`,
);

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(false), 2200);

    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="splash-screen fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#06101f] px-6 text-white"
      role="status"
      aria-label="AI Haberleri yükleniyor"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(14,165,233,0.28),transparent_38%),radial-gradient(circle_at_72%_62%,rgba(124,58,237,0.22),transparent_32%)]" />
      <div className="splash-card relative flex w-full max-w-5xl flex-col items-center gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-10 shadow-2xl shadow-cyan-950/40 backdrop-blur-md sm:px-10 md:flex-row md:justify-between">
        <div className="max-w-lg text-center md:text-left">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.36em] text-cyan-200/80">
            AI Haberleri
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Yapay zekâ gündemine bağlanılıyor
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
            En sıcak model, ürün ve araştırma gelişmeleri birkaç saniye içinde hazır.
          </p>
        </div>

        <div
          className="splash-orb relative aspect-video h-auto w-72 sm:w-96"
          role="img"
          aria-label="Animasyonlu 3D AI splash görseli"
        >
          {splashFrames.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              priority={index === 0}
              loading={index === 0 ? undefined : "eager"}
              sizes="(max-width: 640px) 288px, 384px"
              className="splash-frame object-contain drop-shadow-[0_0_46px_rgba(34,211,238,0.35)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
