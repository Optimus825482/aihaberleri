"use client";

import Link from "next/link";
import Image from "next/image";
import { useSavedArticles } from "@/hooks/useSavedArticles";

export default function FavorilerPage() {
    const { savedArticles, removeSaved, savedCount } = useSavedArticles();

    return (
        <div className="min-h-screen bg-ai-background-dark">
            <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
                {/* Header */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ai-primary/20">
                        <span className="material-symbols-outlined text-[28px] text-ai-primary">
                            bookmark
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white sm:text-3xl">
                            Favori Haberlerim
                        </h1>
                        <p className="text-sm text-ai-text-secondary">
                            {savedCount > 0
                                ? `${savedCount} kayıtlı haber`
                                : "Henüz kayıtlı haber yok"}
                        </p>
                    </div>
                </div>

                {/* Empty State */}
                {savedCount === 0 && (
                    <div className="rounded-2xl border border-ai-surface-border bg-ai-surface-card p-8 text-center sm:p-12">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-ai-primary/10">
                            <span className="material-symbols-outlined text-[40px] text-ai-primary/60">
                                bookmark_add
                            </span>
                        </div>
                        <h2 className="mb-2 text-lg font-bold text-white">
                            Henüz favori haberin yok
                        </h2>
                        <p className="mx-auto mb-6 max-w-sm text-sm text-ai-text-secondary">
                            Haberleri okurken alttaki{" "}
                            <span className="inline-flex items-center gap-0.5 text-ai-primary">
                                <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                                Kaydet
                            </span>{" "}
                            butonuna basarak daha sonra okumak üzere kaydedebilirsin.
                        </p>
                        <Link
                            href="/news"
                            className="inline-flex items-center gap-2 rounded-xl bg-ai-primary px-6 py-3 text-sm font-bold text-white hover:bg-ai-primary-hover transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">newspaper</span>
                            Haberlere Göz At
                        </Link>
                    </div>
                )}

                {/* Saved Articles List */}
                {savedCount > 0 && (
                    <div className="space-y-4">
                        {savedArticles.map((article) => (
                            <div
                                key={article.id}
                                className="group relative flex gap-4 rounded-2xl border border-ai-surface-border bg-ai-surface-card p-4 transition-all hover:border-ai-primary/40 hover:bg-ai-surface-card/80"
                            >
                                {/* Image */}
                                <Link
                                    href={`/news/${article.slug}`}
                                    className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-36"
                                >
                                    {article.imageUrl ? (
                                        <Image
                                            src={article.imageUrl}
                                            alt={article.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 640px) 96px, 144px"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-ai-surface-dark">
                                            <span className="material-symbols-outlined text-[32px] text-ai-text-muted">
                                                image
                                            </span>
                                        </div>
                                    )}
                                </Link>

                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                    {article.category && (
                                        <span className="mb-1 inline-block rounded-md bg-ai-primary/20 px-2 py-0.5 text-[10px] font-semibold text-ai-primary">
                                            {article.category}
                                        </span>
                                    )}
                                    <Link href={`/news/${article.slug}`}>
                                        <h3 className="mb-1 line-clamp-2 text-sm font-bold text-white group-hover:text-ai-primary transition-colors sm:text-base">
                                            {article.title}
                                        </h3>
                                    </Link>
                                    <p className="line-clamp-2 text-xs text-ai-text-secondary sm:line-clamp-1">
                                        {article.excerpt}
                                    </p>
                                    <p className="mt-2 text-[10px] text-ai-text-muted">
                                        {formatSavedDate(article.savedAt)} kaydedildi
                                    </p>
                                </div>

                                {/* Remove Button */}
                                <button
                                    type="button"
                                    onClick={() => removeSaved(article.id)}
                                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-ai-text-muted hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                    title="Favorilerden Kaldır"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function formatSavedDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return new Date(timestamp).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
    });
}
