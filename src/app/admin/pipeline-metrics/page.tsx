"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface StepMetric {
  name: string;
  totalRuns: number;
  successCount: number;
  failCount: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  successRate: number;
}

interface PipelineSummary {
  totalRuns: number;
  successCount: number;
  failCount: number;
  partialCount: number;
  avgDuration: number;
  totalSpans: number;
}

interface RecentTrace {
  id: string;
  pipelineName: string;
  status: string;
  totalDuration: number | null;
  createdAt: string;
}

interface PromptVersion {
  id: string;
  name: string;
  version: string;
  isActive: boolean;
  systemPrompt: string;
  userTemplate: string;
  config: any;
  description: string | null;
  metrics: any;
  createdAt: string;
}

const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#6366f1"];
const STEP_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#06b6d4",
  "#f43f5e",
];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: "bg-green-500/20 text-green-400",
    FAILED: "bg-red-500/20 text-red-400",
    PARTIAL: "bg-yellow-500/20 text-yellow-400",
    RUNNING: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-500/20 text-gray-400"}`}
    >
      {status}
    </span>
  );
}

export default function PipelineMetricsPage() {
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState<"metrics" | "prompts">("metrics");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [steps, setSteps] = useState<StepMetric[]>([]);
  const [recentTraces, setRecentTraces] = useState<RecentTrace[]>([]);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pipeline-metrics?days=${days}`);
      const data = await res.json();
      setSummary(data.summary);
      setSteps(data.steps || []);
      setRecentTraces(data.recentTraces || []);
    } catch (e) {
      console.error("Failed to fetch metrics:", e);
    }
    setLoading(false);
  }, [days]);

  const fetchPrompts = useCallback(async () => {
    setPromptsLoading(true);
    try {
      const res = await fetch("/api/admin/prompt-versions");
      const data = await res.json();
      setPrompts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch prompts:", e);
    }
    setPromptsLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (tab === "prompts") fetchPrompts();
  }, [tab, fetchPrompts]);

  const handleActivatePrompt = async (id: string) => {
    try {
      await fetch("/api/admin/prompt-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", id }),
      });
      fetchPrompts();
    } catch (e) {
      console.error("Failed to activate prompt:", e);
    }
  };

  const pieData = summary
    ? [
        { name: "Başarılı", value: summary.successCount },
        { name: "Başarısız", value: summary.failCount },
        { name: "Kısmi", value: summary.partialCount },
      ].filter((d) => d.value > 0)
    : [];

  const barData = steps.map((s) => ({
    name: s.name.length > 15 ? s.name.substring(0, 15) + "…" : s.name,
    fullName: s.name,
    avgDuration: Math.round(s.avgDuration),
    successRate: s.successRate,
    runs: s.totalRuns,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Pipeline Metrikleri
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Haber pipeline performansı ve prompt versiyonlama
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab Switcher */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setTab("metrics")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === "metrics"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                📊 Metrikler
              </button>
              <button
                onClick={() => setTab("prompts")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === "prompts"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                📝 Prompt'lar
              </button>
            </div>
            {tab === "metrics" && (
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value={1}>Son 24 saat</option>
                <option value={7}>Son 7 gün</option>
                <option value={30}>Son 30 gün</option>
              </select>
            )}
          </div>
        </div>

        {/* METRICS TAB */}
        {tab === "metrics" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                {summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-400">Toplam Çalışma</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {summary.totalRuns}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-400">Başarı Oranı</p>
                      <p className="text-2xl font-bold text-green-400 mt-1">
                        {summary.totalRuns > 0
                          ? Math.round(
                              (summary.successCount / summary.totalRuns) * 100,
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-400">Ort. Süre</p>
                      <p className="text-2xl font-bold text-blue-400 mt-1">
                        {formatDuration(summary.avgDuration)}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-400">Toplam Adım</p>
                      <p className="text-2xl font-bold text-purple-400 mt-1">
                        {summary.totalSpans}
                      </p>
                    </div>
                  </div>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart - Status Distribution */}
                  {pieData.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-4">
                        Durum Dağılımı
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Bar Chart - Step Durations */}
                  {barData.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-4">
                        Adım Süreleri (ort. ms)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#fff" }}
                            formatter={(value: number, name: string) => [
                              formatDuration(value),
                              name === "avgDuration" ? "Ort. Süre" : name,
                            ]}
                            labelFormatter={(label: string, payload: any[]) =>
                              payload?.[0]?.payload?.fullName || label
                            }
                          />
                          <Bar dataKey="avgDuration" radius={[4, 4, 0, 0]}>
                            {barData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={STEP_COLORS[i % STEP_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Step Details Table */}
                {steps.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                      <h3 className="text-sm font-medium text-gray-300">
                        Adım Detayları
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 text-xs border-b border-gray-700">
                            <th className="text-left px-4 py-2">Adım</th>
                            <th className="text-center px-4 py-2">Çalışma</th>
                            <th className="text-center px-4 py-2">Başarı</th>
                            <th className="text-center px-4 py-2">Hata</th>
                            <th className="text-center px-4 py-2">Başarı %</th>
                            <th className="text-center px-4 py-2">Ort. Süre</th>
                            <th className="text-center px-4 py-2">Max Süre</th>
                          </tr>
                        </thead>
                        <tbody>
                          {steps.map((step) => (
                            <tr
                              key={step.name}
                              className="border-b border-gray-700/50 hover:bg-gray-700/30"
                            >
                              <td className="px-4 py-2 text-white font-mono text-xs">
                                {step.name}
                              </td>
                              <td className="px-4 py-2 text-center text-gray-300">
                                {step.totalRuns}
                              </td>
                              <td className="px-4 py-2 text-center text-green-400">
                                {step.successCount}
                              </td>
                              <td className="px-4 py-2 text-center text-red-400">
                                {step.failCount}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span
                                  className={
                                    step.successRate >= 90
                                      ? "text-green-400"
                                      : step.successRate >= 70
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                  }
                                >
                                  {step.successRate}%
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center text-blue-400">
                                {formatDuration(step.avgDuration)}
                              </td>
                              <td className="px-4 py-2 text-center text-gray-400">
                                {formatDuration(step.maxDuration)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent Traces */}
                {recentTraces.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                      <h3 className="text-sm font-medium text-gray-300">
                        Son Çalışmalar
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-700/50">
                      {recentTraces.map((trace) => (
                        <div
                          key={trace.id}
                          className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-700/30"
                        >
                          <div className="flex items-center gap-3">
                            <StatusBadge status={trace.status} />
                            <span className="text-xs text-gray-300 font-mono">
                              {trace.pipelineName}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            {trace.totalDuration && (
                              <span>{formatDuration(trace.totalDuration)}</span>
                            )}
                            <span>
                              {new Date(trace.createdAt).toLocaleString(
                                "tr-TR",
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!summary || summary.totalRuns === 0 ? (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
                    <p className="text-gray-400 text-lg">
                      📊 Henüz pipeline verisi yok
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Agent çalıştığında pipeline metrikleri burada görünecek
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        {/* PROMPTS TAB */}
        {tab === "prompts" && (
          <>
            {promptsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              </div>
            ) : prompts.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
                <p className="text-gray-400 text-lg">
                  📝 Henüz prompt versiyonu yok
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Mevcut prompt&apos;lar varsayılan (hardcoded) olarak
                  çalışıyor. Seed script ile ilk versiyonları oluşturabilirsin.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group by name */}
                {Object.entries(
                  prompts.reduce<Record<string, PromptVersion[]>>((acc, p) => {
                    if (!acc[p.name]) acc[p.name] = [];
                    acc[p.name].push(p);
                    return acc;
                  }, {}),
                ).map(([name, versions]) => (
                  <div
                    key={name}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-white">
                          {name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {versions.length} versiyon
                        </p>
                      </div>
                      <span className="text-xs text-purple-400">
                        Aktif:{" "}
                        {versions.find((v) => v.isActive)?.version ||
                          "varsayılan"}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-700/50">
                      {versions.map((v) => {
                        const metrics = v.metrics as any;
                        return (
                          <div
                            key={v.id}
                            className={`px-4 py-3 ${v.isActive ? "bg-purple-500/5" : "hover:bg-gray-700/30"}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-mono ${v.isActive ? "bg-purple-500/20 text-purple-400" : "bg-gray-700 text-gray-400"}`}
                                >
                                  {v.version}
                                </span>
                                {v.isActive && (
                                  <span className="text-xs text-green-400">
                                    ● Aktif
                                  </span>
                                )}
                                {v.description && (
                                  <span className="text-xs text-gray-500">
                                    {v.description}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {metrics && (
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    {metrics.usageCount > 0 && (
                                      <span>
                                        📊 {metrics.usageCount} kullanım
                                      </span>
                                    )}
                                    {metrics.avgScore > 0 && (
                                      <span>⭐ {metrics.avgScore} puan</span>
                                    )}
                                    {metrics.avgDuration > 0 && (
                                      <span>
                                        ⏱️ {formatDuration(metrics.avgDuration)}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!v.isActive && (
                                  <button
                                    onClick={() => handleActivatePrompt(v.id)}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
                                  >
                                    Aktif Et
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* System prompt preview */}
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 font-mono line-clamp-2">
                                {v.systemPrompt.substring(0, 200)}...
                              </p>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                              <span>
                                🌡️ temp: {(v.config as any)?.temperature ?? "?"}
                              </span>
                              <span>
                                📏 tokens: {(v.config as any)?.maxTokens ?? "?"}
                              </span>
                              <span>
                                🤖 {(v.config as any)?.model ?? "deepseek-chat"}
                              </span>
                              <span>
                                📅{" "}
                                {new Date(v.createdAt).toLocaleDateString(
                                  "tr-TR",
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
