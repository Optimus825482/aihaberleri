import { db } from "@/lib/db";

export interface AITermEntry {
  term: string;
  description: string;
  aliases?: string[];
}

const GLOSSARY_SETTING_KEY = "site_ai_terms_glossary";

const shouldSkipDbAccess = () => process.env.SKIP_ENV_VALIDATION === "1";

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

function parseGlossary(rawValue: string | undefined): AITermEntry[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is AITermEntry => {
        return (
          !!item &&
          typeof item === "object" &&
          typeof (item as AITermEntry).term === "string" &&
          typeof (item as AITermEntry).description === "string"
        );
      })
      .map((item) => ({
        term: item.term.trim(),
        description: item.description.trim(),
        aliases: Array.isArray(item.aliases)
          ? item.aliases.filter(
              (alias): alias is string => typeof alias === "string",
            )
          : [],
      }))
      .filter((item) => item.term.length > 0 && item.description.length > 0);
  } catch {
    return [];
  }
}

function mergeGlossary(
  base: AITermEntry[],
  extras: AITermEntry[],
): AITermEntry[] {
  const map = new Map<string, AITermEntry>();

  for (const term of [...base, ...extras]) {
    const key = normalizeTerm(term.term);

    if (!map.has(key)) {
      map.set(key, term);
      continue;
    }

    const existing = map.get(key)!;
    if (!existing.description && term.description) {
      existing.description = term.description;
    }

    const mergedAliases = new Set([
      ...(existing.aliases ?? []),
      ...(term.aliases ?? []),
    ]);
    existing.aliases = Array.from(mergedAliases);
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.term.localeCompare(b.term, "tr"),
  );
}

function escapeForRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getAITermsGlossary(limit = 80): Promise<AITermEntry[]> {
  if (shouldSkipDbAccess()) {
    return DEFAULT_GLOSSARY_TERMS.slice(0, Math.max(1, limit));
  }

  try {
    const setting = await db.setting.findUnique({
      where: { key: GLOSSARY_SETTING_KEY },
      select: { value: true },
    });

    const storedTerms = parseGlossary(setting?.value);
    const merged = mergeGlossary(DEFAULT_GLOSSARY_TERMS, storedTerms);

    return merged.slice(0, Math.max(1, limit));
  } catch {
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
}): Promise<void> {
  if (shouldSkipDbAccess()) {
    return;
  }

  const combinedText = [
    input.title,
    input.excerpt ?? "",
    input.content,
    ...(input.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let existingSetting: { value: string } | null = null;

  try {
    existingSetting = await db.setting.findUnique({
      where: { key: GLOSSARY_SETTING_KEY },
      select: { value: true },
    });
  } catch {
    return;
  }

  const existingTerms = parseGlossary(existingSetting?.value);
  const existingKeys = new Set(
    existingTerms.map((item) => normalizeTerm(item.term)),
  );

  const newTerms = DEFAULT_GLOSSARY_TERMS.filter((term) => {
    if (existingKeys.has(normalizeTerm(term.term))) {
      return false;
    }

    const candidates = [term.term, ...(term.aliases ?? [])];
    return candidates.some((candidate) => {
      const regex = new RegExp(
        `\\b${escapeForRegex(candidate.toLowerCase())}\\b`,
        "i",
      );
      return regex.test(combinedText);
    });
  });

  if (newTerms.length === 0) {
    return;
  }

  const merged = mergeGlossary(DEFAULT_GLOSSARY_TERMS, [
    ...existingTerms,
    ...newTerms,
  ]);

  try {
    await db.setting.upsert({
      where: { key: GLOSSARY_SETTING_KEY },
      update: {
        value: JSON.stringify(merged),
      },
      create: {
        key: GLOSSARY_SETTING_KEY,
        value: JSON.stringify(merged),
      },
    });
  } catch {
    return;
  }
}

export function getAITermAnchor(term: string): string {
  return toAnchor(term);
}
