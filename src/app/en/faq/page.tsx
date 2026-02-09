"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";

interface FAQItem {
    question: string;
    answer: string;
    icon: string;
}

const faqItems: FAQItem[] = [
    {
        question: "What is AI Haberleri?",
        answer:
            "AI Haberleri is an autonomous news platform that uses artificial intelligence to translate, summarize, and publish AI and technology news from around the world into Turkish. Our goal is to deliver the latest developments in artificial intelligence to Turkish readers quickly and clearly.",
        icon: "language",
    },
    {
        question: "How is the content created?",
        answer:
            "Our content is created by collecting news from reliable international sources via RSS feeds, which are then translated and rewritten into Turkish by the DeepSeek AI model. Each article includes a link to the original source and clearly indicates that it was produced by AI.",
        icon: "smart_toy",
    },
    {
        question: "Where do the news stories come from?",
        answer:
            "Our news is compiled from globally respected technology publications such as TechCrunch, The Verge, Wired, MIT Technology Review, VentureBeat, Ars Technica, and official AI research blogs (OpenAI, Google AI, Microsoft Research).",
        icon: "auto_awesome",
    },
    {
        question: "How is content accuracy ensured?",
        answer:
            "Every piece of content is sourced and presented with the original source link. AI-generated content includes an 'AI-Assisted Content' badge. We encourage readers to verify information from original sources. If you spot any inaccuracies, please contact us through our contact page.",
        icon: "verified_user",
    },
    {
        question: "Why is artificial intelligence used?",
        answer:
            "AI can work 24/7, scanning hundreds of sources worldwide, translating news instantly, and presenting it to Turkish readers. This provides speed and coverage beyond the limited capacity of human editors. Additionally, AI usage is transparently shared with readers.",
        icon: "bolt",
    },
    {
        question: "How can I contact you?",
        answer:
            "You can use our contact page for questions, suggestions, or correction requests. You can also reach us through our social media accounts. We review all feedback.",
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

function FAQAccordion({ item }: { item: FAQItem }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-ai-surface-border rounded-xl overflow-hidden bg-ai-surface-card hover:border-ai-primary/50 transition-colors">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-ai-surface-hover transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-ai-primary/10 text-ai-primary">
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </div>
                    <span className="font-medium text-white">{item.question}</span>
                </div>
                <span className={`material-symbols-outlined text-[20px] text-ai-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    expand_more
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
            >
                <div className="px-6 pb-4 pt-2 text-ai-text-secondary leading-relaxed">
                    {item.answer}
                </div>
            </div>
        </div>
    );
}

export default function FAQPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <Script
                id="faq-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <div className="min-h-screen bg-ai-background-dark">
                {/* Hero Section with Background Image */}
                <div className="relative overflow-hidden">
                    {/* Background Image */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: "url('https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&q=80')",
                        }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-ai-background-dark/80 via-ai-background-dark/90 to-ai-background-dark" />
                    
                    <div className="relative container max-w-4xl py-16 px-4">
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ai-primary/20 border border-ai-primary/30 mb-6">
                                <span className="material-symbols-outlined text-ai-primary text-[18px]">help</span>
                                <span className="text-ai-primary text-sm font-medium">Help Center</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                                Frequently Asked Questions
                            </h1>
                            <p className="text-ai-text-secondary text-lg max-w-2xl mx-auto">
                                Find answers to common questions about AI Haberleri.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="container max-w-4xl py-12 px-4 -mt-4">
                    <div className="space-y-4">
                        {faqItems.map((item, index) => (
                            <FAQAccordion key={index} item={item} />
                        ))}
                    </div>

                    <div className="mt-12 p-6 rounded-xl bg-ai-surface-card border border-ai-surface-border text-center">
                        <h2 className="text-xl font-semibold mb-2 text-white">Have more questions?</h2>
                        <p className="text-ai-text-secondary mb-4">
                            Contact us if you can&apos;t find the answer you&apos;re looking for.
                        </p>
                        <Link
                            href="/en/contact"
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-ai-primary text-white hover:bg-ai-primary-hover transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                            Get in Touch
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
