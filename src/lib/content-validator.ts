/**
 * Content Validator - Pre-publish quality control for articles
 * 
 * Detects and rejects garbage content, malformed HTML, and scraping artifacts
 * before articles are published.
 */

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100 quality score
  issues: string[];
  autoFixable: boolean;
  fixedContent?: string;
}

export interface ContentValidationInput {
  title: string;
  content: string;
  excerpt: string;
  sourceUrl: string;
}

// ============================================================================
// GARBAGE CONTENT PATTERNS - Things that should NEVER appear in published content
// ============================================================================

const CRITICAL_GARBAGE_PATTERNS = [
  // Scraping artifacts
  { pattern: /blob:http[s]?:\/\/localhost/gi, reason: 'Browser blob URL detected', severity: 'critical' },
  { pattern: /blob:http[s]?:\/\/[^"'\s]+/gi, reason: 'Browser blob URL detected', severity: 'critical' },
  { pattern: /shadow\s*dom/gi, reason: 'Shadow DOM warning in content', severity: 'critical' },
  { pattern: /Published\s*Time:\s*\d+/gi, reason: 'Raw metadata leak (Published Time)', severity: 'critical' },
  { pattern: /Warning:\s*This\s*page\s*contains/gi, reason: 'Scraping warning message', severity: 'critical' },
  
  // Raw metadata
  { pattern: /\[Image\s*\d+[:\]]/gi, reason: 'Image placeholder syntax', severity: 'high' },
  { pattern: /\!\[Image\s*\d+\]/gi, reason: 'Markdown image placeholder', severity: 'high' },
  { pattern: /\(blob:[^)]+\)/gi, reason: 'Blob URL in markdown link', severity: 'critical' },
  
  // MSN/Aggregator artifacts
  { pattern: /More\s*for\s*You\s*-+/gi, reason: 'MSN "More for You" section', severity: 'high' },
  { pattern: /Continue\s*reading\s*More\s*for\s*You/gi, reason: 'MSN continuation prompt', severity: 'high' },
  { pattern: /Expand\s*article\s*logo/gi, reason: 'Expand article UI element', severity: 'medium' },
  
  // Technical errors
  { pattern: /javascript\s*required/gi, reason: 'JavaScript required message', severity: 'critical' },
  { pattern: /enable\s*javascript/gi, reason: 'Enable JavaScript prompt', severity: 'critical' },
  { pattern: /cookies\s*must\s*be\s*enabled/gi, reason: 'Cookie wall', severity: 'critical' },
  { pattern: /access\s*denied/gi, reason: 'Access denied message', severity: 'critical' },
  { pattern: /403\s*forbidden/gi, reason: '403 error', severity: 'critical' },
  { pattern: /captcha/gi, reason: 'CAPTCHA challenge', severity: 'critical' },
  
  // Placeholder text
  { pattern: /lorem\s*ipsum/gi, reason: 'Lorem ipsum placeholder', severity: 'high' },
  { pattern: /\[placeholder\]/gi, reason: 'Placeholder text', severity: 'high' },
  { pattern: /\[TODO\]/gi, reason: 'TODO marker', severity: 'medium' },
  { pattern: /\[INSERT\s/gi, reason: 'INSERT placeholder', severity: 'medium' },
  
  // Mangled encoding
  { pattern: /Ã¼|Ã¶|Ã§|Ä±|ÅŸ|Ğ/g, reason: 'Mangled UTF-8 encoding', severity: 'high' },
  { pattern: /&#\d{4,};/g, reason: 'Unrendered HTML entities', severity: 'medium' },
];

// ============================================================================
// QUALITY THRESHOLDS
// ============================================================================

const QUALITY_THRESHOLDS = {
  MIN_TITLE_LENGTH: 10,
  MAX_TITLE_LENGTH: 200,
  MIN_CONTENT_LENGTH: 300,
  MIN_EXCERPT_LENGTH: 20,
  MAX_EXCERPT_LENGTH: 500,
  MIN_WORD_COUNT: 50,
  MAX_CONSECUTIVE_SPECIAL_CHARS: 5,
  MIN_ALPHANUMERIC_RATIO: 0.6,
};

// ============================================================================
// CONTENT VALIDATOR CLASS
// ============================================================================

export class ContentValidator {
  /**
   * Validate article content before publishing
   * Returns validation result with issues and potential fixes
   */
  static validate(input: ContentValidationInput): ValidationResult {
    const issues: string[] = [];
    let score = 100;
    let autoFixable = true;
    let content = input.content;

    // ========================================
    // CRITICAL PATTERN CHECKS
    // ========================================
    for (const { pattern, reason, severity } of CRITICAL_GARBAGE_PATTERNS) {
      if (pattern.test(input.content) || pattern.test(input.title) || pattern.test(input.excerpt)) {
        issues.push(`[${severity.toUpperCase()}] ${reason}`);
        
        if (severity === 'critical') {
          score -= 40;
          autoFixable = false; // Critical issues cannot be auto-fixed
        } else if (severity === 'high') {
          score -= 20;
        } else {
          score -= 10;
        }
      }
    }

    // ========================================
    // TITLE VALIDATION
    // ========================================
    if (input.title.length < QUALITY_THRESHOLDS.MIN_TITLE_LENGTH) {
      issues.push(`Title too short (${input.title.length} chars, min ${QUALITY_THRESHOLDS.MIN_TITLE_LENGTH})`);
      score -= 15;
    }
    if (input.title.length > QUALITY_THRESHOLDS.MAX_TITLE_LENGTH) {
      issues.push(`Title too long (${input.title.length} chars, max ${QUALITY_THRESHOLDS.MAX_TITLE_LENGTH})`);
      score -= 10;
    }
    // Check for title in wrong language (English title on Turkish site)
    // 🛡️ STRENGTHENED: English-only title on TR site is a CRITICAL issue, not just a warning
    if (/^[A-Za-z\s\-\d'".,!?:;()&@#$%—–]+$/.test(input.title) && input.title.length > 20) {
      // Check if it has Turkish characters (if yes, it's probably OK)
      const hasTurkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(input.title);
      if (!hasTurkishChars) {
        issues.push(`[CRITICAL] Title is entirely in English — TR articles MUST have Turkish titles`);
        score -= 40; // Was -5, now -40 to prevent publishing
        autoFixable = false;
      }
    }
    // Check for emergency template title pattern
    if (input.title.includes("— Gelişme Detayları")) {
      issues.push(`[CRITICAL] Emergency template title detected — content not properly synthesized`);
      score -= 40;
      autoFixable = false;
    }

    // ========================================
    // CONTENT VALIDATION
    // ========================================
    if (input.content.length < QUALITY_THRESHOLDS.MIN_CONTENT_LENGTH) {
      issues.push(`Content too short (${input.content.length} chars, min ${QUALITY_THRESHOLDS.MIN_CONTENT_LENGTH})`);
      score -= 30;
      autoFixable = false;
    }

    // Word count check (strip HTML first)
    const textOnly = input.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textOnly.split(/\s+/).length;
    if (wordCount < QUALITY_THRESHOLDS.MIN_WORD_COUNT) {
      issues.push(`Insufficient word count (${wordCount} words, min ${QUALITY_THRESHOLDS.MIN_WORD_COUNT})`);
      score -= 25;
      autoFixable = false;
    }

    // Alphanumeric ratio check
    const alphanumeric = (textOnly.match(/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u0600-\u06FF]/g) || []).length;
    const alphaRatio = textOnly.length > 0 ? alphanumeric / textOnly.length : 0;
    if (alphaRatio < QUALITY_THRESHOLDS.MIN_ALPHANUMERIC_RATIO) {
      issues.push(`Low text quality (${Math.round(alphaRatio * 100)}% readable characters)`);
      score -= 20;
      autoFixable = false;
    }

    // Check for excessive special characters in a row
    const specialCharSequence = textOnly.match(/[^\w\s]{5,}/g);
    if (specialCharSequence && specialCharSequence.length > 3) {
      issues.push(`Excessive special character sequences detected (${specialCharSequence.length} occurrences)`);
      score -= 15;
    }

    // ========================================
    // EXCERPT VALIDATION
    // ========================================
    if (input.excerpt.length < QUALITY_THRESHOLDS.MIN_EXCERPT_LENGTH) {
      issues.push(`Excerpt too short (${input.excerpt.length} chars)`);
      score -= 10;
    }
    if (input.excerpt.length > QUALITY_THRESHOLDS.MAX_EXCERPT_LENGTH) {
      issues.push(`Excerpt too long (${input.excerpt.length} chars)`);
      score -= 5;
    }

    // ========================================
    // HTML STRUCTURE VALIDATION
    // ========================================
    const openTags = (input.content.match(/<[a-z]+[^>]*>/gi) || []).length;
    const closeTags = (input.content.match(/<\/[a-z]+>/gi) || []).length;
    if (Math.abs(openTags - closeTags) > 5) {
      issues.push(`Unbalanced HTML tags (${openTags} open, ${closeTags} close)`);
      score -= 10;
    }

    // ========================================
    // ATTEMPT AUTO-FIX FOR MINOR ISSUES
    // ========================================
    if (autoFixable && issues.length > 0) {
      content = this.attemptAutoFix(content);
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    return {
      valid: score >= 60 && !issues.some(i => i.includes('[CRITICAL]')),
      score,
      issues,
      autoFixable,
      fixedContent: content !== input.content ? content : undefined,
    };
  }

  /**
   * Attempt to auto-fix minor content issues
   */
  private static attemptAutoFix(content: string): string {
    let fixed = content;

    // Remove blob URLs
    fixed = fixed.replace(/blob:http[s]?:\/\/[^"'\s)]+/gi, '');
    
    // Remove MSN artifacts
    fixed = fixed.replace(/More\s*for\s*You\s*-+[\s\S]*?(?=<\/|$)/gi, '');
    fixed = fixed.replace(/Continue\s*reading\s*More\s*for\s*You[\s\S]*?(?=<\/|$)/gi, '');
    
    // Remove image placeholders
    fixed = fixed.replace(/\[Image\s*\d+[:\]][^\]]*\]?/gi, '');
    fixed = fixed.replace(/\!\[Image\s*\d+\][^\)]*\)/gi, '');
    
    // === NEW: Strip raw markdown syntax that LLM sometimes leaves ===
    // Markdown images: ![alt text](url) -> remove entirely (images should be HTML <img>)
    fixed = fixed.replace(/!\[(?:Image\s*\d*[:\s]*)?[^\]]*\]\([^)]+\)/gi, '');
    // Markdown links: [text](url) -> keep text only
    fixed = fixed.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, '$1');
    fixed = fixed.replace(/\[([^\]]+)\]\(\/[^)]+\)/gi, '$1');
    
    // === NEW: Strip raw metadata leaks ===
    // "Published Time: 2026-02-20T11:55:32+00:00"
    fixed = fixed.replace(/Published\s*Time:\s*\d{4}-\d{2}-\d{2}T[\d:+\-.Z]+/gi, '');
    fixed = fixed.replace(/Published\s*Time:\s*[^\n<]{5,80}/gi, '');
    // Generic metadata fields
    fixed = fixed.replace(/(?:^|\n)(?:Title|Author|Date|Source|Category|Tags|Keywords):\s*[^\n<]+/gi, '');
    
    // === NEW: Strip navigation/breadcrumb artifacts ===
    fixed = fixed.replace(/^\s*\*\s*\[([^\]]+)\]\([^)]+\)\s*$/gm, '');
    fixed = fixed.replace(/^(?:Home|Ana\s*Sayfa)\s*[>›»]\s*(?:[^<\n]+[>›»]\s*){1,5}[^<\n]+$/gm, '');
    
    // === NEW: Strip markdown horizontal rules ===
    fixed = fixed.replace(/^={3,}\s*$/gm, '');
    fixed = fixed.replace(/^-{3,}\s*$/gm, '');
    
    // Remove empty paragraphs
    fixed = fixed.replace(/<p>\s*<\/p>/gi, '');
    fixed = fixed.replace(/<p>[\s;,]+<\/p>/gi, '');
    fixed = fixed.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "");
    
    // Clean up excessive whitespace
    fixed = fixed.replace(/\n{3,}/g, '\n\n');
    fixed = fixed.replace(/\s{3,}/g, ' ');

    return fixed.trim();
  }

  /**
   * Quick check if content is publishable
   */
  static isPublishable(input: ContentValidationInput): boolean {
    const result = this.validate(input);
    return result.valid && result.score >= 70;
  }

  /**
   * Get human-readable summary of validation result
   */
  static getSummary(result: ValidationResult): string {
    if (result.valid) {
      return `✅ Content passed validation (Score: ${result.score}/100)`;
    }
    
    const criticalCount = result.issues.filter(i => i.includes('[CRITICAL]')).length;
    const highCount = result.issues.filter(i => i.includes('[HIGH]')).length;
    
    return `❌ Content FAILED validation (Score: ${result.score}/100)\n` +
           `   Critical issues: ${criticalCount}\n` +
           `   High priority issues: ${highCount}\n` +
           `   Issues:\n${result.issues.map(i => `   - ${i}`).join('\n')}`;
  }
}

/**
 * Validate and optionally fix content before publishing
 * @returns null if content cannot be salvaged, otherwise returns fixed content
 */
export async function validateAndFixContent(
  input: ContentValidationInput
): Promise<{ success: boolean; content?: string; excerpt?: string; issues: string[] }> {
  const validation = ContentValidator.validate(input);
  
  console.log(ContentValidator.getSummary(validation));
  
  if (validation.valid) {
    return {
      success: true,
      content: validation.fixedContent || input.content,
      excerpt: input.excerpt,
      issues: validation.issues,
    };
  }
  
  // If auto-fixable, return fixed content
  if (validation.autoFixable && validation.fixedContent) {
    // Re-validate fixed content
    const revalidation = ContentValidator.validate({
      ...input,
      content: validation.fixedContent,
    });
    
    if (revalidation.valid) {
      console.log('✅ Content auto-fixed and passed re-validation');
      return {
        success: true,
        content: validation.fixedContent,
        excerpt: input.excerpt,
        issues: validation.issues,
      };
    }
  }
  
  // Content cannot be salvaged
  console.error('❌ Content cannot be salvaged - rejecting article');
  return {
    success: false,
    issues: validation.issues,
  };
}

export default ContentValidator;
