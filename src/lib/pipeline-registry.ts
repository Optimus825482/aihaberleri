export const PIPELINE_STATE_KEY = "pipeline:current-state";
export const PIPELINE_HISTORY_KEY = "pipeline:last-run";

export type PipelineStepId =
  | "duplicate-detector"
  | "relevance-filter"
  | "trend-enrichment"
  | "source-gatherer"
  | "content-synthesizer"
  | "content-validator"
  | "visual-generator"
  | "seo-optimizer"
  | "database-publisher"
  | "social-share";

export interface PipelineStepDefinition {
  id: PipelineStepId;
  name: PipelineStepId;
  displayName: string;
  shortLabel: string;
  queueName: string;
  agentName: string;
}

export const PIPELINE_STEP_DEFINITIONS: PipelineStepDefinition[] = [
  {
    id: "duplicate-detector",
    name: "duplicate-detector",
    displayName: "Duplikat Tespiti",
    shortLabel: "Dedupe",
    queueName: "unique-articles",
    agentName: "DuplicateDetectorAgent",
  },
  {
    id: "relevance-filter",
    name: "relevance-filter",
    displayName: "Alakalılık Filtresi",
    shortLabel: "Relevance",
    queueName: "relevant-articles",
    agentName: "RelevanceFilterAgent",
  },
  {
    id: "trend-enrichment",
    name: "trend-enrichment",
    displayName: "Trend Zenginleştirme",
    shortLabel: "Trends",
    queueName: "trend-enrichment",
    agentName: "TrendEnricherAgent",
  },
  {
    id: "source-gatherer",
    name: "source-gatherer",
    displayName: "Kaynak Toplama",
    shortLabel: "Sources",
    queueName: "enriched-articles",
    agentName: "SourceGathererAgent",
  },
  {
    id: "content-synthesizer",
    name: "content-synthesizer",
    displayName: "İçerik Sentezi",
    shortLabel: "Synthesis",
    queueName: "content-synthesis",
    agentName: "ContentSynthesizerAgent",
  },
  {
    id: "content-validator",
    name: "content-validator",
    displayName: "Kalite Doğrulama",
    shortLabel: "Validation",
    queueName: "content-validation",
    agentName: "ContentValidatorAgent",
  },
  {
    id: "visual-generator",
    name: "visual-generator",
    displayName: "Görsel Üretimi",
    shortLabel: "Visuals",
    queueName: "articles-with-visuals",
    agentName: "VisualGeneratorAgent",
  },
  {
    id: "seo-optimizer",
    name: "seo-optimizer",
    displayName: "SEO Optimizasyonu",
    shortLabel: "SEO",
    queueName: "seo-optimization",
    agentName: "SEOOptimizerAgent",
  },
  {
    id: "database-publisher",
    name: "database-publisher",
    displayName: "Yayınlama",
    shortLabel: "Publish",
    queueName: "database-publisher",
    agentName: "DatabasePublisherAgent",
  },
  {
    id: "social-share",
    name: "social-share",
    displayName: "Sosyal Paylaşım",
    shortLabel: "Share",
    queueName: "social-share",
    agentName: "SocialShareAgent",
  },
];

export const PIPELINE_STEP_QUEUE_MAP = Object.fromEntries(
  PIPELINE_STEP_DEFINITIONS.map((step) => [step.id, step.queueName]),
) as Record<PipelineStepId, string>;

export const PIPELINE_AGENT_TO_QUEUE_MAP = Object.fromEntries(
  PIPELINE_STEP_DEFINITIONS.map((step) => [step.agentName, step.queueName]),
) as Record<string, string>;

export const PIPELINE_AGENT_DISPLAY_NAMES = Object.fromEntries(
  PIPELINE_STEP_DEFINITIONS.map((step) => [step.name, step.displayName]),
) as Record<string, string>;

export const PIPELINE_STEP_BY_ID = Object.fromEntries(
  PIPELINE_STEP_DEFINITIONS.map((step) => [step.id, step]),
) as Record<PipelineStepId, PipelineStepDefinition>;
