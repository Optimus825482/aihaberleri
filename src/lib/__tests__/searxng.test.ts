import axios from "axios";
import {
  getWhoogleStats,
  resetWhoogleStats,
  searxngSearch,
  type SearXNGResult,
} from "../searxng";

jest.mock("@/lib/redis", () => ({
  getRedis: jest.fn(() => null),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    get: jest.fn(),
    isAxiosError: jest.fn(() => false),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

function createSearxngResult(
  overrides?: Partial<SearXNGResult>,
): SearXNGResult {
  return {
    title: "Fallback result",
    url: "https://fallback.example.com/article",
    content: "fallback content",
    engine: "google",
    parsed_url: ["https", "fallback.example.com", "/article"],
    template: "default.html",
    engines: ["google"],
    positions: [1],
    score: 1,
    category: "general",
    ...overrides,
  };
}

function mockWhoogleClientWithEmptyResults() {
  const get = jest
    .fn()
    .mockResolvedValueOnce({ headers: { "set-cookie": [] } })
    .mockResolvedValueOnce({ data: { results: [] } });

  mockedAxios.create.mockReturnValue({ get } as any);
}

describe("searxngSearch Whoogle stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetWhoogleStats();
  });

  it("Whoogle boş dönse bile SearXNG fallback sonuç ürettiğinde zeroResults artırmaz", async () => {
    mockWhoogleClientWithEmptyResults();
    mockedAxios.get.mockResolvedValue({
      data: {
        results: [createSearxngResult()],
      },
    } as any);

    const results = await searxngSearch("openai reasoning model", { count: 5 });
    const stats = getWhoogleStats();

    expect(results).toHaveLength(1);
    expect(stats.fallbacks).toBe(1);
    expect(stats.zeroResults).toBe(0);
  });

  it("Whoogle ve SearXNG birlikte boş dönerse zeroResults artırır", async () => {
    mockWhoogleClientWithEmptyResults();
    mockedAxios.get.mockResolvedValue({
      data: {
        results: [],
      },
    } as any);

    const results = await searxngSearch("nonexistent query", { count: 5 });
    const stats = getWhoogleStats();

    expect(results).toHaveLength(0);
    expect(stats.fallbacks).toBe(1);
    expect(stats.zeroResults).toBe(1);
  });
});
