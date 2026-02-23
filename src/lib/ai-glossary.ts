import { db } from "@/lib/db";
import { callDeepSeek } from "@/lib/deepseek";

type GlossaryDelegate = {
  upsert: (...args: any[]) => Promise<any>;
  findMany: (...args: any[]) => Promise<any[]>;
  findUnique: (...args: any[]) => Promise<any | null>;
};

const glossaryTable = (db as unknown as { aIGlossaryTerm?: GlossaryDelegate })
  .aIGlossaryTerm;

let isGlossaryTableUnavailable = false;
let glossaryUnavailableLogged = false;

export interface AITermEntry {
  term: string;
  description: string;
  aliases?: string[];
}

const shouldSkipDbAccess = () => process.env.SKIP_ENV_VALIDATION === "1";

function isMissingGlossaryTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as {
    code?: string;
    meta?: { modelName?: string; table?: string };
    message?: string;
  };

  if (maybeError.code === "P2021") {
    const modelName = maybeError.meta?.modelName || "";
    const table = maybeError.meta?.table || "";
    if (modelName === "AIGlossaryTerm" || table.includes("AIGlossaryTerm")) {
      return true;
    }
  }

  return typeof maybeError.message === "string"
    ? maybeError.message.includes("AIGlossaryTerm") &&
        maybeError.message.includes("does not exist")
    : false;
}

function markGlossaryTableUnavailable(error: unknown): void {
  isGlossaryTableUnavailable = true;
  if (!glossaryUnavailableLogged) {
    glossaryUnavailableLogged = true;
    console.warn(
      "AI glossary table unavailable (AIGlossaryTerm). Falling back to default glossary terms until migrations are applied.",
    );
    console.warn(error);
  }
}

const DEFAULT_GLOSSARY_TERMS: AITermEntry[] = [
  {
    term: "RAG",
    aliases: ["Retrieval-Augmented Generation"],
    description:
      "Retrieval-Augmented Generation: modelin yanıt üretmeden önce dış kaynaklardan bilgi çekerek daha doğru cevap vermesi.",
  },
  {
    term: "Fine-tuning",
    aliases: ["fine tuning"],
    description:
      "Önceden eğitilmiş bir modeli belirli bir görev veya veri kümesine göre yeniden eğiterek özelleştirme süreci.",
  },
  {
    term: "Latency",
    description:
      "Bir isteğin gönderilmesi ile yanıtın alınması arasındaki gecikme süresi.",
  },
  {
    term: "Token",
    description:
      "Modelin metni işlerken kullandığı en küçük anlamlı metin birimi.",
  },
  {
    term: "Hallucination",
    aliases: ["halüsinasyon"],
    description:
      "Modelin gerçekte olmayan veya doğrulanmamış bilgiyi doğruymuş gibi üretmesi.",
  },
  {
    term: "LLM",
    aliases: ["Large Language Model"],
    description:
      "Büyük metin veri setleriyle eğitilmiş, dil anlama ve üretme yeteneği yüksek yapay zekâ modeli.",
  },
  {
    term: "Prompt",
    aliases: ["prompt engineering"],
    description:
      "Modelden istenen çıktıyı almak için verilen komut veya bağlam metni.",
  },
  {
    term: "Inference",
    description:
      "Eğitilmiş modelin, canlı kullanımda yeni girdilere yanıt üretme aşaması.",
  },
  {
    term: "Embedding",
    aliases: ["vector embedding"],
    description:
      "Metin veya veriyi, anlam benzerliğini sayısal olarak temsil eden vektör forma dönüştürme yöntemi.",
  },
  {
    term: "Transformer",
    description:
      "Dikkat (attention) mekanizmasına dayanan ve modern dil modellerinin temelini oluşturan mimari.",
  },
  {
    term: "Multimodal",
    aliases: ["çoklu modal"],
    description:
      "Modelin metin, görsel, ses gibi farklı veri türlerini birlikte işleyebilmesi.",
  },
  {
    term: "Context Window",
    aliases: ["context length"],
    description:
      "Modelin tek seferde dikkate alabileceği maksimum token/metin miktarı.",
  },
  {
    term: "Agent",
    aliases: ["AI agent", "otonom ajan"],
    description:
      "Belirli bir hedef için plan yapan, araç kullanan ve adım adım görev yürüten yapay zekâ sistemi.",
  },
  {
    term: "MCP",
    aliases: ["Model Context Protocol"],
    description:
      "Model ile harici araç/veri kaynakları arasında standart bir entegrasyon protokolü.",
  },
  {
    term: "Vector Database",
    aliases: ["vektör veritabanı"],
    description:
      "Embedding vektörlerini saklayıp benzerlik araması yapmaya optimize edilmiş veritabanı türü.",
  },
  {
    term: "Quantization",
    description:
      "Model ağırlıklarını daha düşük bit hassasiyetinde temsil ederek hız ve maliyet avantajı sağlama tekniği.",
  },
  {
    term: "Distillation",
    description:
      "Büyük bir modelin bilgisini daha küçük bir modele aktararak verimli model üretme yaklaşımı.",
  },
  {
    term: "Zero-shot",
    description:
      "Modelin ek örnek verilmeden yalnızca talimatla yeni bir görevi yerine getirmesi.",
  },
  {
    term: "Few-shot",
    description:
      "Modelin görev öncesinde az sayıda örnek görerek doğru çıktı üretmesi.",
  },
  {
    term: "Guardrail",
    aliases: ["güvenlik kuralı"],
    description:
      "Model çıktısını güvenlik, kalite ve politika kurallarına göre sınırlandıran kontrol katmanı.",
  },
];

