import Link from "next/link";
import {
    getAITermAnchor,
    getAITermsGlossary,
    getRelevantAITermsForText,
} from "@/lib/ai-glossary";
import { cn } from "@/lib/utils";

interface AITermsGlossaryProps {
    articleText?: string;
    title?: string;
    maxTerms?: number;
    compact?: boolean;
    className?: string;
}

export async function AITermsGlossary({
    articleText,
    title = "AI Terimler Mini Sözlük",
    maxTerms = 8,
    compact = false,
    className,
}: AITermsGlossaryProps) {
    const terms = articleText
        ? await getRelevantAITermsForText(articleText, maxTerms)
        : (await getAITermsGlossary(maxTerms)).slice(0, maxTerms);

    if (terms.length === 0) {
        return null;
    }

    return (
        <section
            className={cn(
                "mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-4",
                className,
            )}
        >
            <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-ai-primary">
                    auto_awesome
                </span>
                <h2 className="text-sm font-semibold text-white">{title}</h2>
            </div>

            <div className="flex flex-wrap gap-2">
                {terms.map((item) => (
                    <Link
                        key={item.term}
                        href={`/ai-terimler#${getAITermAnchor(item.term)}`}
                        title={item.description}
                        className="rounded-full border border-ai-surface-border bg-ai-surface-dark px-3 py-1 text-xs font-semibold text-ai-text-secondary hover:text-white hover:border-ai-primary/40 transition-colors"
                    >
                        {item.term}
                    </Link>
                ))}
            </div>

            {!compact && (
                <div className="mt-4 space-y-2">
                    {terms.slice(0, 3).map((item) => (
                        <p key={item.term} className="text-xs text-ai-text-secondary leading-relaxed">
                            <span className="font-semibold text-white">{item.term}:</span> {item.description}
                        </p>
                    ))}
                </div>
            )}
        </section>
    );
}
