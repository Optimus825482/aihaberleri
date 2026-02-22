import type { Metadata } from "next";
import { getAITermAnchor, getAITermsGlossary } from "@/lib/ai-glossary";

export const metadata: Metadata = {
    title: "AI Terimler Mini Sözlük",
    description:
        "AI haberlerinde geçen teknik terimlerin sade ve doğru açıklamaları.",
};

export default async function AITermsPage() {
    const terms = await getAITermsGlossary(200);

    return (
        <main className="min-h-screen bg-ai-background-dark">
            <div className="container mx-auto max-w-5xl px-4 py-10">
                <header className="mb-8 rounded-2xl border border-ai-surface-border bg-ai-surface-card p-6">
                    <h1 className="text-2xl font-black text-white sm:text-3xl">
                        AI Terimler Mini Sözlük
                    </h1>
                    <p className="mt-2 text-sm text-ai-text-secondary">
                        Haberlerde geçen teknik kavramları kısa, net ve anlaşılır açıklamalarla takip edin.
                    </p>
                </header>

                <section className="grid gap-4 sm:grid-cols-2">
                    {terms.map((item) => (
                        <article
                            key={item.term}
                            id={getAITermAnchor(item.term)}
                            className="rounded-xl border border-ai-surface-border bg-ai-surface-card p-4"
                        >
                            <h2 className="text-base font-bold text-white">{item.term}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-ai-text-secondary">
                                {item.description}
                            </p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}
