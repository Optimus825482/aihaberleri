import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sıkça Sorulan Sorular (SSS)",
    description:
        "AI Haberleri hakkında sıkça sorulan sorular ve yanıtları. İçeriklerimizin nasıl üretildiği, kaynaklarımız ve yapay zeka kullanımı hakkında bilgi edinin.",
    keywords: [
        "AI Haberleri SSS",
        "yapay zeka haberleri soru cevap",
        "AI içerik üretimi",
        "otonom haber platformu",
        "DeepSeek AI",
    ],
    alternates: {
        canonical: "/sss",
        languages: {
            "en": "/en/faq",
            "tr": "/sss",
        },
    },
    openGraph: {
        title: "Sıkça Sorulan Sorular | AI Haberleri",
        description:
            "AI Haberleri hakkında merak ettiklerinizin yanıtları. İçerik üretimi, kaynaklar ve yapay zeka kullanımı.",
        url: "/sss",
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "Sıkça Sorulan Sorular | AI Haberleri",
        description:
            "AI Haberleri hakkında merak ettiklerinizin yanıtları.",
    },
};

export default function SSSLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