type ExtractedTerm = {
  term: string;
  description: string;
  aliases?: string[];
  confidence?: number;
};

function normalizeTerm(term: string): string {
  return term.normalize("NFKC").trim().toLowerCase();
}

function toAnchor(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-çğıöşü]/gi, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeForRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeAliases(aliases: string[] | undefined): string[] {
  if (!aliases?.length) return [];
  return Array.from(
    new Set(
      aliases
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 8),
    ),
  );
}

function mergeEntries(entries: AITermEntry[]): AITermEntry[] {
  const map = new Map<string, AITermEntry>();

  for (const entry of entries) {
    const key = normalizeTerm(entry.term);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        term: entry.term.trim(),
        description: entry.description.trim(),
        aliases: sanitizeAliases(entry.aliases),
      });
      continue;
    }

    const description =
      existing.description.length >= entry.description.length
        ? existing.description
        : entry.description;

    const aliases = sanitizeAliases([
      ...(existing.aliases ?? []),
      ...(entry.aliases ?? []),
    ]);

    map.set(key, {
      term: existing.term,
      description,
      aliases,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.term.localeCompare(b.term, "tr"),
  );
}

async function ensureDefaultGlossaryTerms(): Promise<void> {
  if (!glossaryTable || isGlossaryTableUnavailable) {
    return;
  }

  const now = new Date();

  for (const term of DEFAULT_GLOSSARY_TERMS) {
    const normalizedTerm = normalizeTerm(term.term);

    try {
      await glossaryTable.upsert({
        where: { normalizedTerm },
        update: {
          aliases: sanitizeAliases(term.aliases),
          updatedAt: now,
        },
        create: {
          term: term.term.trim(),
          normalizedTerm,
          description: term.description.trim(),
          aliases: sanitizeAliases(term.aliases),
          source: "SYSTEM",
          confidence: 1,
          isActive: true,
          lastSeenAt: now,
        },
      });
    } catch (error) {
      if (isMissingGlossaryTableError(error)) {
        markGlossaryTableUnavailable(error);
        return;
      }
      throw error;
    }
  }
}

