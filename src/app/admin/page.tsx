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

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Sistem durumu ve istatistikler
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
              className="w-full sm:w-auto"
            >
              <Play className="mr-2 h-4 w-4" />
              {executing ? "Çalıştırılıyor..." : "Agent'ı Şimdi Çalıştır"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Çalıştırma
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Oluşturulan Haberler
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Kuyruk Durumu
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Son Çalıştırma
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
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

        {/* Real-time Logs - Embedded */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <CardTitle>Agent Çalıştırma Logları</CardTitle>
              </div>
              <CardDescription>Gerçek zamanlı işlem logları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 text-slate-50 p-3 sm:p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-xs sm:text-sm overflow-x-auto">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-2 ${
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                          ? "text-green-400"
                          : log.type === "progress"
                            ? "text-blue-400"
                            : "text-slate-300"
                    }`}
                  >
                    <span className="text-slate-500 mr-2">
                      [{new Date(log.timestamp).toLocaleTimeString("tr-TR")}]
                    </span>
                    {log.message}
                  </div>
                ))}
                {executing && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span>Çalıştırılıyor...</span>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Execution History */}
        <Card>
          <CardHeader>
            <CardTitle>Son Çalıştırmalar</CardTitle>
            <CardDescription>Son 5 agent çalıştırması</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.history.map((execution) => (
                <div
                  key={execution.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base">
                      {new Date(execution.executionTime).toLocaleString(
                        "tr-TR",
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {execution.articlesCreated} haber oluşturuldu (
                      {execution.articlesScraped} tarandı)
                      {execution.duration && ` • ${execution.duration}s`}
                    </p>
                  </div>
                  <div className="self-end sm:self-auto">
                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                        execution.status === "SUCCESS"
                          ? "bg-green-100 text-green-800"
                          : execution.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
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
                <p className="text-center text-muted-foreground py-8">
                  Henüz çalıştırma yok. Başlamak için "Agent'ı Şimdi Çalıştır"
                  butonuna tıklayın.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
