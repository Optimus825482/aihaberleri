"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type TermItem = {
    term: string;
    description: string;
};

const TERMS: TermItem[] = [
    {
        term: "RAG",
        description:
            "Retrieval-Augmented Generation: Modelin yanıt üretmeden önce dış kaynaktan bilgi çekmesi.",
    },
    {
        term: "Fine-tuning",
        description:
            "Modelin belirli bir görev/veri için ek eğitimle özelleştirilmesi.",
    },
    {
        term: "Latency",
        description:
            "Kullanıcı isteği ile model yanıtı arasındaki gecikme süresi.",
    },
    {
        term: "Token",
        description:
            "Modelin metni işlemek için kullandığı en küçük metin parçaları.",
    },
    {
        term: "Hallucination",
        description:
            "Modelin gerçekte olmayan veya doğrulanmamış bilgi üretmesi.",
    },
];

export function AITermsGlossary() {
    return (
        <section className="mb-8 rounded-xl border border-ai-surface-border bg-ai-surface-card p-4">
            <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-ai-primary">
                    auto_awesome
                </span>
                <h2 className="text-sm font-semibold text-white">AI Terimler Mini Sözlük</h2>
            </div>

            <TooltipProvider delayDuration={120}>
                <div className="flex flex-wrap gap-2">
                    {TERMS.map((item) => (
                        <Tooltip key={item.term}>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="rounded-full border border-ai-surface-border bg-ai-surface-dark px-3 py-1 text-xs font-semibold text-ai-text-secondary hover:text-white hover:border-ai-primary/40 transition-colors"
                                >
                                    {item.term}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
                                {item.description}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </TooltipProvider>
        </section>
    );
}
