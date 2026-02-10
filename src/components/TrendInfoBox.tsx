"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "trend-info-dismissed";

interface TrendInfoBoxProps {
  locale?: "tr" | "en";
}

const content = {
  tr: {
    title: "Trend Puanı Nasıl Hesaplanır?",
    desc1:
      "AI Haberleri olarak temel amacımız, yapay zeka dünyasındaki gelişmeleri yakından takip eden kullanıcılarımızın onlarca kaynağı ayrı ayrı kontrol etmek zorunda kalmamasını sağlamaktır. Özel haber araştırma sistemimiz her 15 dakikada bir dünya genelindeki yüzlerce kaynağı tarayarak haber değeri taşıyan gelişmeleri tespit eder.",
    desc2:
      "Tespit edilen haberler, 7 farklı sinyal üzerinden değerlendirilerek 0-100 arası bir trend puanı alır:",
    dismiss: "Bir daha gösterme",
    signals: [
      {
        icon: "psychology",
        label: "AI İlgisi",
        desc: "Yapay zeka alanına ne kadar ilgili",
      },
      { icon: "schedule", label: "Güncellik", desc: "Ne kadar yeni ve taze" },
      {
        icon: "verified",
        label: "Kaynak Güvenilirliği",
        desc: "Kaynağın prestiji ve güvenilirliği",
      },
      {
        icon: "title",
        label: "Başlık Kalitesi",
        desc: "Haber değeri ve spesifiklik",
      },
      {
        icon: "article",
        label: "İçerik Derinliği",
        desc: "Detay ve analiz seviyesi",
      },
      {
        icon: "new_releases",
        label: "Yenilik",
        desc: "İlk kez duyurulan gelişmeler",
      },
      {
        icon: "trending_up",
        label: "Etkileşim Potansiyeli",
        desc: "Okuyucu ilgisi ve etki",
      },
      {
        icon: "visibility",
        label: "Okuma & Beğeni",
        desc: "Gerçek kullanıcı etkileşimi",
      },
    ],
  },
  en: {
    title: "How is the Trend Score calculated?",
    desc1:
      "Our automated research system scans hundreds of sources worldwide every 15 minutes to identify newsworthy AI developments.",
    desc2:
      "Each article is evaluated across 7 signals to receive a trend score from 0 to 100:",
    dismiss: "Don't show again",
    signals: [
      { icon: "psychology", label: "AI Relevance", desc: "How related to AI" },
      { icon: "schedule", label: "Freshness", desc: "How recent the news is" },
      { icon: "verified", label: "Source Authority", desc: "Source prestige" },
      {
        icon: "title",
        label: "Title Quality",
        desc: "News value & specificity",
      },
      {
        icon: "article",
        label: "Content Depth",
        desc: "Detail & analysis level",
      },
      {
        icon: "new_releases",
        label: "Novelty",
        desc: "First-time announcements",
      },
      {
        icon: "trending_up",
        label: "Engagement",
        desc: "Reader interest & impact",
      },
      {
        icon: "visibility",
        label: "Views & Likes",
        desc: "Real user engagement",
      },
    ],
  },
};

export function TrendInfoBox({ locale = "tr" }: TrendInfoBoxProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash
  const t = content[locale];

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="mb-10 bg-ai-surface-card border border-ai-surface-border rounded-xl p-5 md:p-6 relative">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-ai-surface-dark text-ai-text-muted hover:text-white transition-colors"
        aria-label="Kapat"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>

      <h2 className="text-base md:text-lg font-bold text-white mb-3 flex items-center gap-2 pr-8">
        <span className="material-symbols-outlined text-ai-primary text-[20px]">
          info
        </span>
        {t.title}
      </h2>
      <p className="text-xs md:text-sm text-ai-text-secondary leading-relaxed mb-3">
        {t.desc1}
      </p>
      <p className="text-xs md:text-sm text-ai-text-secondary leading-relaxed mb-4">
        {t.desc2}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {t.signals.map((signal) => (
          <div
            key={signal.label}
            className="p-2.5 md:p-3 bg-ai-surface-dark rounded-lg border border-ai-surface-border"
          >
            <span className="material-symbols-outlined text-ai-primary text-[16px] mb-1 block">
              {signal.icon}
            </span>
            <p className="text-[11px] md:text-xs font-semibold text-white">
              {signal.label}
            </p>
            <p className="text-[10px] md:text-[11px] text-ai-text-muted mt-0.5">
              {signal.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Dismiss permanently */}
      <button
        onClick={handleDismiss}
        className="mt-4 text-xs text-ai-text-muted hover:text-ai-text-secondary transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[14px]">
          visibility_off
        </span>
        {t.dismiss}
      </button>
    </div>
  );
}
