"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface GlossaryAlphabetNavProps {
    keys: string[];
    title: string;
    sectionIdPrefix?: string;
    className?: string;
}

export function GlossaryAlphabetNav({
    keys,
    title,
    sectionIdPrefix = "group-",
    className,
}: GlossaryAlphabetNavProps) {
    const [activeKey, setActiveKey] = useState<string>(keys[0] ?? "");

    const sectionIds = useMemo(
        () => keys.map((key) => `${sectionIdPrefix}${key}`),
        [keys, sectionIdPrefix],
    );

    useEffect(() => {
        if (!keys.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (!visible.length) return;

                const id = visible[0].target.id;
                const key = id.replace(sectionIdPrefix, "");
                if (key) {
                    setActiveKey(key);
                }
            },
            {
                root: null,
                rootMargin: "-20% 0px -65% 0px",
                threshold: [0.2, 0.5, 0.8],
            },
        );

        sectionIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [keys, sectionIdPrefix, sectionIds]);

    if (!keys.length) {
        return null;
    }

    return (
        <section
            className={cn(
                "sticky top-20 z-20 mb-6 rounded-2xl border border-ai-surface-border bg-ai-surface-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-ai-surface-card/80",
                className,
            )}
        >
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ai-text-secondary">
                {title}
            </h2>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {keys.map((key) => {
                    const isActive = key === activeKey;
                    return (
                        <a
                            key={`top-${key}`}
                            href={`#${sectionIdPrefix}${key}`}
                            onClick={() => setActiveKey(key)}
                            aria-current={isActive ? "true" : undefined}
                            className={cn(
                                "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-primary/60 transition-colors",
                                isActive
                                    ? "border-ai-primary/70 bg-ai-primary/15 text-white"
                                    : "border-ai-surface-border bg-ai-surface-dark text-ai-text-secondary hover:text-white hover:border-ai-primary/40",
                            )}
                        >
                            {key}
                        </a>
                    );
                })}
            </div>
        </section>
    );
}
