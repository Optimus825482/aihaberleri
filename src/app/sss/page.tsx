"use client";

import { motion } from "framer-motion";
import { ChevronDown, Bot, Sparkles, Shield, Mail, Globe, Zap } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import Script from "next/script";

interface FAQItem {
    question: string;
    answer: string;
    icon: React.ReactNode;
}

const faqItems: FAQItem[] = [
    {
        question: "AI Haberleri nedir?",
        answer:
            "AI Haberleri, yapay zeka teknolojilerini kullanarak dünya genelindeki AI ve teknoloji haberlerini Türkçe'ye çeviren, özetleyen ve yayınlayan otonom bir haber platformudur. Amacımız, Türkiye'deki okuyuculara en güncel yapay zeka gelişmelerini hızlı ve anlaşılır bir şekilde sunmaktır.",
        icon: <Globe className="h-5 w-5" />,
    },
    {
        question: "İçerikler nasıl üretiliyor?",
        answer:
            "İçeriklerimiz, güvenilir uluslararası kaynaklardan RSS beslemeleri aracılığıyla toplanan haberlerin DeepSeek AI modeli tarafından Türkçe'ye çevrilmesi ve yeniden yazılmasıyla oluşturulmaktadır. Her makale, orijinal kaynağa bağlantı içerir ve AI tarafından üretildiği açıkça belirtilir.",
        icon: <Bot className="h-5 w-5" />,
    },
    {
        question: "Haberler hangi kaynaklardan alınıyor?",
        answer:
            "Haberlerimiz; TechCrunch, The Verge, Wired, MIT Technology Review, VentureBeat, Ars Technica gibi dünya çapında saygın teknoloji yayınlarından ve resmi AI araştırma bloglarından (OpenAI, Google AI, Microsoft Research) derlenmektedir.",
        icon: <Sparkles className="h-5 w-5" />,
    },
    {
        question: "İçeriklerin doğruluğu nasıl sağlanıyor?",
        answer:
            "Her içerik orijinal kaynağından alıntılanır ve kaynak linki ile birlikte sunulur. AI tarafından üretilen içeriklerde 'AI Destekli İçerik' rozeti bulunur. Okuyucularımızın orijinal kaynağı kontrol etmelerini teşvik ediyoruz. Yanlış bilgi tespit ederseniz iletişim sayfamızdan bize ulaşabilirsiniz.",
        icon: <Shield className="h-5 w-5" />,
    },
    {
        question: "Neden yapay zeka kullanılıyor?",
        answer:
            "Yapay zeka, 7/24 çalışarak dünya genelindeki yüzlerce kaynağı tarayabilir, haberleri anında çevirebilir ve Türkçe okuyuculara sunabilir. Bu sayede, insan editörlerin sınırlı kapasitesinin ötesinde bir hız ve kapsam sağlanmaktadır. Ayrıca, AI kullanımı şeffaf bir şekilde okuyucularla paylaşılmaktadır.",
        icon: <Zap className="h-5 w-5" />,
    },
    {
        question: "Sizinle nasıl iletişime geçebilirim?",
        answer:
            "Sorularınız, önerileriniz veya düzeltme talepleriniz için iletişim sayfamızı kullanabilirsiniz. Ayrıca sosyal medya hesaplarımız üzerinden de bize ulaşabilirsiniz. Tüm geri bildirimleri değerlendiriyoruz.",
        icon: <Mail className="h-5 w-5" />,
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
            className="border border-border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                aria-expanded={isOpen ? "true" : "false"}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {item.icon}
                    </div>
                    <span className="font-medium text-foreground">{item.question}</span>
                </div>
                <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                />
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
                <div className="px-6 pb-4 pt-2 text-muted-foreground leading-relaxed">
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

            <div className="container max-w-4xl py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Sıkça Sorulan Sorular
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
                    className="mt-12 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20 text-center"
                >
                    <h2 className="text-xl font-semibold mb-2">Başka sorunuz mu var?</h2>
                    <p className="text-muted-foreground mb-4">
                        Burada cevabını bulamadığınız sorularınız için bize ulaşın.
                    </p>
                    <Link
                        href="/iletisim"
                        className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                        İletişime Geç
                    </Link>
                </motion.div>
            </div>
        </>
    );
}
