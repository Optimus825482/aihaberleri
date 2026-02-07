"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";

interface FAQItem {
  question: string;
  answer: string;
  icon: string;
}

const faqItems: FAQItem[] = [
  {
    question: "AI Haberleri nedir?",
    answer:
      "AI Haberleri, yapay zeka teknolojilerini kullanarak dünya genelindeki AI ve teknoloji haberlerini Türkçe'ye çeviren, özetleyen ve yayınlayan otonom bir haber platformudur. Amacımız, Türkiye'deki okuyuculara en güncel yapay zeka gelişmelerini hızlı ve anlaşılır bir şekilde sunmaktır.",
    icon: "public",
  },
  {
    question: "İçerikler nasıl üretiliyor?",
    answer:
      "İçeriklerimiz, güvenilir uluslararası kaynaklardan RSS beslemeleri aracılığıyla toplanan haberlerin DeepSeek AI modeli tarafından Türkçe'ye çevrilmesi ve yeniden yazılmasıyla oluşturulmaktadır. Her makale, orijinal kaynağa bağlantı içerir ve AI tarafından üretildiği açıkça belirtilir.",
    icon: "smart_toy",
  },
  {
    question: "Haberler hangi kaynaklardan alınıyor?",
    answer:
      "Haberlerimiz; TechCrunch, The Verge, Wired, MIT Technology Review, VentureBeat, Ars Technica gibi dünya çapında saygın teknoloji yayınlarından ve resmi AI araştırma bloglarından (OpenAI, Google AI, Microsoft Research) derlenmektedir.",
    icon: "auto_awesome",
  },
  {
    question: "İçeriklerin doğruluğu nasıl sağlanıyor?",
    answer:
      "Her içerik orijinal kaynağından alıntılanır ve kaynak linki ile birlikte sunulur. AI tarafından üretilen içeriklerde 'AI Destekli İçerik' rozeti bulunur. Okuyucularımızın orijinal kaynağı kontrol etmelerini teşvik ediyoruz. Yanlış bilgi tespit ederseniz iletişim sayfamızdan bize ulaşabilirsiniz.",
    icon: "verified_user",
  },
  {
    question: "Neden yapay zeka kullanılıyor?",
    answer:
      "Yapay zeka, 7/24 çalışarak dünya genelindeki yüzlerce kaynağı tarayabilir, haberleri anında çevirebilir ve Türkçe okuyuculara sunabilir. Bu sayede, insan editörlerin sınırlı kapasitesinin ötesinde bir hız ve kapsam sağlanmaktadır. Ayrıca, AI kullanımı şeffaf bir şekilde okuyucularla paylaşılmaktadır.",
    icon: "bolt",
  },
  {
    question: "Sizinle nasıl iletişime geçebilirim?",
    answer:
      "Sorularınız, önerileriniz veya düzeltme talepleriniz için iletişim sayfamızı kullanabilirsiniz. Ayrıca sosyal medya hesaplarımız üzerinden de bize ulaşabilirsiniz. Tüm geri bildirimleri değerlendiriyoruz.",
    icon: "mail",
  },
];

// FAQ Schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

function FAQAccordion({ item, index }: { item: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-ai-surface-border rounded-xl overflow-hidden bg-ai-surface-card hover:border-ai-primary/50 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-ai-surface-hover/30 transition-colors"
        aria-expanded={isOpen ? "true" : "false"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-ai-primary/10 text-ai-primary">
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
          </div>
          <span className="font-medium text-white">{item.question}</span>
        </div>
        <span
          className={`material-symbols-outlined text-[20px] text-ai-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-6 pb-4 pt-2 text-ai-text-secondary leading-relaxed pl-16">
          {item.answer}
        </div>
      </div>
    </div>
  );
}

export default function SSSPage() {
  return (
    <>
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-ai-background-dark">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center gap-2 text-ai-primary font-medium text-sm mb-4">
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>Yardım Merkezi</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
              Sıkça Sorulan Sorular
            </h1>
            <p className="text-lg text-ai-text-secondary max-w-2xl leading-relaxed">
              AI Haberleri hakkında merak ettiklerinizin yanıtlarını burada bulabilirsiniz.
              Platformumuzun nasıl çalıştığını, içerik üretim sürecimizi ve daha fazlasını öğrenin.
            </p>
          </div>
        </div>

        {/* FAQ Content */}
        <div className="container mx-auto px-4 pb-16 max-w-4xl">
          <div className="space-y-4 mb-12">
            {faqItems.map((item, index) => (
              <FAQAccordion key={index} item={item} index={index} />
            ))}
          </div>

          {/* Contact CTA */}
          <div className="relative overflow-hidden bg-gradient-to-br from-ai-primary to-blue-700 rounded-2xl p-8 text-center">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-2">Başka sorunuz mu var?</h2>
              <p className="text-blue-100 mb-6 max-w-md mx-auto">
                Burada cevabını bulamadığınız sorularınız için bize ulaşın.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-white text-ai-primary px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                İletişime Geç
              </Link>
            </div>
          </div>

          {/* Additional Help Links */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Link
              href="/about"
              className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <span className="material-symbols-outlined text-blue-400 text-[24px]">info</span>
              </div>
              <h3 className="font-bold text-white mb-2">Hakkımızda</h3>
              <p className="text-sm text-ai-text-secondary">
                Platformumuzun hikayesini ve misyonunu öğrenin.
              </p>
            </Link>

            <Link
              href="/privacy"
              className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <span className="material-symbols-outlined text-purple-400 text-[24px]">shield</span>
              </div>
              <h3 className="font-bold text-white mb-2">Gizlilik Politikası</h3>
              <p className="text-sm text-ai-text-secondary">
                Verilerinizin nasıl korunduğunu öğrenin.
              </p>
            </Link>

            <a
              href="https://twitter.com/aihaberleri"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-ai-surface-card border border-ai-surface-border rounded-xl p-6 hover:border-ai-primary/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <span className="material-symbols-outlined text-green-400 text-[24px]">forum</span>
              </div>
              <h3 className="font-bold text-white mb-2">Topluluk</h3>
              <p className="text-sm text-ai-text-secondary">
                Sosyal medyada bize katılın.
              </p>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
