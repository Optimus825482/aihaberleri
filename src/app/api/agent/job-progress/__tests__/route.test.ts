/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const mockAuth = jest.fn<() => Promise<{ user: { id: string } }>>();
const mockGetAdminSession =
  jest.fn<() => Promise<{ user: { id: string } } | null>>();
const mockRedisGet = jest.fn<(key: string) => Promise<string | null>>();
const mockRedisLrange =
  jest.fn<(key: string, start: number, end: number) => Promise<string[]>>();
const mockGetRedis = jest.fn<
  () => {
    get: typeof mockRedisGet;
    lrange: typeof mockRedisLrange;
  }
>();
const mockQueueGetJob = jest.fn<(jobId: string) => Promise<any>>();
const mockGetNewsAgentQueue =
  jest.fn<() => { getJob: typeof mockQueueGetJob }>();
const mockFindFirst = jest.fn<(args?: unknown) => Promise<any>>();
const mockFindUnique = jest.fn<(args?: unknown) => Promise<any>>();

jest.mock("../../../../../lib/auth", () => ({
  auth: mockAuth,
}));

jest.mock("../../../../../lib/admin-auth", () => ({
  getAdminSession: mockGetAdminSession,
}));

jest.mock("../../../../../lib/redis", () => ({
  getRedis: mockGetRedis,
}));

jest.mock("../../../../../lib/queue", () => ({
  getNewsAgentQueue: mockGetNewsAgentQueue,
}));

jest.mock("../../../../../lib/db", () => ({
  db: {
    agentLog: {
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
    },
  },
}));

const { GET } = require("../route");

describe("/api/agent/job-progress", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetAdminSession.mockResolvedValue(null);
    mockGetRedis.mockReturnValue({
      get: mockRedisGet,
      lrange: mockRedisLrange,
    });
    mockGetNewsAgentQueue.mockReturnValue({
      getJob: mockQueueGetJob,
    });
  });

  it("should resolve the requested AgentLog via BullMQ job data before falling back to running log", async () => {
    mockQueueGetJob.mockResolvedValue({
      data: { agentLogId: "agent-log-1" },
      getState: jest.fn<() => Promise<string>>().mockResolvedValue("active"),
    });

    mockFindUnique.mockResolvedValue({
      id: "agent-log-1",
      status: "RUNNING",
      articlesCreated: 1,
      articlesScraped: 4,
      duration: 12,
      executionTime: new Date("2026-03-07T12:00:00.000Z"),
      errors: [],
      progressUpdates: [],
    });

    mockFindFirst
      .mockResolvedValueOnce({
        id: "other-running-log",
        status: "RUNNING",
        articlesCreated: 99,
        articlesScraped: 99,
        duration: 99,
        executionTime: new Date("2026-03-07T11:00:00.000Z"),
        errors: ["should-not-be-used"],
        progressUpdates: [],
      })
      .mockResolvedValueOnce({
        id: "latest-log",
        status: "SUCCESS",
        articlesCreated: 2,
        articlesScraped: 5,
        duration: 20,
        executionTime: new Date("2026-03-07T10:00:00.000Z"),
        errors: [],
        progressUpdates: [],
      });

    mockRedisGet.mockImplementation(async (key: string) => {
      if (key === "job:agent-log-1:progress") {
        return JSON.stringify({
          step: "publish",
          message: "Publishing in progress",
          progress: 75,
        });
      }

      return null;
    });

    mockRedisLrange.mockResolvedValue(["[PUBLISH] Publishing in progress"]);

    const request = new NextRequest(
      "http://localhost/api/agent/job-progress?jobId=manual-trigger-123",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.requestedJobId).toBe("manual-trigger-123");
    expect(data.data.requestedJobState).toBe("active");
    expect(data.data.requestedAgentLogId).toBe("agent-log-1");
    expect(data.data.latestLog.id).toBe("agent-log-1");
    expect(data.data.progress).toEqual(
      expect.objectContaining({
        step: "publish",
        message: "Publishing in progress",
        progress: 75,
      }),
    );
    expect(data.data.logs).toEqual(["[PUBLISH] Publishing in progress"]);
    expect(data.data.isRunning).toBe(true);
  });

  it("should fall back to Redis job mapping and timeline progress when BullMQ job data has no agentLogId", async () => {
    mockQueueGetJob.mockResolvedValue({
      data: {},
      getState: jest.fn<() => Promise<string>>().mockResolvedValue("waiting"),
    });

    mockRedisGet.mockImplementation(async (key: string) => {
      if (key === "job:mapping:manual-trigger-456") {
        return "mapped-log-1";
      }

      return null;
    });

    mockRedisLrange.mockImplementation(async (key: string) => {
      if (key === "job:progress:mapped-log-1") {
        return [
          JSON.stringify({
            stage: "synthesize",
            message: "Synthesizing content",
            progress: 45,
          }),
        ];
      }

      if (key === "job:mapped-log-1:logs") {
        return [];
      }

      return [];
    });

    mockFindUnique.mockResolvedValue({
      id: "mapped-log-1",
      status: "RUNNING",
      articlesCreated: 0,
      articlesScraped: 2,
      duration: null,
      executionTime: new Date("2026-03-07T12:30:00.000Z"),
      errors: [],
      progressUpdates: [],
    });

    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost/api/agent/job-progress?jobId=manual-trigger-456",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.requestedAgentLogId).toBe("mapped-log-1");
    expect(data.data.requestedJobState).toBe("waiting");
    expect(data.data.latestLog.id).toBe("mapped-log-1");
    expect(data.data.progress).toEqual(
      expect.objectContaining({
        stage: "synthesize",
        message: "Synthesizing content",
        progress: 45,
      }),
    );
    expect(data.data.isRunning).toBe(true);
  });
});
