import { googleNewsSearch } from "../google-news-search";

describe("googleNewsSearch", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("normalizes rss item into result", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss><channel><item><title>AI Headline</title><link>https://news.google.com/rss/articles/CBMiXGh0dHBzOi8vZXhhbXBsZS5jb20vbmV3cw?oc=5&amp;url=https://example.com/news</link><description><![CDATA[<p>Summary content</p>]]></description><pubDate>Tue, 29 Apr 2026 10:00:00 GMT</pubDate></item></channel></rss>`,
    } as unknown as Response);

    const results = await googleNewsSearch("openai", { count: 5, language: "en" });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("AI Headline");
    expect(results[0].engine).toBe("google-news");
    expect(results[0].url).toContain("https://example.com/news");
  });

  it("throws on http errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "",
    } as unknown as Response);

    await expect(
      googleNewsSearch("test", { count: 3, language: "en" }),
    ).rejects.toThrow("Google News RSS request failed: 500");
  });
});