async function detectTermsWithAI(input: {
  title: string;
  excerpt?: string | null;
  content: string;
  keywords?: string[];
}): Promise<ExtractedTerm[]> {
  const sourceText = [
    `Başlık: ${input.title}`,
    input.excerpt ? `Özet: ${input.excerpt}` : "",
    `Anahtar kelimeler: ${(input.keywords ?? []).join(", ")}`,
    `İçerik: ${input.content.slice(0, 7000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    {
      role: "system" as const,
      content:
        "Sen teknik terim tespit uzmanısın. Görev: Haber metnindeki, normal kullanıcının anlamakta zorlanabileceği AI/teknoloji terimlerini tespit edip kısa, doğru ve sade Türkçe açıklama üretmek. Sadece JSON döndür.",
    },
    {
      role: "user" as const,
      content: `Aşağıdaki metin için en fazla 8 terim çıkar.\n\nKurallar:\n- Sadece AI/teknoloji ile ilgili ve açıklanmaya değer terimler\n- Çok genel kelime (internet, yazılım vb.) üretme\n- Açıklama 1 cümle, sade Türkçe\n- Çıktı sadece JSON array olmalı\n- Her öğe şeması: {"term":"...","description":"...","aliases":["..."],"confidence":0.0-1.0}\n\nMetin:\n${sourceText}`,
    },
  ];

  try {
    const raw = await callDeepSeek(messages, {
      temperature: 0.2,
      maxTokens: 1200,
    });

    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");

    if (
      firstBracket === -1 ||
      lastBracket === -1 ||
      lastBracket <= firstBracket
    ) {
      return [];
    }

    const jsonStr = raw.slice(firstBracket, lastBracket + 1);
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is ExtractedTerm => {
        return (
          !!item &&
          typeof item === "object" &&
          typeof item.term === "string" &&
          typeof item.description === "string"
        );
      })
      .map((item) => ({
        term: item.term.trim(),
        description: item.description.trim(),
        aliases: sanitizeAliases(item.aliases),
        confidence:
          typeof item.confidence === "number"
            ? Math.max(0, Math.min(1, item.confidence))
            : 0.7,
      }))
      .filter((item) => item.term.length >= 2 && item.description.length >= 8)
      .slice(0, 8);
  } catch (error) {
    console.error("AI glossary term detection failed:", error);
    return [];
  }
}

function fallbackExtractFromKeywords(input: {
  keywords?: string[];
}): ExtractedTerm[] {
  const keywords = input.keywords ?? [];
  const candidates = keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 3)
    .slice(0, 5);

  return candidates.map((term) => ({
    term,
    description: `${term} terimi, yapay zeka ve teknoloji haberlerinde geçen teknik bir kavramdır.`,
    aliases: [],
    confidence: 0.4,
  }));
}

export async function getAITermsGlossary(limit = 80): Promise<AITermEntry[]> {
  if (shouldSkipDbAccess() || isGlossaryTableUnavailable) {
    return DEFAULT_GLOSSARY_TERMS.slice(0, Math.max(1, limit));
  }

  try {
    await ensureDefaultGlossaryTerms();

    if (!glossaryTable) {
      return DEFAULT_GLOSSARY_TERMS.slice(0, Math.max(1, limit));
    }

    const rows = await glossaryTable.findMany({
      where: { isActive: true },
      orderBy: [{ usageCount: "desc" }, { term: "asc" }],
      take: Math.max(1, limit),
      select: {
        term: true,
        description: true,
        aliases: true,
      },
    });

    return mergeEntries(rows);
  } catch (error) {
    if (isMissingGlossaryTableError(error)) {
      markGlossaryTableUnavailable(error);
      return DEFAULT_GLOSSARY_TERMS.slice(0, Math.max(1, limit));
    }
    console.error("Failed to get glossary terms from table:", error);
    return DEFAULT_GLOSSARY_TERMS.slice(0, Math.max(1, limit));
  }
}

export async function getRelevantAITermsForText(
  text: string,
  limit = 8,
): Promise<AITermEntry[]> {
  const glossary = await getAITermsGlossary(200);
  return findRelevantAITerms(text, glossary, limit);
}

export function findRelevantAITerms(
  text: string,
  glossaryTerms: AITermEntry[],
  limit = 8,
): AITermEntry[] {
  const haystack = text.toLowerCase();

  const scored = glossaryTerms
    .map((term) => {
      const candidates = [term.term, ...(term.aliases ?? [])];
      let score = 0;

      for (const candidate of candidates) {
        const regex = new RegExp(
          `\\b${escapeForRegex(candidate.toLowerCase())}\\b`,
          "gi",
        );
        const matches = haystack.match(regex);
        if (matches?.length) {
          score += matches.length;
        }
      }

      return { term, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.term.term.localeCompare(b.term.term, "tr"),
    );

  return scored.slice(0, Math.max(1, limit)).map((item) => item.term);
}

export async function upsertGlossaryWithArticleTerms(input: {
  title: string;
  excerpt?: string | null;
  content: string;
  keywords?: string[];
  source?: string;
}): Promise<void> {
  if (shouldSkipDbAccess() || isGlossaryTableUnavailable) {
    return;
  }

  try {
    await ensureDefaultGlossaryTerms();

    if (!glossaryTable) {
      return;
    }

    const aiDetected = await detectTermsWithAI(input);
    const fallbackDetected = fallbackExtractFromKeywords(input);
    const candidates = mergeEntries([
      ...aiDetected,
      ...fallbackDetected,
      ...DEFAULT_GLOSSARY_TERMS,
    ]);

    const combinedText = [
      input.title,
      input.excerpt ?? "",
      input.content,
      ...(input.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();

    const now = new Date();

    for (const candidate of candidates) {
      const termsToMatch = [
        candidate.term,
        ...(candidate.aliases ?? []),
      ].filter(Boolean);

      const matched = termsToMatch.some((part) => {
        const regex = new RegExp(
          `\\b${escapeForRegex(part.toLowerCase())}\\b`,
          "i",
        );
        return regex.test(combinedText);
      });

      if (!matched) continue;

      const normalizedTerm = normalizeTerm(candidate.term);
      const existing = await glossaryTable.findUnique({
        where: { normalizedTerm },
        select: {
          usageCount: true,
          aliases: true,
          source: true,
          description: true,
        },
      });

      await glossaryTable.upsert({
        where: { normalizedTerm },
        update: {
          description:
            candidate.description.length > (existing?.description.length ?? 0)
              ? candidate.description
              : (existing?.description ?? candidate.description),
          aliases: sanitizeAliases([
            ...(existing?.aliases ?? []),
            ...(candidate.aliases ?? []),
          ]),
          usageCount: (existing?.usageCount ?? 0) + 1,
          confidence:
            aiDetected.find(
              (item) => normalizeTerm(item.term) === normalizedTerm,
            )?.confidence ?? undefined,
          source: existing?.source ?? input.source ?? "AGENT",
          isActive: true,
          lastSeenAt: now,
          updatedAt: now,
        },
        create: {
          term: candidate.term,
          normalizedTerm,
          description: candidate.description,
          aliases: sanitizeAliases(candidate.aliases),
          source: input.source ?? "AGENT",
          confidence:
            aiDetected.find(
              (item) => normalizeTerm(item.term) === normalizedTerm,
            )?.confidence ?? 0.65,
          usageCount: 1,
          isActive: true,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  } catch (error) {
    if (isMissingGlossaryTableError(error)) {
      markGlossaryTableUnavailable(error);
      return;
    }
    console.error("AI glossary enrichment failed:", error);
  }
}

export function getAITermAnchor(term: string): string {
  return toAnchor(term);
}
