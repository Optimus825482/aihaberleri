export type InsightLocale = "tr" | "en";

export interface TimelineItem {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
}

export interface ArticleInsightDisplaySettings {
  showSummary: boolean;
  showImportance: boolean;
  showTimeline: boolean;
  showGlossary: boolean;
  showMobileActionBar: boolean;
  showVerificationPanel: boolean;
  showDailyBriefing: boolean;
  showModelCards: boolean;
  showHeatMap: boolean;
}

const DEFAULT_DISPLAY_SETTINGS: ArticleInsightDisplaySettings = {
  showSummary: true,
  showImportance: true,
  showTimeline: true,
  showGlossary: true,
  showMobileActionBar: true,
  showVerificationPanel: true,
  showDailyBriefing: true,
  showModelCards: true,
  showHeatMap: true,
};

function parseBooleanSetting(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

export async function getArticleInsightDisplaySettings(
  getSettings: () => Promise<Array<{ key: string; value: string }>>,
): Promise<ArticleInsightDisplaySettings> {
  try {
    const settings = await getSettings();
    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      showSummary: parseBooleanSetting(
        settingsMap["site_insight_summary"],
        DEFAULT_DISPLAY_SETTINGS.showSummary,
      ),
      showImportance: parseBooleanSetting(
        settingsMap["site_insight_importance"],
        DEFAULT_DISPLAY_SETTINGS.showImportance,
      ),
      showTimeline: parseBooleanSetting(
        settingsMap["site_insight_timeline"],
        DEFAULT_DISPLAY_SETTINGS.showTimeline,
      ),
      showGlossary: parseBooleanSetting(
        settingsMap["site_feature_glossary"],
        DEFAULT_DISPLAY_SETTINGS.showGlossary,
      ),
      showMobileActionBar: parseBooleanSetting(
        settingsMap["site_feature_mobile_action_bar"],
        DEFAULT_DISPLAY_SETTINGS.showMobileActionBar,
      ),
      showVerificationPanel: parseBooleanSetting(
        settingsMap["site_feature_verification_panel"],
        DEFAULT_DISPLAY_SETTINGS.showVerificationPanel,
      ),
      showDailyBriefing: parseBooleanSetting(
        settingsMap["site_feature_daily_briefing"],
        DEFAULT_DISPLAY_SETTINGS.showDailyBriefing,
      ),
      showModelCards: parseBooleanSetting(
        settingsMap["site_feature_model_cards"],
        DEFAULT_DISPLAY_SETTINGS.showModelCards,
      ),
      showHeatMap: parseBooleanSetting(
        settingsMap["site_feature_heat_map"],
        DEFAULT_DISPLAY_SETTINGS.showHeatMap,
      ),
    };
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

function stripHtml(content: string): string {
  return content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(content: string): string[] {
  return stripHtml(content)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
}

export function buildSummaryPoints(excerpt: string, content: string): string[] {
  const points: string[] = [];

  if (excerpt?.trim()) {
    points.push(excerpt.trim());
  }

  for (const sentence of splitIntoSentences(content)) {
    if (points.length >= 3) break;

    const isDuplicate = points.some(
      (point) =>
        point.toLowerCase().includes(sentence.toLowerCase().slice(0, 30)) ||
        sentence.toLowerCase().includes(point.toLowerCase().slice(0, 30)),
    );

    if (!isDuplicate) {
      points.push(sentence);
    }
  }

  return points.slice(0, 3);
}

export function buildWhyImportantPoints(params: {
  locale: InsightLocale;
  categoryName: string;
  trendScore?: number | null;
  readingTime: number | string;
}): string[] {
  const { locale, categoryName, trendScore, readingTime } = params;

  if (locale === "en") {
    return [
      `This update has direct impact on the ${categoryName} topic cluster.`,
      trendScore && trendScore > 0
        ? `Trend score is ${trendScore}, indicating high short-term visibility.`
        : "This topic remains relevant for short-term AI monitoring.",
      `Estimated reading time is ${readingTime} minutes for a quick decision-ready brief.`,
    ];
  }

  return [
    `Bu gelişme ${categoryName} kategorisinde güncel eğilimi etkiliyor.`,
    trendScore && trendScore > 0
      ? `Trend skoru ${trendScore} — gündemde görünürlüğü yüksek.`
      : "Konu, ekosistemde kısa vadeli takip gerektiren bir başlık.",
    `Tahmini okuma süresi ${readingTime} dakika; karar vericiler için hızlı bir özet sunuyor.`,
  ];
}

export function buildTimelineItems<T extends TimelineItem>(items: T[]): T[] {
  return items
    .filter((item) => !!item.publishedAt)
    .sort(
      (a, b) =>
        new Date(a.publishedAt as Date).getTime() -
        new Date(b.publishedAt as Date).getTime(),
    );
}
