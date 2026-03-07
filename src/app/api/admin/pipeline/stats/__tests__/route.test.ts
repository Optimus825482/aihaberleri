/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockRequireAdminAuth = jest.fn<() => Promise<{ user: { id: string } }>>();
const mockArticleCount = jest.fn<() => Promise<number>>();
const mockAgentLogFindMany = jest.fn<(args?: unknown) => Promise<any[]>>();
const mockAgentLogFindFirst = jest.fn<(args?: unknown) => Promise<any>>();
const mockGetAllQueueStats = jest.fn<() => Promise<any[]>>();
const mockGetScheduleInfo = jest.fn<() => Promise<any>>();
const mockGetAllCircuits = jest.fn<() => Map<string, unknown>>();

jest.mock("../../../../../../lib/admin-auth", () => ({
  requireAdminAuth: mockRequireAdminAuth,
}));

jest.mock("../../../../../../lib/db", () => ({
  db: {
    article: {
      count: mockArticleCount,
    },
    agentLog: {
      findMany: mockAgentLogFindMany,
      findFirst: mockAgentLogFindFirst,
    },
  },
}));

jest.mock("../../../../../../lib/queue-manager", () => ({
  getAllQueueStats: mockGetAllQueueStats,
}));

jest.mock("../../../../../../lib/smart-scheduler", () => ({
  getScheduleInfo: mockGetScheduleInfo,
}));

jest.mock("../../../../../../lib/circuit-breaker", () => ({
  CircuitBreaker: {
    getAllCircuits: mockGetAllCircuits,
  },
}));

jest.mock("../../../../../../lib/pipeline-registry", () => ({
  PIPELINE_STEP_DEFINITIONS: [
    {
      id: "fetcher",
      displayName: "Fetcher",
      queueName: "fetch-queue",
    },
    {
      id: "publisher",
      displayName: "Publisher",
      queueName: "publish-queue",
    },
    {
      id: "validator",
      displayName: "Validator",
      queueName: "validate-queue",
    },
  ],
}));

const { GET } = require("../route");

describe("/api/admin/pipeline/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockRequireAdminAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockArticleCount.mockResolvedValue(12);
    mockAgentLogFindMany.mockResolvedValue([
      { status: "SUCCESS" },
      { status: "FAILED" },
      { status: "SUCCESS" },
    ]);
    mockAgentLogFindFirst.mockResolvedValue({
      executionTime: new Date("2026-03-07T09:00:00.000Z"),
    });
    mockGetScheduleInfo.mockResolvedValue({
      interval: 15,
      reason: "NORMAL",
      turkeyTime: "12:00",
      nextRun: new Date("2026-03-07T12:15:00.000Z"),
      isWeekend: false,
      isBreakingNews: false,
    });
    mockGetAllCircuits.mockReturnValue(new Map());
  });

  it("should derive running, queued and idle states without promoting historical failures to live errors", async () => {
    mockGetAllQueueStats.mockResolvedValue([
      {
        queueName: "fetch-queue",
        waiting: 0,
        active: 1,
        completed: 5,
        failed: 2,
      },
      {
        queueName: "publish-queue",
        waiting: 2,
        active: 0,
        completed: 3,
        failed: 4,
        delayed: 1,
      },
      {
        queueName: "validate-queue",
        waiting: 0,
        active: 0,
        completed: 2,
        failed: 7,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toEqual([
      expect.objectContaining({
        name: "fetcher",
        status: "running",
        queueCount: 1,
        processedCount: 5,
        failedCount: 2,
      }),
      expect.objectContaining({
        name: "publisher",
        status: "queued",
        queueCount: 3,
        processedCount: 3,
        failedCount: 4,
      }),
      expect.objectContaining({
        name: "validator",
        status: "idle",
        queueCount: 0,
        processedCount: 2,
        failedCount: 7,
      }),
    ]);
    expect(data.totalArticlesToday).toBe(12);
    expect(data.successRate).toBeCloseTo(66.666, 2);
  });

  it("should mark a step as error only when it has failures with no completed work and no queued or active jobs", async () => {
    mockGetAllQueueStats.mockResolvedValue([
      {
        queueName: "fetch-queue",
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 2,
      },
      {
        queueName: "publish-queue",
        waiting: 0,
        active: 0,
        completed: 1,
        failed: 1,
      },
      {
        queueName: "validate-queue",
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents[0]).toEqual(
      expect.objectContaining({
        name: "fetcher",
        status: "error",
        failedCount: 2,
      }),
    );
    expect(data.agents[1]).toEqual(
      expect.objectContaining({
        name: "publisher",
        status: "idle",
        failedCount: 1,
      }),
    );
    expect(data.agents[2]).toEqual(
      expect.objectContaining({
        name: "validator",
        status: "idle",
        failedCount: 0,
      }),
    );
  });
});
