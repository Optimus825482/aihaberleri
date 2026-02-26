"use client";

import { useSavedArticles } from "@/hooks/useSavedArticles";

interface SaveArticleButtonProps {
    articleId: string;
    title: string;
    slug: string;
    imageUrl?: string | null;
    excerpt?: string;
    category?: string;
    variant?: "sidebar" | "card";
}

export function SaveArticleButton({
    articleId,
    title,
    slug,
    imageUrl = null,
    excerpt = "",
    category = "",
    variant = "sidebar",
}: SaveArticleButtonProps) {
    const { isSaved: checkSaved, toggleSave } = useSavedArticles();
    const saved = checkSaved(articleId);

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSave(articleId, {
            title,
            slug,
            imageUrl: imageUrl ?? null,
            excerpt,
            category,
        });
    };

    if (variant === "card") {
        return (
            <button
                type="button"
                onClick={handleToggle}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 ${saved
                        ? "text-ai-primary bg-ai-primary/10"
                        : "text-ai-text-secondary hover:text-ai-primary hover:bg-ai-primary/10"
                    }`}
                title={saved ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                aria-label={saved ? `Favorilerden çıkar: ${title}` : `Favorilere ekle: ${title}`}
            >
                <span className="material-symbols-outlined text-[18px]">
                    {saved ? "bookmark_added" : "bookmark_add"}
                </span>
            </button>
        );
    }

    // Sidebar variant — daha geniş buton
    return (
        <button
            type="button"
            onClick={handleToggle}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 border ${saved
                    ? "bg-ai-primary/15 text-ai-primary border-ai-primary/30 hover:bg-ai-primary/25"
                    : "bg-ai-surface-dark text-ai-text-secondary border-ai-surface-border hover:text-white hover:border-ai-primary/40 hover:bg-ai-surface-hover"
                }`}
        >
            <span className="material-symbols-outlined text-[20px]">
                {saved ? "bookmark_added" : "bookmark_add"}
            </span>
            {saved ? "Favorilere Kaydedildi" : "Favorilere Ekle"}
        </button>
    );
}
