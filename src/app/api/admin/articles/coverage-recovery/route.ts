import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import { notifyGoogle } from "@/lib/seo/google-indexing-api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CoverageRecoveryAction =
  | "queue_recovery"
  | "notify_google"
  | "both"
  | "recover_then_notify";
type RecoveryLocale = "tr" | "en";
type RecoveryStatus = "queued" | "notified" | "both" | "skipped" | "failed";

const MAX_URLS_PER_REQUEST = 100;
const MAX_URL_LENGTH = 2048;

interface CoverageRecoveryResult {
  inputUrl: string;
  normalizedUrl: string | null;
  slug: string | null;
  locale: RecoveryLocale | null;
  status: RecoveryStatus;
  reason?: string;
  jobId?: string;
  queued: boolean;
  notified: boolean;
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractNewsSlug(
  normalizedUrl: string,
): { slug: string; locale: RecoveryLocale } | null {
  try {
    const url = new URL(normalizedUrl);
    const segments = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length === 2 && segments[0] === "news") {
      const slug = decodeURIComponent(segments[1]).trim();
      return slug ? { slug, locale: "tr" } : null;
    }

    if (segments.length === 3 && segments[0] === "en" && segments[1] === "news") {
      const slug = decodeURIComponent(segments[2]).trim();
      return slug ? { slug, locale: "en" } : null;
    }

    return null;
  } catch {
    return null;
  }
}

function isAction(value: unknown): value is CoverageRecoveryAction {
  return (
    value === "queue_recovery" ||
    value === "notify_google" ||
    value === "both" ||
    value === "recover_then_notify"
  );
}

function isAllowedHost(normalizedUrl: string): boolean {
  try {
    const url = new URL(normalizedUrl);
    const primaryHost = new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://aihaberleri.org").hostname;
    const allowedHosts = new Set([primaryHost, "www.aihaberleri.org", "aihaberleri.org"]);
    return allowedHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function shouldQueue(action: CoverageRecoveryAction): boolean {
  return action === "queue_recovery" || action === "both" || action === "recover_then_notify";
}

function shouldNotify(action: CoverageRecoveryAction): boolean {
  return action === "notify_google" || action === "both";
}

async function isPublishedForSlug(slug: string, locale: RecoveryLocale): Promise<boolean> {
  if (locale === "tr") {
    const article = await db.article.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    return Boolean(article);
  }

  const translation = await db.articleTranslation.findFirst({
    where: {
      slug,
      locale: "en",
      article: {
        status: "PUBLISHED",
      },
    },
    select: { id: true },
  });

  return Boolean(translation);
}

export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const urls: string[] = Array.isArray(body?.urls)
      ? body.urls.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [];
    const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";
    const action = body?.action;

    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir URL gerekli" },
        { status: 400 },
      );
    }

    if (urls.length > MAX_URLS_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Tek istekte en fazla ${MAX_URLS_PER_REQUEST} URL gönderilebilir`,
        },
        { status: 400 },
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "categoryId zorunlu" },
        { status: 400 },
      );
    }

    if (!isAction(action)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "action değeri geçersiz. queue_recovery, notify_google, both veya recover_then_notify olmalı",
        },
        { status: 400 },
      );
    }

    const queueEnabled = shouldQueue(action);
    const notifyEnabled = shouldNotify(action);

    const queue = queueEnabled ? getQueue(QUEUE_NAMES.SLUG_RECOVERY) : null;
    if (queueEnabled && !queue) {
      return NextResponse.json(
        { success: false, error: "Queue başlatılamadı — Redis bağlantısı yok" },
        { status: 503 },
      );
    }

    const dedupe = new Set<string>();
    const results: CoverageRecoveryResult[] = [];

    let recoverable = 0;
    let queuedCount = 0;
    let notifiedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const inputUrl of urls) {
      if (inputUrl.length > MAX_URL_LENGTH) {
        skippedCount++;
        results.push({
          inputUrl,
          normalizedUrl: null,
          slug: null,
          locale: null,
          status: "skipped",
          reason: "url_too_long",
          queued: false,
          notified: false,
        });
        continue;
      }

      const normalizedUrl = normalizeUrl(inputUrl);
      if (!normalizedUrl) {
        skippedCount++;
        results.push({
          inputUrl,
          normalizedUrl: null,
          slug: null,
          locale: null,
          status: "skipped",
          reason: "invalid_url",
          queued: false,
          notified: false,
        });
        continue;
      }

      if (!isAllowedHost(normalizedUrl)) {
        skippedCount++;
        results.push({
          inputUrl,
          normalizedUrl,
          slug: null,
          locale: null,
          status: "skipped",
          reason: "unsupported_host",
          queued: false,
          notified: false,
        });
        continue;
      }

      const extracted = extractNewsSlug(normalizedUrl);
      if (!extracted) {
        skippedCount++;
        results.push({
          inputUrl,
          normalizedUrl,
          slug: null,
          locale: null,
          status: "skipped",
          reason: "unsupported_path",
          queued: false,
          notified: false,
        });
        continue;
      }

      const slug = extracted.slug;
      const locale = extracted.locale;
      const dedupeKey = `${locale}:${slug}`;

      if (dedupe.has(dedupeKey)) {
        skippedCount++;
        results.push({
          inputUrl,
          normalizedUrl,
          slug,
          locale,
          status: "skipped",
          reason: "duplicate_input",
          jobId: `sr:${locale}:${slug}`,
          queued: false,
          notified: false,
        });
        continue;
      }

      dedupe.add(dedupeKey);
      recoverable++;

      let queued = false;
      let notified = false;
      let queueError: string | null = null;
      let notifyError: string | null = null;

      if (queueEnabled && queue) {
        try {
          await queue.add(
            "recover-slug",
            { slug, categoryId },
            {
              jobId: `sr:${locale}:${slug}`,
              attempts: 2,
              backoff: { type: "exponential", delay: 15000 },
              removeOnComplete: { count: 500, age: 48 * 3600 },
              removeOnFail: { count: 200, age: 72 * 3600 },
            },
          );
          queued = true;
          queuedCount++;
        } catch (error: unknown) {
          queueError = error instanceof Error ? error.message : "queue_add_failed";
        }
      }

      const shouldDeferNotifyUntilRecovered = action === "recover_then_notify";

      if (notifyEnabled) {
        const published = await isPublishedForSlug(slug, locale);
        if (!published) {
          notifyError = "not_published_yet";
        } else {
          const notifyResult = await notifyGoogle(normalizedUrl, "URL_UPDATED");
          if (notifyResult.success) {
            notified = true;
            notifiedCount++;
          } else {
            notifyError = notifyResult.error || "notify_failed";
          }
        }
      } else if (shouldDeferNotifyUntilRecovered && queued) {
        notifyError = "queued_for_recovery";
      }

      let status: RecoveryStatus;
      if (queued && notified) {
        status = "both";
      } else if (queued) {
        status = "queued";
      } else if (notified) {
        status = "notified";
      } else if (notifyError === "not_published_yet" || notifyError === "queued_for_recovery") {
        status = "skipped";
      } else {
        status = "failed";
      }

      const reasons = [queueError, notifyError].filter(Boolean).join(" | ");
      if (status === "failed") failedCount++;
      if (status === "skipped") skippedCount++;

      results.push({
        inputUrl,
        normalizedUrl,
        slug,
        locale,
        status,
        reason: reasons || undefined,
        jobId: `sr:${locale}:${slug}`,
        queued,
        notified,
      });
    }

    return NextResponse.json({
      success: true,
      action,
      summary: {
        total: urls.length,
        recoverable,
        queued: queuedCount,
        notified: notifiedCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
