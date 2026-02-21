"use client";

import { useMemo, useState } from "react";

interface MobileArticleActionBarProps {
    title: string;
    url: string;
    articleId: string;
}

const getSavedMap = (): Record<string, boolean> => {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem("saved_articles_map");
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

export function MobileArticleActionBar({
    title,
    url,
    articleId,
}: MobileArticleActionBarProps) {
    const [isSaved, setIsSaved] = useState(() => Boolean(getSavedMap()[articleId]));

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
        const map = getSavedMap();
        const next = !isSaved;
        map[articleId] = next;
        localStorage.setItem("saved_articles_map", JSON.stringify(map));
        setIsSaved(next);
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
                        {isSaved ? "bookmark" : "bookmark_add"}
                    </span>
                    {isSaved ? "Kaydedildi" : "Kaydet"}
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
