"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export function ReadingProgressBar() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

            if (maxScroll <= 0) {
                setProgress(0);
                return;
            }

            const next = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
            setProgress(next);
        };

        updateProgress();
        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);

        return () => {
            window.removeEventListener("scroll", updateProgress);
            window.removeEventListener("resize", updateProgress);
        };
    }, []);

    return (
        <div className="fixed top-16 left-0 right-0 z-30" aria-hidden="true">
            <Progress value={progress} className="h-0.5 rounded-none" />
        </div>
    );
}
