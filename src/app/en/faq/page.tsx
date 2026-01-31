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
        question: "What is AI Haberleri?",
        answer:
            "AI Haberleri is an autonomous news platform that uses artificial intelligence to translate, summarize, and publish AI and technology news from around the world into Turkish. Our goal is to deliver the latest developments in artificial intelligence to Turkish readers quickly and clearly.",
        icon: <Globe className="h-5 w-5" />,
    },
    {
        question: "How is the content created?",
        answer:
            "Our content is created by collecting news from reliable international sources via RSS feeds, which are then translated and rewritten into Turkish by the DeepSeek AI model. Each article includes a link to the original source and clearly indicates that it was produced by AI.",
        icon: <Bot className="h-5 w-5" />,
    },
    {
        question: "Where do the news stories come from?",
        answer:
            "Our news is compiled from globally respected technology publications such as TechCrunch, The Verge, Wired, MIT Technology Review, VentureBeat, Ars Technica, and official AI research blogs (OpenAI, Google AI, Microsoft Research).",
        icon: <Sparkles className="h-5 w-5" />,
    },
    {
        question: "How is content accuracy ensured?",
        answer:
            "Every piece of content is sourced and presented with the original source link. AI-generated content includes an 'AI-Assisted Content' badge. We encourage readers to verify information from original sources. If you spot any inaccuracies, please contact us through our contact page.",
        icon: <Shield className="h-5 w-5" />,
    },
    {
        question: "Why is artificial intelligence used?",
        answer:
            "AI can work 24/7, scanning hundreds of sources worldwide, translating news instantly, and presenting it to Turkish readers. This provides speed and coverage beyond the limited capacity of human editors. Additionally, AI usage is transparently shared with readers.",
        icon: <Zap className="h-5 w-5" />,
    },
    {
        question: "How can I contact you?",
        answer:
            "You can use our contact page for questions, suggestions, or correction requests. You can also reach us through our social media accounts. We review all feedback.",
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

export default function FAQPage() {
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
                        Frequently Asked Questions
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Find answers to common questions about AI Haberleri.
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
                    <h2 className="text-xl font-semibold mb-2">Have more questions?</h2>
                    <p className="text-muted-foreground mb-4">
                        Contact us if you can&apos;t find the answer you&apos;re looking for.
                    </p>
                    <Link
                        href="/en/contact"
                        className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                        Get in Touch
                    </Link>
                </motion.div>
            </div>
        </>
    );
}
