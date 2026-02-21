/**
 * Content Sanitizer - Clean raw markdown, metadata leaks, and source artifacts
 * from article content before display or storage.
 *
 * This is the LAST LINE OF DEFENSE before content reaches the user.
 * Even if content.service.ts or content-validator.ts miss something,
 * this utility will strip it at render time.
 */

/**
 * Patterns that indicate raw source/metadata leaks in content
 * These should NEVER appear in published article HTML
 */
const RAW_CONTENT_PATTERNS: Array<{
  pattern: RegExp;
  replacement: string;
  label: string;
}> = [
  // === RAW METADATA LEAKS ===
  // "Published Time: 2026-02-20T11:55:32+00:00" type leaks
  {
    pattern: /Published\s*Time:\s*\d{4}-\d{2}-\d{2}T[\d:+\-.Z]+/gi,
    replacement: "",
    label: "Published Time metadata",
  },
  {
    pattern: /Published\s*Time:\s*[^\n<]{5,80}/gi,
    replacement: "",
    label: "Published Time text",
  },

  // === MARKDOWN SYNTAX IN HTML CONTENT ===
  // ![Image 1: Title](url) — markdown image syntax
  {
    pattern: /!\[(?:Image\s*\d*[:\s]*)?[^\]]*\]\([^)]+\)/gi,
    replacement: "",
    label: "Markdown image",
  },
  // [Link text](url) — markdown link syntax (but preserve the text)
  {
    pattern: /\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi,
    replacement: "$1",
    label: "Markdown link",
  },
  // [Link text](relative-url) — markdown link with relative URL
  {
    pattern: /\[([^\]]+)\]\(\/[^)]+\)/gi,
    replacement: "$1",
    label: "Markdown relative link",
  },

  // === SOURCE NAVIGATION/MENU ARTIFACTS ===
  // "* [Menu Item](url)" type leaks from scraping
  {
    pattern: /^\s*\*\s*\[([^\]]+)\]\([^)]+\)\s*$/gm,
    replacement: "",
    label: "Menu item list",
  },
  // Horizontal rules from markdown
  {
    pattern: /^={3,}\s*$/gm,
    replacement: "",
    label: "Markdown horizontal rule (=)",
  },
  {
    pattern: /^-{3,}\s*$/gm,
    replacement: "",
    label: "Markdown horizontal rule (-)",
  },

  // === RAW SOURCE SITE ELEMENTS ===
  // Navigation breadcrumbs like "Home > Category > Article"
  {
    pattern:
      /^(?:Home|Ana\s*Sayfa)\s*[>›»]\s*(?:[^<\n]+[>›»]\s*){1,5}[^<\n]+$/gm,
    replacement: "",
    label: "Breadcrumb navigation",
  },
  // "Share this article" / social buttons text
  {
    pattern:
      /(?:Share|Paylaş)\s*(?:this|bu)\s*(?:article|haber|makale)[:\s]*/gi,
    replacement: "",
    label: "Share prompt",
  },
  // "Read more" / "Continue reading" prompts
  {
    pattern: /(?:Read more|Continue reading|Devamını oku)\s*[→»>]?\s*$/gm,
    replacement: "",
    label: "Read more prompt",
  },
  // "More for You" MSN artifacts
  {
    pattern: /More\s*for\s*You\s*[-=]+[\s\S]*?(?=<\/|$)/gi,
    replacement: "",
    label: "MSN More for You",
  },

  // === ENCODING/ESCAPING ISSUES ===
  // HTML entities that weren't rendered
  {
    pattern: /&amp;(#\d+;|[a-z]+;)/gi,
    replacement: "&$1",
    label: "Double-encoded HTML entity",
  },

  // === RAW METADATA BLOCKS ===
  // Blocks that start with metadata-like patterns
  {
    pattern:
      /(?:^|\n)(?:Title|Author|Date|Source|Category|Tags|Keywords):\s*[^\n]+/gi,
    replacement: "",
    label: "Metadata field",
  },

  // === EXCESSIVE WHITESPACE CLEANUP ===
  // Multiple blank lines
  { pattern: /\n{4,}/g, replacement: "\n\n", label: "Excessive blank lines" },
  // Multiple spaces
  { pattern: / {3,}/g, replacement: " ", label: "Excessive spaces" },
];

/**
 * Sanitize article content for display
 * Removes raw markdown, metadata leaks, and source artifacts
 *
 * @param content - HTML content to sanitize
 * @returns Cleaned HTML content safe for display
 */
export function sanitizeArticleContent(content: string): string {
  if (!content) return "";

  let sanitized = content;

  for (const { pattern, replacement } of RAW_CONTENT_PATTERNS) {
    // Reset lastIndex for global regex patterns
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, replacement);
  }

  // Final cleanup: remove empty paragraphs that might result from stripping
  sanitized = sanitized.replace(/<p>\s*<\/p>/gi, "");
  sanitized = sanitized.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "");

  // Remove leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Check if content has raw markdown or metadata that needs sanitization
 * Useful for logging/monitoring without modifying content
 *
 * @param content - Content to check
 * @returns Array of detected issues
 */
export function detectContentIssues(content: string): string[] {
  if (!content) return [];

  const issues: string[] = [];

  for (const { pattern, label } of RAW_CONTENT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      issues.push(label);
    }
  }

  return issues;
}

/**
 * Sanitize content specifically for audio/TTS playback
 * More aggressive stripping - removes ALL HTML and non-speech content
 *
 * @param content - HTML content
 * @returns Plain text suitable for TTS
 */
export function sanitizeForAudio(content: string): string {
  if (!content) return "";

  let text = sanitizeArticleContent(content);

  // Strip ALL HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s<]+/gi, "");

  // Remove special characters that don't sound good in TTS
  text = text.replace(/[#*_~`|]/g, "");
  text = text.replace(/\[|\]/g, "");
  text = text.replace(/\(|\)/g, "");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
