"use client";

import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  FileText,
  TrendingUp,
  Clock,
  Play,
  Calendar,
  Terminal,
} from "lucide-react";

interface Stats {
  agent: {
    totalExecutions: number;
    successfulExecutions: number;
    totalArticles: number;
    successRate: number;
    lastExecution: string | null;
    lastStatus: string | null;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  history: Array<{
    id: string;
    executionTime: string;
    status: string;
    articlesCreated: number;
    articlesScraped: number;
    duration: number | null;
  }>;
  categoryStats: Array<{
    name: string;
    count: number;
  }>;
}

interface LogMessage {
  message: string;
  type: "info" | "success" | "error" | "progress";
  timestamp: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/agent/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const executeAgent = async () => {
    setExecuting(true);
    setLogs([]);

    try {
      // Create EventSource for streaming logs
      const eventSource = new EventSource("/api/agent/stream");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "complete") {
          // Agent completed
          setExecuting(false);
          fetchStats();
          eventSource.close();
        } else {
          // Regular log message
          setLogs((prev) => [...prev, data as LogMessage]);
        }
      };

      eventSource.onerror = () => {
        setExecuting(false);
        setLogs((prev) => [
          ...prev,
          {
            message: "❌ Bağlantı hatası",
            type: "error",
            timestamp: new Date().toISOString(),
          },
        ]);
        eventSource.close();
      };
    } catch (error) {
      setExecuting(false);
      setLogs((prev) => [
        ...prev,
        {
          message: `❌ Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
          type: "error",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const scheduleAgent = async () => {
    try {
      const response = await fetch("/api/agent/schedule", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert(
          `Agent planlandı! Sonraki çalıştırma ${data.data.delayHours.toFixed(2)} saat sonra`,
        );
        fetchStats();
      } else {
        alert(`Planlama başarısız: ${data.error}`);
      }
    } catch (error) {
      alert("Agent planlanamadı");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate max count for progress bars
  const maxCategoryCount = stats?.categoryStats?.length
    ? Math.max(...stats.categoryStats.map((c) => c.count))
    : 1;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">
              Command Center <span className="text-primary">Pro</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Sistem durumu, otonom agent kontrolü ve içerik analizi
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={scheduleAgent}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Görev Planla
            </Button>
            <Button
              onClick={executeAgent}
              disabled={executing}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
            >
              <Play className="mr-2 h-4 w-4" />
              {executing
                ? "Ghostwriter Çalışıyor..."
                : "Agent'ı Şimdi Çalıştır"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Çalıştırma
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.agent.totalExecutions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                %{stats?.agent.successRate || 0} başarı oranı
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Oluşturulan Haberler
              </CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.agent.totalArticles || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Otonom agent tarafından
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Kuyruk Durumu
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.queue.delayed || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Planlanan görevler
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Son Çalıştırma
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.agent.lastStatus || "Yok"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.agent.lastExecution
                  ? new Date(stats.agent.lastExecution).toLocaleString("tr-TR")
                  : "Hiç"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Kategori Dağılımı</CardTitle>
              <CardDescription>Hangi kategoride kaç haber var?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.categoryStats && stats.categoryStats.length > 0 ? (
                  stats.categoryStats.map((cat, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">
                          {cat.count} haber
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full transition-all duration-500"
                          style={{
                            width: `${(cat.count / maxCategoryCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz kategori verisi yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Execution History */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Son Operasyonlar</CardTitle>
              <CardDescription>Son 5 Ghostwriter görevi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.history.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {new Date(execution.executionTime).toLocaleString(
                          "tr-TR",
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {execution.articlesCreated} haber oluşturuldu (
                        {execution.articlesScraped} tarandı)
                      </p>
                    </div>
                    <div className="self-end sm:self-auto">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          execution.status === "SUCCESS"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : execution.status === "FAILED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {execution.status === "SUCCESS"
                          ? "BAŞARILI"
                          : execution.status === "FAILED"
                            ? "BAŞARISIZ"
                            : "KISMİ"}
                      </span>
                    </div>
                  </div>
                ))}

                {(!stats?.history || stats.history.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    Henüz işlem yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Logs - Embedded */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-green-500" />
                <CardTitle className="text-zinc-100">Agent Terminali</CardTitle>
              </div>
              {executing && (
                <div className="flex items-center gap-2 text-green-500 text-sm animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  CANLI
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm h-64 overflow-y-auto space-y-1 pr-2">
              {logs.length === 0 && !executing ? (
                <p className="text-zinc-500 italic">
                  Terminal hazır. Komut bekleniyor...
                </p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString("tr-TR")}]
                    </span>
                    <span
                      className={`${
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                            ? "text-green-400 font-semibold"
                            : log.type === "progress"
                              ? "text-blue-400"
                              : "text-zinc-300"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              {executing && (
                <div className="flex items-center gap-2 text-green-500/50">
                  <span>_</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
