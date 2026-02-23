import type { Metadata } from "next";
import Link from "next/link";
import { GlossaryAlphabetNav } from "@/components/article/GlossaryAlphabetNav";
import {
    getAITermAnchor,
    getAITermsGlossary,
    type AITermEntry,
} from "../../../lib/ai-glossary";

export const metadata: Metadata = {
    title: "AI Terms Glossary",
    description:
        "Clear explanations of technical AI terms used in our news coverage.",
    alternates: {
        canonical: "https://aihaberleri.org/en/ai-terms",
        languages: {
            tr: "https://aihaberleri.org/ai-terimler",
            en: "https://aihaberleri.org/en/ai-terms",
        },
    },
};

export const dynamic = "force-dynamic";

function getGroupKey(term: string): string {
    const first = term.trim().charAt(0).toUpperCase();
    return /^[A-Z0-9]$/.test(first) ? first : "#";
}

export default async function EnglishAITermsPage() {
    const terms = await getAITermsGlossary(500);

    const sortedTerms = [...terms].sort((a, b) =>
        a.term.localeCompare(b.term, "en", { sensitivity: "base" }),
    );

    const groupedTerms = sortedTerms.reduce<Record<string, AITermEntry[]>>(
        (acc, item) => {
            const key = getGroupKey(item.term);
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        },
        {},
    );

    const groupKeys = Object.keys(groupedTerms).sort((a, b) =>
        a.localeCompare(b, "en", { sensitivity: "base" }),
    );

    return (
        <main className="min-h-screen bg-ai-background-dark">
            <div className="container mx-auto max-w-6xl px-4 py-10">
                <header className="mb-8 rounded-2xl border border-ai-surface-border bg-ai-surface-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-white sm:text-3xl">
                                AI Terms Glossary
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ai-text-secondary">
                                Explore technical AI terms with short, practical explanations.
                            </p>
                        </div>
                        <span className="inline-flex min-h-11 items-center rounded-xl border border-ai-surface-border bg-ai-surface-dark px-4 text-sm font-semibold text-white">
                            {sortedTerms.length} terms
                        </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                            href="/en"
                            className="inline-flex min-h-11 items-center rounded-lg border border-ai-surface-border bg-ai-surface-dark px-3 text-xs font-semibold text-ai-text-secondary hover:text-white transition-colors"
                        >
                            Back to homepage
                        </Link>
                        <Link
                            href="/ai-terimler"
                            className="inline-flex min-h-11 items-center rounded-lg border border-ai-surface-border bg-ai-surface-dark px-3 text-xs font-semibold text-ai-text-secondary hover:text-white transition-colors"
                        >
                            Türkçe version
                        </Link>
                    </div>
                </header>

                {sortedTerms.length === 0 ? (
                    <section className="rounded-2xl border border-ai-surface-border bg-ai-surface-card p-8 text-center">
                        <p className="text-sm text-ai-text-secondary">
                            No glossary terms available yet.
                        </p>
                    </section>
                ) : (
                    <>
                        <GlossaryAlphabetNav
                            keys={groupKeys}
                            title="Alphabetical Quick Jump"
                        />

                        <section className="space-y-6">
                            {groupKeys.map((key) => (
                                <div
                                    key={key}
                                    id={`group-${key}`}
                                    className="rounded-2xl border border-ai-surface-border bg-ai-surface-card p-4 sm:p-5"
                                >
                                    <h2 className="mb-4 text-lg font-black text-white">{key}</h2>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {groupedTerms[key].map((item) => (
                                            <article
                                                key={item.term}
                                                id={getAITermAnchor(item.term)}
                                                className="rounded-xl border border-ai-surface-border bg-ai-surface-dark p-4"
                                            >
                                                <h3 className="text-base font-bold text-white">{item.term}</h3>
                                                {!!item.aliases?.length && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {item.aliases.map((alias) => (
                                                            <span
                                                                key={`${item.term}-${alias}`}
                                                                className="rounded-full border border-ai-surface-border px-2 py-0.5 text-[11px] font-semibold text-ai-text-secondary"
                                                            >
                                                                {alias}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="mt-3 text-sm leading-relaxed text-ai-text-secondary">
                                                    {item.description}
                                                </p>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
