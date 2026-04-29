import { SourceGathererAgent } from "../source-gatherer.agent";
import { googleNewsSearch } from "@/lib/google-news-search";
import { tavilySearch } from "@/lib/tavily";

jest.mock("../base-agent", () => ({
  BaseAgent: class MockBaseAgent {
    protected logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    };

    constructor() {}
  },
}));

jest.mock("@/lib/queue-manager", () => ({
  QUEUE_NAMES: {
    ENRICHED_ARTICLES: "enriched-articles",
    CONTENT_SYNTHESIS: "content-synthesis",
  },
}));

jest.mock("@/lib/google-news-search", () => ({
  googleNewsSearch: jest.fn(),
}));

jest.mock("@/lib/tavily", () => ({
  tavilySearch: jest.fn(),
}));

jest.mock("@/lib/tavily-extract", () => ({
  batchExtract: jest.fn(),
  filterQualityResults: jest.fn(() => []),
}));

jest.mock("@/lib/exa", () => ({
  exaSearch: jest.fn(),
}));

jest.mock("@/lib/firecrawl", () => ({
  firecrawlScrape: jest.fn(),
  isFirecrawlAvailable: jest.fn(() => false),
}));

const mockedSearxngSearch = googleNewsSearch as jest.MockedFunction<
  typeof googleNewsSearch
>;
const mockedTavilySearch = tavilySearch as jest.MockedFunction<
  typeof tavilySearch
>;

function createArticle(overrides?: Partial<any>) {
  return {
    title: "OpenAI yeni akıl yürütme modelini duyurdu",
    description:
      "Yeni model enterprise kullanımında daha güçlü reasoning ve ajan davranışları sunuyor.",
    url: "https://origin.example.com/openai-reasoning-model",
    publishedDate: "2026-03-09T10:00:00.000Z",
    source: "Example Source",
    trendScore: 91,
    category: "AI",
    relevanceScore: 88,
    reasoning: "yüksek haber değeri",
    isDuplicate: false,
    ...overrides,
  };
}

describe("SourceGathererAgent - Google News haber toplama simulasyonu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Google News-first arama sonucunu kullanarak haber kaynakları toplar", async () => {
    const agent = new SourceGathererAgent();
    const article = createArticle();

    mockedSearxngSearch
      .mockResolvedValueOnce([
        {
          title: "Google News bulunan kaynak",
          url: "https://news.example.com/google-news-source",
          content: "",
          engine: "google-news",
          parsed_url: ["https", "news.example.com", "/google-news-source"],
          template: "default.html",
          engines: ["google-news"],
          positions: [1],
          score: 0.9,
          category: "news",
        },
      ])
      .mockResolvedValueOnce([]);

    mockedTavilySearch.mockResolvedValue([] as any);

    jest
      .spyOn(agent as any, "calculateRelevanceScoreGoogleNews")
      .mockReturnValue(92);
    jest.spyOn(agent as any, "shouldSkipUrl").mockReturnValue(false);
    jest
      .spyOn(agent as any, "readUrlContent")
      .mockResolvedValue("A".repeat(240));

    const sources = await (agent as any).gatherSourcesWithPriority(article);

    expect(mockedSearxngSearch).toHaveBeenCalled();
    expect(mockedTavilySearch).not.toHaveBeenCalled();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      title: "Google News bulunan kaynak",
      url: "https://news.example.com/google-news-source",
      relevanceScore: 92,
    });
  });

  it("Google News-first arama boş dönerse Tavily fallback ile haber oluşturma akışını sürdürür", async () => {
    const agent = new SourceGathererAgent();
    const article = createArticle({
      title: "Anthropic yeni coding agent yetenekleri ekledi",
      url: "https://origin.example.com/anthropic-agent-update",
    });

    mockedSearxngSearch.mockResolvedValue([]);
    mockedTavilySearch.mockResolvedValue([
      {
        title: "Tavily fallback kaynak",
        url: "https://analysis.example.com/tavily-fallback",
        content: "Fallback içerik",
        score: 0.73,
      },
    ] as any);

    jest.spyOn(agent as any, "shouldSkipUrl").mockReturnValue(false);
    jest
      .spyOn(agent as any, "readUrlContent")
      .mockResolvedValue("B".repeat(260));

    const sources = await (agent as any).gatherSourcesWithPriority(article);

    expect(mockedSearxngSearch).toHaveBeenCalledTimes(2);
    expect(mockedTavilySearch).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      title: "Tavily fallback kaynak",
      url: "https://analysis.example.com/tavily-fallback",
      relevanceScore: 73,
    });
  });
});
