"use client";

import { useState } from "react";
import { Bot, ExternalLink, Info } from "lucide-react";

interface AIDisclaimerProps {
    sourceUrl?: string | null;
    sourceName?: string;
    className?: string;
}

/**
 * AI Disclaimer Badge
 * Haberin AI tarafından yeniden yazıldığını belirten şık bir badge
 * E-E-A-T uyumlu şeffaflık bildirimi
 */
export function AIDisclaimer({
    sourceUrl,
    sourceName,
    className = "",
}: AIDisclaimerProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Kaynak adını URL'den çıkar (eğer sourceName yoksa)
    const extractedSourceName = sourceName || (sourceUrl ? new URL(sourceUrl).hostname.replace("www.", "") : null);

    return (
        <div className={`relative inline-block ${className}`}>
            {/* Main Badge */}
            <div
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full 
                   bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                   dark:from-blue-500/20 dark:to-purple-500/20
                   border border-blue-500/20 dark:border-blue-400/30
                   hover:border-blue-500/40 dark:hover:border-blue-400/50
                   transition-all duration-300 cursor-help"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                role="note"
                aria-label="Bu haber yapay zeka tarafından yeniden yazılmıştır"
                tabIndex={0}
            >
                <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    AI ile düzenlendi
                </span>
                <Info className="h-3 w-3 text-blue-500/60 dark:text-blue-400/60 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div
                    className="absolute z-50 bottom-full left-0 mb-2 w-72 p-4 
                     bg-white dark:bg-gray-900 
                     rounded-xl shadow-xl border border-gray-200 dark:border-gray-700
                     animate-in fade-in-0 zoom-in-95 duration-200"
                    role="tooltip"
                >
                    <div className="space-y-3">
                        <div className="flex items-start gap-2">
                            <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    AI Destekli İçerik
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Bu haber, yapay zeka teknolojisi kullanılarak orijinal
                                    kaynaklardan Türkçe&apos;ye uyarlanmış ve yeniden yazılmıştır.
                                </p>
                            </div>
                        </div>

                        {sourceUrl && extractedSourceName && (
                            <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 
                         hover:text-blue-800 dark:hover:text-blue-300 
                         transition-colors group/link"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="h-3 w-3" />
                                <span className="group-hover/link:underline">
                                    Orijinal kaynak: {extractedSourceName}
                                </span>
                            </a>
                        )}

                        <p className="text-[10px] text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                            AI Haberleri, şeffaflık ilkesiyle çalışır. İçeriklerimiz
                            editöryal süreçten geçirilmektedir.
                        </p>
                    </div>

                    {/* Tooltip Arrow */}
                    <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-white dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-700 transform rotate-45" />
                </div>
            )}
        </div>
    );
}

/**
 * Compact AI Disclaimer - Daha küçük versiyon
 * Sidebar veya liste görünümleri için
 */
export function AIDisclaimerCompact({ className = "" }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                 bg-blue-500/10 dark:bg-blue-500/20
                 text-[10px] font-medium text-blue-600 dark:text-blue-400
                 ${className}`}
            title="Bu haber yapay zeka tarafından yeniden yazılmıştır"
        >
            <Bot className="h-3 w-3" />
            AI
        </span>
    );
}
