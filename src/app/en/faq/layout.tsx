import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Frequently Asked Questions (FAQ)",
    description:
        "Frequently asked questions and answers about AI Haberleri. Learn about how our content is created, our sources, and our use of artificial intelligence.",
    keywords: [
        "AI Haberleri FAQ",
        "AI news questions",
        "AI content generation",
        "autonomous news platform",
        "DeepSeek AI",
    ],
    alternates: {
        canonical: "/en/faq",
        languages: {
            "en": "/en/faq",
            "tr": "/sss",
        },
    },
    openGraph: {
        title: "Frequently Asked Questions | AI Haberleri",
        description:
            "Answers to your questions about AI Haberleri. Content creation, sources, and AI usage.",
        url: "/en/faq",
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "Frequently Asked Questions | AI Haberleri",
        description:
            "Answers to your questions about AI Haberleri.",
    },
};

export default function FAQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
