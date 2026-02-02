const title1 = "Meta Platforms: Don't Fear AI Spending";
const title2 = "Meta Defends Massive AI Investment Plans";

function extractEntities(title: string): string[] {
  const lowerTitle = title.toLowerCase();
  const entities: string[] = [];
  const techEntities = [
    "openai",
    "nvidia",
    "google",
    "meta",
    "microsoft",
    "apple",
    "amazon",
    "tesla",
    "anthropic",
    "deepmind",
    "facebook",
    "instagram",
    "twitter",
    "x",
    "tiktok",
    "youtube",
    "chatgpt",
    "gemini",
    "claude",
    "grok",
    "copilot",
    "waymo",
    "uber",
    "lyft",
    "spacex",
    "neuralink",
  ];

  for (const entity of techEntities) {
    if (lowerTitle.includes(entity)) {
      entities.push(entity);
    }
  }

  return entities;
}

function extractKeywords(title: string): string[] {
  const stopWords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "s",
  ];

  // AI-specific keywords (even if short)
  const aiKeywords = ["ai", "ml", "gpt", "llm", "api"];

  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => {
      // Include AI keywords even if short
      if (aiKeywords.includes(word)) return true;
      // Otherwise, filter by length and stopwords
      return word.length > 2 && !stopWords.includes(word);
    });
}

const e1 = extractEntities(title1);
const e2 = extractEntities(title2);
const k1 = extractKeywords(title1);
const k2 = extractKeywords(title2);
const commonE = e1.filter((e) => e2.includes(e));
const commonK = k1.filter((k) => k2.includes(k));
const sim = commonK.length / Math.max(k1.length, 1);

console.log("Title 1:", title1);
console.log("Entities 1:", e1);
console.log("Keywords 1:", k1);
console.log("");
console.log("Title 2:", title2);
console.log("Entities 2:", e2);
console.log("Keywords 2:", k2);
console.log("");
console.log("Common entities:", commonE);
console.log("Common keywords:", commonK);
console.log("Similarity:", (sim * 100).toFixed(1) + "%");
console.log("Should be duplicate?", commonE.length >= 1 && sim >= 0.3);
