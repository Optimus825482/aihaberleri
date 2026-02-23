import { z } from "zod";
import { callDeepSeek, rewriteArticleWithNote } from "@/lib/deepseek";

type RewritePayload = {
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
  score: number;
};

export type ContentQualityControllerResult = {
  rewritten: RewritePayload;
  qualityScore: number;
  checks: {
    correctness: number;
    humanLike: number;
    length: number;
    seo: number;
    newsValue: number;
  };
  attemptsUsed: number;
  forcedPass: boolean;
  issues: string[];
};

const QualityReviewSchema = z.object({
  correctness: z.number().min(0).max(100),
  humanLike: z.number().min(0).max(100),
  length: z.number().min(0).max(100),
  seo: z.number().min(0).max(100),
  newsValue: z.number().min(0).max(100),
  issues: z.array(z.string()).default([]),
  rewriteInstruction: z.string().default(""),
});

const MAX_REWRITE_ATTEMPTS = 2;
const PASS_THRESHOLD = 62;
const MIN_PLAIN_TEXT_LENGTH = 1000;

const getPlainTextLength = (html: string): number =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;

const average = (values: number[]): number =>
  Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

async function runLLMQualityReview(input: {
  title: string;
  excerpt: string;
  content: string;
  categoryName: string;
}): Promise<z.infer<typeof QualityReviewSchema>> {
  const prompt = `Aşağıdaki Türkçe haberi değerlendir ve JSON dön.

Kategori: ${input.categoryName}
Başlık: ${input.title}
Özet: ${input.excerpt}
İçerik:
${input.content.slice(0, 7000)}

Değerlendirme boyutları (0-100):
1) correctness: Haber doğruluğu, çelişki ve abartı riski
2) humanLike: Doğal, insan gibi ve akıcı yazım
3) length: Haber uzunluğu ve bilgi derinliği
4) seo: Başlık/özet/anahtar kelime açısından SEO uygunluğu
5) newsValue: Haber değeri ve okur için önem seviyesi

Kurallar:
- Çok katı olma, çok gevşek de olma (dengeyi koru).
- En kritik sorunları kısa ve net yaz.
- rewriteInstruction alanında yazara verilecek tek bir toplu düzeltme notu üret.
- SADECE JSON döndür.

JSON formatı:
{
  "correctness": 0,
  "humanLike": 0,
  "length": 0,
  "seo": 0,
  "newsValue": 0,
  "issues": ["..."],
  "rewriteInstruction": "..."
}`;

  const raw = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Sen haber kalite kontrol editörüsün. Sadece geçerli JSON çıktısı ver.",
      },
      { role: "user", content: prompt },
    ],
    {
      temperature: 0.2,
      maxTokens: 1200,
    },
  );

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Quality review JSON parse failed");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = QualityReviewSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(validated.error.issues[0]?.message || "Invalid review");
  }

  return validated.data;
}

function buildFallbackReview(
  plainLength: number,
): z.infer<typeof QualityReviewSchema> {
  const lengthScore = plainLength >= 1400 ? 80 : plainLength >= 1000 ? 65 : 45;

  return {
    correctness: 65,
    humanLike: 65,
    length: lengthScore,
    seo: 62,
    newsValue: 62,
    issues:
      plainLength < MIN_PLAIN_TEXT_LENGTH
        ? [
            "İçerik haber standardı için kısa kalıyor, bilgi yoğunluğu artırılmalı.",
          ]
        : [],
    rewriteInstruction:
      "Haberi daha doğal ve akıcı yaz; doğruluk ve SEO dengesini koruyarak içerik derinliğini artır.",
  };
}

function buildAdminRewriteNote(
  review: z.infer<typeof QualityReviewSchema>,
  plainLength: number,
): string {
  const issueText = review.issues.slice(0, 5).join("; ");
  return [
    "Bu metni haber editör standardında yeniden yaz.",
    "Tarafsız, doğruluk odaklı ve doğal bir insan anlatımı kullan.",
    `İçerik uzunluğu en az ${Math.max(MIN_PLAIN_TEXT_LENGTH, plainLength)} karakter olacak şekilde bilgi yoğunluğunu artır.`,
    "SEO için başlık/özet/meta açıklamayı dengeli ve abartısız optimize et.",
    issueText ? `Tespit edilen sorunlar: ${issueText}` : "",
    review.rewriteInstruction,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function runContentQualityController(input: {
  rewritten: RewritePayload;
  categoryName: string;
}): Promise<ContentQualityControllerResult> {
  let current = input.rewritten;
  let attemptsUsed = 0;
  let lastIssues: string[] = [];
  let lastChecks = {
    correctness: 65,
    humanLike: 65,
    length: 65,
    seo: 65,
    newsValue: 65,
  };

  while (true) {
    const plainLength = getPlainTextLength(current.content);

    let review: z.infer<typeof QualityReviewSchema>;
    try {
      review = await runLLMQualityReview({
        title: current.title,
        excerpt: current.excerpt,
        content: current.content,
        categoryName: input.categoryName,
      });
    } catch {
      review = buildFallbackReview(plainLength);
    }

    const qualityScore = average([
      review.correctness,
      review.humanLike,
      review.length,
      review.seo,
      review.newsValue,
    ]);

    const pass =
      qualityScore >= PASS_THRESHOLD && plainLength >= MIN_PLAIN_TEXT_LENGTH;

    lastIssues = review.issues;
    lastChecks = {
      correctness: review.correctness,
      humanLike: review.humanLike,
      length: review.length,
      seo: review.seo,
      newsValue: review.newsValue,
    };

    if (pass) {
      return {
        rewritten: current,
        qualityScore,
        checks: lastChecks,
        attemptsUsed,
        forcedPass: false,
        issues: lastIssues,
      };
    }

    if (attemptsUsed >= MAX_REWRITE_ATTEMPTS) {
      return {
        rewritten: current,
        qualityScore,
        checks: lastChecks,
        attemptsUsed,
        forcedPass: true,
        issues: lastIssues,
      };
    }

    const adminNote = buildAdminRewriteNote(review, plainLength);

    const rewrittenAgain = await rewriteArticleWithNote(
      current.title,
      current.content,
      input.categoryName,
      adminNote,
    );

    current = {
      title: rewrittenAgain.title,
      excerpt: rewrittenAgain.excerpt,
      content: rewrittenAgain.content,
      keywords: rewrittenAgain.keywords,
      metaTitle: rewrittenAgain.metaTitle,
      metaDescription: rewrittenAgain.metaDescription,
      score: rewrittenAgain.score,
    };

    attemptsUsed += 1;
  }
}
