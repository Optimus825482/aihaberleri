import axios from "axios";

jest.mock("axios");
jest.mock("@/lib/google-news-search", () => ({
  googleNewsSearch: jest.fn(),
}));

async function getMockedAxios() {
  const axiosModule = await import("axios");
  return axiosModule.default as jest.Mocked<typeof axios>;
}

async function getMockedGoogleNewsSearch() {
  const { googleNewsSearch } = await import("@/lib/google-news-search");
  return googleNewsSearch as jest.MockedFunction<typeof googleNewsSearch>;
}

const googleNewsResult = {
  title: "Ücretsiz Google News kaynağı",
  url: "https://news.example.com/free-source",
  content: "Google News RSS içerik özeti",
  engine: "google-news",
  parsed_url: ["https", "news.example.com", "/free-source"],
  template: "default.html",
  engines: ["google-news"],
  positions: [1],
  score: 0.8,
  category: "news",
  publishedDate: "2026-05-14T00:00:00.000Z",
};

describe("search provider free fallbacks", () => {
  const originalTavilyKey = process.env.TAVILY_API_KEY;
  const originalExaKey = process.env.EXA_API_KEY;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.TAVILY_API_KEY;
    delete process.env.EXA_API_KEY;
  });

  afterAll(() => {
    process.env.TAVILY_API_KEY = originalTavilyKey;
    process.env.EXA_API_KEY = originalExaKey;
  });

  it("tavilySearch uses Google News when Tavily and EXA keys are missing", async () => {
    const mockedAxios = await getMockedAxios();
    const mockedGoogleNewsSearch = await getMockedGoogleNewsSearch();
    mockedGoogleNewsSearch.mockResolvedValue([googleNewsResult]);
    const { tavilySearch } = await import("@/lib/tavily");

    const results = await tavilySearch("deepseek news", { max_results: 3 });

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockedGoogleNewsSearch).toHaveBeenCalledWith("deepseek news", {
      count: 3,
      time_range: "week",
      categories: "general,news",
    });
    expect(results).toEqual([
      {
        title: googleNewsResult.title,
        url: googleNewsResult.url,
        content: googleNewsResult.content,
        score: googleNewsResult.score,
        published_date: googleNewsResult.publishedDate,
      },
    ]);
  });

  it("tavilySearch falls back to Google News when Tavily and EXA fail", async () => {
    process.env.TAVILY_API_KEY = "tavily-test";
    process.env.EXA_API_KEY = "exa-test";
    const mockedAxios = await getMockedAxios();
    mockedAxios.post.mockRejectedValue(new Error("quota exceeded"));
    const mockedGoogleNewsSearch = await getMockedGoogleNewsSearch();
    mockedGoogleNewsSearch.mockResolvedValue([googleNewsResult]);

    const { tavilySearch } = await import("@/lib/tavily");

    const results = await tavilySearch("ai agents", { max_results: 2 });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedGoogleNewsSearch).toHaveBeenCalledWith("ai agents", {
      count: 2,
      time_range: "week",
      categories: "general,news",
    });
    expect(results[0]?.url).toBe(googleNewsResult.url);
  });

  it("exaSearch uses Google News when EXA key is missing", async () => {
    const mockedAxios = await getMockedAxios();
    const mockedGoogleNewsSearch = await getMockedGoogleNewsSearch();
    mockedGoogleNewsSearch.mockResolvedValue([googleNewsResult]);
    const { exaSearch } = await import("@/lib/exa");

    const results = await exaSearch("open source models", { num_results: 4 });

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockedGoogleNewsSearch).toHaveBeenCalledWith("open source models", {
      count: 4,
      time_range: "week",
      categories: "general,news",
    });
    expect(results).toEqual([
      {
        title: googleNewsResult.title,
        url: googleNewsResult.url,
        publishedDate: googleNewsResult.publishedDate,
        score: googleNewsResult.score,
        text: googleNewsResult.content,
      },
    ]);
  });

  it("tavilySearch continues to EXA when Tavily returns no results", async () => {
    process.env.TAVILY_API_KEY = "tavily-test";
    process.env.EXA_API_KEY = "exa-test";
    const mockedAxios = await getMockedAxios();
    mockedAxios.post
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              title: "EXA fallback source",
              url: "https://exa.example.com/source",
              text: "EXA fallback content",
              score: 0.7,
              publishedDate: "2026-05-14T00:00:00.000Z",
            },
          ],
        },
      });

    const { tavilySearch } = await import("@/lib/tavily");

    const results = await tavilySearch("empty tavily", { max_results: 2 });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      {
        title: "EXA fallback source",
        url: "https://exa.example.com/source",
        content: "EXA fallback content",
        score: 0.7,
        published_date: "2026-05-14T00:00:00.000Z",
      },
    ]);
  });

  it("tavilySearch uses Google News when Tavily and EXA return no results", async () => {
    process.env.TAVILY_API_KEY = "tavily-test";
    process.env.EXA_API_KEY = "exa-test";
    const mockedAxios = await getMockedAxios();
    mockedAxios.post
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockResolvedValueOnce({ data: { results: [] } });
    const mockedGoogleNewsSearch = await getMockedGoogleNewsSearch();
    mockedGoogleNewsSearch.mockResolvedValue([googleNewsResult]);

    const { tavilySearch } = await import("@/lib/tavily");

    const results = await tavilySearch("empty providers", { max_results: 2 });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedGoogleNewsSearch).toHaveBeenCalledWith("empty providers", {
      count: 2,
      time_range: "week",
      categories: "general,news",
    });
    expect(results[0]?.url).toBe(googleNewsResult.url);
  });

  it("exaSearch uses Google News when EXA returns no results", async () => {
    process.env.EXA_API_KEY = "exa-test";
    const mockedAxios = await getMockedAxios();
    mockedAxios.post.mockResolvedValue({ data: { results: [] } });
    const mockedGoogleNewsSearch = await getMockedGoogleNewsSearch();
    mockedGoogleNewsSearch.mockResolvedValue([googleNewsResult]);

    const { exaSearch } = await import("@/lib/exa");

    const results = await exaSearch("empty exa", { num_results: 4 });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://api.exa.ai/search",
      expect.objectContaining({
        query: "empty exa",
        numResults: 4,
        useAutoprompt: true,
      }),
      expect.any(Object),
    );
    expect(mockedGoogleNewsSearch).toHaveBeenCalledWith("empty exa", {
      count: 4,
      time_range: "week",
      categories: "general,news",
    });
    expect(results[0]?.url).toBe(googleNewsResult.url);
  });
});
