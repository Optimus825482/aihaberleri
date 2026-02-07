"use client";

import { motion } from "framer-motion";
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-ai-surface-border rounded-xl overflow-hidden bg-ai-surface-card hover:border-ai-primary/50 transition-colors"
        >
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
            <motion.div
                initial={false}
                animate={{
                    height: isOpen ? "auto" : 0,
                    opacity: isOpen ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
            >
                <div className="px-6 pb-4 pt-2 text-ai-text-secondary leading-relaxed">
                    {item.answer}
                </div>
            </motion.div>
        </motion.div>
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
                <div className="container max-w-4xl py-12 px-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-ai-primary to-purple-500 bg-clip-text text-transparent">
                            Sıkça Sorulan Sorular
                        </h1>
                        <p className="text-ai-text-secondary text-lg max-w-2xl mx-auto">
                            AI Haberleri hakkında merak ettiklerinizin yanıtlarını burada bulabilirsiniz.
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {faqItems.map((item, index) => (
                            <FAQAccordion key={index} item={item} index={index} />
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-12 p-6 rounded-xl bg-ai-surface-card border border-ai-surface-border text-center"
                    >
                        <h2 className="text-xl font-semibold mb-2 text-white">Başka sorunuz mu var?</h2>
                        <p className="text-ai-text-secondary mb-4">
                            Burada cevabını bulamadığınız sorularınız için bize ulaşın.
                        </p>
                        <Link
                            href="/iletisim"
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-ai-primary text-white hover:bg-ai-primary-hover transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                            İletişime Geç
                        </Link>
                    </motion.div>
                </div>
            </div>
        </>
    );
}
