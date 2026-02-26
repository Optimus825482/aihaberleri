"use client";

import { useMemo } from "react";
import { useSavedArticles } from "@/hooks/useSavedArticles";

interface MobileArticleActionBarProps {
    title: string;
    url: string;
    articleId: string;
    slug?: string;
    imageUrl?: string | null;
    excerpt?: string;
    category?: string;
}

export function MobileArticleActionBar({
    title,
    url,
    articleId,
    slug = "",
    imageUrl = null,
    excerpt = "",
    category = "",
}: MobileArticleActionBarProps) {
    const { isSaved: checkSaved, toggleSave } = useSavedArticles();
    const saved = checkSaved(articleId);

    const shareData = useMemo(
        () => ({
            title,
            url,
            text: title,
        }),
        [title, url],
    );

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }

            await navigator.clipboard.writeText(url);
        } catch {
            // no-op
        }
    };

    const handleSave = () => {
        toggleSave(articleId, { title, slug, imageUrl: imageUrl ?? null, excerpt, category });
    };

    const handleListen = () => {
        const audioElement = document.getElementById("article-audio-player");
        if (!audioElement) return;
        audioElement.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <div className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 rounded-2xl border border-ai-surface-border bg-ai-surface-card/95 p-2 shadow-xl backdrop-blur md:hidden">
            <div className="grid grid-cols-3 gap-2">
                <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-ai-surface-border py-2 text-xs font-semibold text-ai-text-secondary hover:text-white"
                >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    Paylaş
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-ai-surface-border py-2 text-xs font-semibold text-ai-text-secondary hover:text-white"
                >
                    <span className="material-symbols-outlined text-[16px]">
                        {saved ? "bookmark" : "bookmark_add"}
                    </span>
                    {saved ? "Kaydedildi" : "Kaydet"}
                </button>

                <button
                    type="button"
                    onClick={handleListen}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-ai-surface-border py-2 text-xs font-semibold text-ai-text-secondary hover:text-white"
                >
                    <span className="material-symbols-outlined text-[16px]">headphones</span>
                    Dinle
                </button>
            </div>
        </div>
    );
}
