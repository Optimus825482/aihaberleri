/**
 * Tavily Research API Integration
 *
 * Provides AI-powered comprehensive research with citations.
 * Use for weekly digests and deep topic analysis.
 *
 * Credit Cost: 10 credits (mini), 20 credits (pro)
 * Response Time: 30-120 seconds
 */

import axios from "axios";

const TAVILY_API_URL = "https://api.tavily.com";
const POLL_INTERVAL = 10000; // 10 seconds
const MAX_POLL_ATTEMPTS = 30; // 5 minutes max

export interface ResearchSource {
  url: string;
  title: string;
  snippet?: string;
}

export interface ResearchResult {
  content: string;
  sources: ResearchSource[];
  responseTime: number;
  model: "mini" | "pro" | "auto";
  status: "completed" | "failed";
  requestId: string;
}

export interface ResearchOptions {
  model?: "mini" | "pro" | "auto";
  stream?: boolean;
  citationFormat?: "numbered" | "inline" | "none";
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
}

/**
 * Conduct comprehensive AI research on a topic
 *
 * @param topic - Research topic or question
 * @param options - Research configuration options
 * @returns Research result with synthesized content and sources
 *
 * @example
 * ```typescript
 * const research = await conductResearch(
 *   "Latest AI breakthroughs in 2026",
 *   { model: "mini", citationFormat: "numbered" }
 * );
 * console.log(research.content);
 * console.log(research.sources);
 * ```
 */
export async function conductResearch(
  topic: string,
  options: ResearchOptions = {},
): Promise<ResearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const {
    model = "mini",
    stream = false,
    citationFormat = "numbered",
    maxResults = 10,
    searchDepth = "advanced",
  } = options;

  try {
    console.log(`🔬 Starting Tavily research: "${topic}" (model: ${model})`);

    // Step 1: Initiate research request
    const startResponse = await axios.post(
      `${TAVILY_API_URL}/research`,
      {
        api_key: apiKey,
        input: topic,
        model,
        stream,
        citation_format: citationFormat,
        max_results: maxResults,
        search_depth: searchDepth,
      },
      {
        timeout: 30000, // 30 seconds for initial request
      },
    );

    const requestId = startResponse.data.request_id;
    if (!requestId) {
      throw new Error("No request_id returned from Tavily research API");
    }

    console.log(`📋 Research request ID: ${requestId}`);
    console.log(
      `⏳ Polling for results (max ${MAX_POLL_ATTEMPTS} attempts)...`,
    );

    // Step 2: Poll for completion
    let attempts = 0;
    let response: any;

    while (attempts < MAX_POLL_ATTEMPTS) {
      attempts++;

      // Wait before polling
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

      // Get research status
      response = await axios.get(`${TAVILY_API_URL}/research/${requestId}`, {
        params: { api_key: apiKey },
        timeout: 10000,
      });

      const status = response.data.status;
      console.log(
        `📊 Attempt ${attempts}/${MAX_POLL_ATTEMPTS}: Status = ${status}`,
      );

      if (status === "completed") {
        console.log(
          `✅ Research completed in ${(attempts * POLL_INTERVAL) / 1000}s`,
        );
        break;
      }

      if (status === "failed") {
        throw new Error(
          `Research failed: ${response.data.error || "Unknown error"}`,
        );
      }

      // Status is still "processing" or "pending"
      if (attempts >= MAX_POLL_ATTEMPTS) {
        throw new Error(
          `Research timeout after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL) / 1000}s`,
        );
      }
    }

    // Step 3: Extract and return results
    const data = response.data;

    if (!data.content) {
      throw new Error("No content returned from research");
    }

    const result: ResearchResult = {
      content: data.content,
      sources: (data.sources || []).map((source: any) => ({
        url: source.url,
        title: source.title || source.url,
        snippet: source.snippet,
      })),
      responseTime: data.response_time || 0,
      model: data.model || model,
      status: "completed",
      requestId,
    };

    console.log(
      `✅ Research completed: ${result.content.length} chars, ${result.sources.length} sources`,
    );

    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Tavily Research API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Return failed result instead of throwing
      return {
        content: "",
        sources: [],
        responseTime: 0,
        model: options.model || "mini",
        status: "failed",
        requestId: "",
      };
    }

    throw error;
  }
}

/**
 * Conduct multiple research topics in parallel
 *
 * @param topics - Array of research topics
 * @param options - Research configuration options
 * @returns Array of research results
 *
 * @example
 * ```typescript
 * const topics = [
 *   "AI breakthroughs this week",
 *   "New AI tools and frameworks",
 *   "AI industry news and funding"
 * ];
 *
 * const results = await batchResearch(topics, { model: "mini" });
 * ```
 */
export async function batchResearch(
  topics: string[],
  options: ResearchOptions = {},
): Promise<ResearchResult[]> {
  console.log(`🔬 Starting batch research: ${topics.length} topics`);

  const results = await Promise.allSettled(
    topics.map((topic) => conductResearch(topic, options)),
  );

  const successfulResults: ResearchResult[] = [];
  const failedTopics: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successfulResults.push(result.value);
    } else {
      failedTopics.push(topics[index]);
      console.error(
        `❌ Research failed for topic: "${topics[index]}"`,
        result.reason,
      );
    }
  });

  console.log(
    `✅ Batch research completed: ${successfulResults.length}/${topics.length} successful`,
  );
  if (failedTopics.length > 0) {
    console.warn(`⚠️ Failed topics: ${failedTopics.join(", ")}`);
  }

  return successfulResults;
}

/**
 * Calculate estimated credit cost for research
 *
 * @param topicCount - Number of research topics
 * @param model - Research model to use
 * @returns Estimated credit cost
 */
export function estimateResearchCost(
  topicCount: number,
  model: "mini" | "pro" | "auto" = "mini",
): number {
  const costPerTopic = model === "pro" ? 20 : 10;
  return topicCount * costPerTopic;
}

export default {
  conductResearch,
  batchResearch,
  estimateResearchCost,
};
