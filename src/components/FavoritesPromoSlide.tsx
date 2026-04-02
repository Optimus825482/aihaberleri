"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PROMO_SEEN_KEY = "favorites_promo_seen";
const PROMO_IMAGE_URL =
    "https://image.pollinations.ai/prompt/futuristic%20AI%20news%20bookmark%20save%20favorite%20articles%20neon%20blue%20purple%20gradient%20digital%20library%20concept%20art?width=1920&height=1080&nologo=true&seed=42";

export function FavoritesPromoSlide() {
    const [visible, setVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Only show if user hasn't seen the promo before
        const seen = localStorage.getItem(PROMO_SEEN_KEY);
        if (!seen) {
            setVisible(true);

            // Auto-dismiss after 3 seconds
            const timer = setTimeout(() => {
                setFadeOut(true);
                // After fade animation, hide completely
                setTimeout(() => {
                    setVisible(false);
                    localStorage.setItem(PROMO_SEEN_KEY, "1");
                }, 600);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setFadeOut(true);
        setTimeout(() => {
            setVisible(false);
            localStorage.setItem(PROMO_SEEN_KEY, "1");
        }, 400);
    };

    if (!visible) return null;

    return (
        <div
            className={`absolute inset-0 z-30 flex items-end transition-all duration-600 ${fadeOut ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
        >
            {/* Background Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={PROMO_IMAGE_URL}
                alt="Favori Haberlerim özelliği"
                className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-ai-background-dark via-ai-background-dark/80 to-ai-background-dark/20" />

            {/* Content */}
            <div className="container relative z-10 mx-auto px-4 pb-16 md:pb-24">
                <div className="max-w-3xl">
                    {/* Badge */}
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-ai-primary/90 px-4 py-2 text-sm font-semibold text-white shadow-lg animate-bounce-subtle">
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        Yeni Özellik
                    </div>

                    {/* Title */}
                    <h2 className="mb-4 text-3xl font-black text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
                        Favori Haberlerim
                    </h2>

                    {/* Description */}
                    <p className="mb-6 max-w-xl text-base text-white/90 drop-shadow-lg md:text-xl">
                        Beğendiğin haberleri{" "}
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5">
                            <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                            Kaydet
                        </span>{" "}
                        butonuyla kaydet, istediğin zaman kolayca geri dön!
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/favoriler"
                            className="inline-flex items-center gap-2 rounded-full bg-ai-primary px-6 py-3 text-sm font-bold text-white shadow-xl transition-all hover:scale-105 hover:bg-ai-primary-hover md:px-8 md:py-4 md:text-base"
                        >
                            <span className="material-symbols-outlined text-[20px]">bookmark</span>
                            Favorilerime Git
                        </Link>
                        <button
                            onClick={handleDismiss}
                            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 md:px-8 md:py-4 md:text-base"
                        >
                            Haberlere Devam Et
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress Bar (3 second countdown) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 h-1 overflow-hidden bg-white/10">
                <div className="h-full w-full animate-promo-progress bg-gradient-to-r from-ai-primary via-ai-primary-hover to-ai-primary" />
            </div>

            <style jsx>{`
        @keyframes promo-progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
        .animate-promo-progress {
          animation: promo-progress 3s linear;
          transform-origin: right center;
          will-change: transform;
        }
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
