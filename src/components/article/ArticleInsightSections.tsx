import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { InsightLocale, TimelineItem } from "@/lib/article-insights";

interface InsightTopSectionsProps {
    locale: InsightLocale;
    summaryPoints: string[];
    whyImportantPoints: string[];
}

interface TimelineSectionProps {
    locale: InsightLocale;
    items: TimelineItem[];
    currentArticleId: string;
}

const labels = {
    tr: {
        summaryTitle: "3 Maddede Özet",
        importanceTitle: "Bu Haber Neden Önemli?",
        timelineTitle: "Aynı Konuda Zaman Çizgisi",
    },
    en: {
        summaryTitle: "3-Point Summary",
        importanceTitle: "Why It Matters",
        timelineTitle: "Timeline on This Topic",
    },
} as const;

export function ArticleInsightTopSections({
    locale,
    summaryPoints,
    whyImportantPoints,
}: InsightTopSectionsProps) {
    const t = labels[locale];

    return (
        <>
            {summaryPoints.length > 0 && (
                <section className="mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-5">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                        <span className="material-symbols-outlined text-[20px] text-ai-primary">
                            summarize
                        </span>
                        {t.summaryTitle}
                    </h2>
                    <ul className="space-y-2">
                        {summaryPoints.map((point, index) => (
                            <li
                                key={`summary-${locale}-${index}`}
                                className="flex items-start gap-2 text-sm text-ai-text-secondary"
                            >
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ai-primary/20 text-xs font-bold text-ai-primary">
                                    {index + 1}
                                </span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {whyImportantPoints.length > 0 && (
                <section className="mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-5">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                        <span className="material-symbols-outlined text-[20px] text-ai-primary">
                            psychology_alt
                        </span>
                        {t.importanceTitle}
                    </h2>
                    <ul className="space-y-2">
                        {whyImportantPoints.map((point, index) => (
                            <li
                                key={`importance-${locale}-${index}`}
                                className="flex items-start gap-2 text-sm text-ai-text-secondary"
                            >
                                <span className="material-symbols-outlined text-[16px] text-ai-primary mt-0.5">
                                    check_circle
                                </span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}

export function ArticleTimelineSection({
    locale,
    items,
    currentArticleId,
}: TimelineSectionProps) {
    if (items.length <= 1) return null;

    const t = labels[locale];
    const newsBase = locale === "en" ? "/en/news" : "/news";

    return (
        <section className="mt-12 rounded-xl border border-ai-surface-border bg-ai-surface-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span className="material-symbols-outlined text-[20px] text-ai-primary">
                    timeline
                </span>
                {t.timelineTitle}
            </h2>
            <ol className="space-y-4 border-l border-ai-surface-border pl-4">
                {items.map((item) => (
                    <li key={`timeline-${locale}-${item.id}`} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-ai-primary" />
                        <div className="text-xs text-ai-text-muted">
                            {item.publishedAt ? formatDate(item.publishedAt) : ""}
                        </div>
                        {item.id === currentArticleId ? (
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                        ) : (
                            <Link
                                href={`${newsBase}/${item.slug}`}
                                className="text-sm font-semibold text-white hover:text-ai-primary transition-colors"
                            >
                                {item.title}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}
