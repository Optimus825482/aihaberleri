"use client";

import { useAudio } from "@/context/AudioContext";
import { useMemo } from "react";
import { sanitizeArticleContent } from "@/lib/content-sanitizer";

interface HighlightedTextProps {
  htmlContent: string;
  articleTitle: string;
}

export function HighlightedText({ htmlContent, articleTitle }: HighlightedTextProps) {
  const { currentWordIndex, metadata, title: activeTitle, isPlaying } = useAudio();
  
  // Only highlight if this article is the one being played
  const isActive = isPlaying && activeTitle === articleTitle;

  // Sanitize content: strip raw markdown, metadata leaks, source artifacts
  const cleanContent = useMemo(() => sanitizeArticleContent(htmlContent), [htmlContent]);

  // If not active, just show original HTML
  if (!isActive || metadata.length === 0) {
    return <div dangerouslySetInnerHTML={{ __html: cleanContent }} />;
  }

  // Reading mode: We render the words as spans
  // Note: This loses original formatting like bold/links during active reading.
  // Professional implementation would use a virtual DOM parser to wrap words within tags.
  
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
      {metadata.map((word, idx) => {
        // Skip title words if they are in metadata (they usually are if sent together)
        // metadata from edge-tts includes everything sent.
        
        const isHighlighted = currentWordIndex === idx;
        
        return (
          <span
            key={idx}
            className={`transition-colors duration-150 ${
              isHighlighted 
                ? "bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white px-0.5 rounded shadow-sm" 
                : ""
            }`}
          >
            {word.text}{" "}
          </span>
        );
      })}
    </div>
  );
}
