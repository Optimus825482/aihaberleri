"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  Clock,
  FileText,
  Layers,
  Play,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pause,
  Trash2,
  Download,
  Info,
  AlertTriangle,
  Bug,
  Wifi,
  WifiOff,
  Terminal,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CountdownTimer } from "@/components/CountdownTimer";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface AgentSettings {
  enabled: boolean;
  intervalHours: number;
  articlesPerRun: number;
  categories: string[];
  lastRun: string | null;
  nextRun: string | null;
  emailNotifications: boolean;
  adminEmail: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface WorkerStatus {
  workerOnline: boolean;
  lastHeartbeat: string | null;
  timeSinceHeartbeat?: number;
}

interface RecentLog {
  id: string;
  status: string;
  articlesCreated: number;
  duration: number;
  executionTime: string;
  errors?: string[];
}

export default function AgentSettingsPage() {
  const [settings, setSettings] = useState<AgentSettings>({
    enabled: true,
    intervalHours: 6,
    articlesPerRun: 3,
    categories: [],
    lastRun: null,
    nextRun: null,
    emailNotifications: true,
    adminEmail: "ikinciyenikitap54@gmail.com",
  });
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    [],
  );
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>({
    workerOnline: false,
    lastHeartbeat: null,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchWorkerStatus();
    fetchRecentLogs();

    // Poll worker status every 30 seconds
    const interval = setInterval(() => {
      fetchWorkerStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/agent/settings");
      const data = await response.json();

      if (data.success) {
        setSettings(data.data.settings);
        setAvailableCategories(data.data.availableCategories);
      } else {
        toast({
          title: "Hata",
          description: data.error || "Ayarlar yüklenemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayarlar yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerStatus = async () => {
    try {
      const response = await fetch("/api/agent/worker-status");
      const data = await response.json();
      setWorkerStatus(data);
    } catch (error) {
      console.error("Failed to fetch worker status:", error);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const response = await fetch("/api/agent/logs?limit=5");
      const data = await response.json();
      if (data.success) {
        setRecentLogs(data.data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch recent logs:", error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/agent/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: settings.enabled,
          intervalHours: settings.intervalHours,
          articlesPerRun: settings.articlesPerRun,
          categories: settings.categories,
          emailNotifications: settings.emailNotifications,
          adminEmail: settings.adminEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Ayarlar kaydedildi",
        });
        fetchSettings(); // Refresh to get updated nextRun
      } else {
        toast({
          title: "Hata",
          description: data.error || "Ayarlar kaydedilemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const triggerAgent = async () => {
    if (!settings.enabled) {
      toast({
        title: "Uyarı",
        description: "Agent devre dışı. Lütfen önce aktif edin.",
        variant: "destructive",
      });
      return;
    }

    setTriggering(true);
    try {
      const response = await fetch("/api/agent/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          executeNow: true, // Manuel tetikleme için hemen çalıştır
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description:
            "Agent tetiklendi, tarama ekranına yönlendiriliyorsunuz...",
        });

        // redirect to scan page with jobId parameter
        setTimeout(() => {
          window.location.href = `/admin/scan?autoStart=true&jobId=${data.data.jobId}`;
        }, 1500);
      } else {
        toast({
          title: "Hata",
          description: data.error || "Agent tetiklenemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Agent tetiklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setTriggering(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const selectAllCategories = () => {
    setSettings((prev) => ({
      ...prev,
      categories: availableCategories.map((cat) => cat.id),
    }));
  };

  const deselectAllCategories = () => {
    setSettings((prev) => ({
      ...prev,
      categories: [],
    }));
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Agent Ayarları
            </h1>
            <p className="text-muted-foreground mt-2">
              Otonom haber toplama agent'ını yapılandırın
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={triggerAgent}
              disabled={!settings.enabled || triggering}
              variant="outline"
            >
              <Play className="mr-2 h-4 w-4" />
              {triggering ? "Tetikleniyor..." : "Manuel Tetikle"}
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card
          className={`border-2 ${settings.enabled ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.enabled ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Agent Aktif
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    Agent Devre Dışı
                  </>
                )}
              </div>
              <Badge
                variant={workerStatus.workerOnline ? "default" : "destructive"}
                className="ml-2"
              >
                Worker: {workerStatus.workerOnline ? "🟢 Online" : "🔴 Offline"}
              </Badge>
            </CardTitle>
            <CardDescription>
              {settings.enabled
                ? "Agent otomatik olarak haber topluyor"
                : "Agent şu anda çalışmıyor"}
              {workerStatus.lastHeartbeat && (
                <span className="text-xs block mt-1">
                  Son heartbeat: {new Date(workerStatus.lastHeartbeat).toLocaleString("tr-TR")}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-card rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">
                  Son Çalışma
                </div>
                <div className="font-medium">
                  {settings.lastRun
                    ? new Date(settings.lastRun).toLocaleString("tr-TR")
                    : "Henüz çalışmadı"}
                </div>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">
                  Sonraki Çalışma
                </div>
                <div className="font-medium">
                  {settings.nextRun && settings.enabled
                    ? new Date(settings.nextRun).toLocaleString("tr-TR")
                    : "Planlanmadı"}
                </div>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">
                  Kalan Süre
                </div>
                <div className="font-medium">
                  {settings.nextRun && settings.enabled ? (
                    <CountdownTimer
                      targetTimestamp={settings.nextRun}
                      onComplete={() => fetchSettings()}
                    />
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Temel Ayarlar
              </CardTitle>
              <CardDescription>Agent'ın çalışma parametreleri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="text-base">
                    Agent Durumu
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Agent'ı aktif veya pasif yapın
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              {/* Interval Hours */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="interval" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Çalışma Sıklığı
                  </Label>
                  <Badge variant="secondary">
                    {settings.intervalHours < 1
                      ? `${Math.round(settings.intervalHours * 60)} dk`
                      : `${settings.intervalHours} saat`}
                  </Badge>
                </div>
                <select
                  id="interval"
                  aria-label="Çalışma sıklığı seçin"
                  value={settings.intervalHours}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, intervalHours: parseFloat(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background/50 backdrop-blur-sm text-foreground"
                >
                  <option value="0.25">15 Dakikada Bir</option>
                  <option value="0.5">30 Dakikada Bir</option>
                  <option value="1">Saatte Bir</option>
                  <option value="2">2 Saatte Bir</option>
                  <option value="3">3 Saatte Bir</option>
                  <option value="4">4 Saatte Bir</option>
                  <option value="6">6 Saatte Bir</option>
                  <option value="12">12 Saatte Bir</option>
                  <option value="24">Günde Bir</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Agent her {settings.intervalHours < 1
                    ? `${Math.round(settings.intervalHours * 60)} dakikada`
                    : `${settings.intervalHours} saatte`} bir çalışacak
                </p>
              </div>

              {/* Articles Per Run */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="articles" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Haber Sayısı
                  </Label>
                  <Badge variant="secondary">
                    {settings.articlesPerRun} haber
                  </Badge>
                </div>
                <Slider
                  id="articles"
                  min={1}
                  max={10}
                  step={1}
                  value={[settings.articlesPerRun]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, articlesPerRun: value }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Her çalıştırmada {settings.articlesPerRun} haber toplanacak
                </p>
              </div>

              <hr className="my-4 border-muted" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">E-posta Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      İşlem sonrası rapor gönderilsin
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        emailNotifications: checked,
                      }))
                    }
                  />
                </div>

                {settings.emailNotifications && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Yönetici E-posta
                    </Label>
                    <input
                      className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      placeholder="email@example.com"
                      value={settings.adminEmail}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          adminEmail: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Kategori Seçimi
              </CardTitle>
              <CardDescription>
                Hangi kategorilerden haber toplanacak?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCategories}
                  className="flex-1"
                >
                  Tümünü Seç
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllCategories}
                  className="flex-1"
                >
                  Tümünü Kaldır
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {availableCategories.length > 0 ? (
                  availableCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={category.id}
                        checked={settings.categories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label
                        htmlFor={category.id}
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {category.name}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {category.slug}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Kategori bulunamadı
                  </p>
                )}
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {settings.categories.length === 0 ? (
                    <span className="text-orange-500 font-medium">
                      ⚠️ Hiçbir kategori seçilmedi. Tüm kategorilerden haber
                      toplanacak.
                    </span>
                  ) : (
                    <span>{settings.categories.length} kategori seçildi</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Logs Card */}
        {recentLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Son Çalıştırmalar
              </CardTitle>
              <CardDescription>
                Agent'ın son 5 çalıştırma geçmişi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          log.status === "SUCCESS"
                            ? "default"
                            : log.status === "PARTIAL"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
                      <div>
                        <div className="text-sm font-medium">
                          {log.articlesCreated} haber oluşturuldu
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.executionTime).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {log.duration}s
                      </div>
                      {log.errors && log.errors.length > 0 && (
                        <div className="text-xs text-red-500">
                          {log.errors.length} hata
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Logs Section */}
        <LiveLogsSection />
      </div>
    </AdminLayout>
  );
}

// =====================================================
// LIVE LOGS COMPONENT - Integrated from agent-logs page
// =====================================================

interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "warn" | "error" | "debug";
  message: string;
  module?: string;
  data?: Record<string, unknown>;
}

const levelConfig = {
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  error: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  debug: {
    icon: Bug,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
};

function LiveLogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/agent/live-logs");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          setIsConnected(true);
        } else if (data.type === "log" && !isPaused) {
          setLogs((prev) => {
            const newLogs = [...prev, data as LogEntry];
            return newLogs.slice(-200); // Keep last 200 logs
          });
        }
      } catch (e) {
        console.error("Failed to parse log:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      setTimeout(connect, 5000);
    };
  }, [isPaused]);

  useEffect(() => {
    if (isExpanded) {
      connect();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect, isExpanded]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const content = logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}]${log.module ? ` [${log.module}]` : ""} ${log.message}`
      )
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-logs-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (!showDebug && log.level === "debug") return false;
    return true;
  });

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.level === "success").length,
    error: logs.filter((l) => l.level === "error").length,
  };

  return (
    <Card className="border-cyan-500/20">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            <Terminal className="h-5 w-5" />
            Canlı Agent Logları
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  isConnected
                    ? "border-green-500/50 text-green-400"
                    : "border-red-500/50 text-red-400"
                )}
              >
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Bağlı
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Bağlantı Kesildi
                  </>
                )}
              </Badge>
            )}
            <Badge variant="secondary">
              {isExpanded ? "Daralt" : "Genişlet"}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          News Agent işlem akışını gerçek zamanlı izleyin
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-500">Toplam</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="text-lg font-bold text-green-400">{stats.success}</div>
              <div className="text-xs text-gray-500">Başarılı</div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-lg font-bold text-red-400">{stats.error}</div>
              <div className="text-xs text-gray-500">Hata</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
                className={cn(isPaused && "border-yellow-500/50 text-yellow-400")}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Devam
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Duraklat
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-1" />
                Temizle
              </Button>
              <Button variant="outline" size="sm" onClick={downloadLogs}>
                <Download className="h-4 w-4 mr-1" />
                İndir
              </Button>
              <Button variant="outline" size="sm" onClick={connect}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-scroll-live"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                />
                <Label htmlFor="auto-scroll-live" className="text-xs">Otomatik Kaydır</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-debug-live"
                  checked={showDebug}
                  onCheckedChange={setShowDebug}
                />
                <Label htmlFor="show-debug-live" className="text-xs">Debug</Label>
              </div>
            </div>
          </div>

          {/* Log Viewer */}
          <div className="h-[400px] overflow-y-auto bg-black/50 rounded-lg border border-gray-800 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Info className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Henüz log yok</p>
                  <p className="text-xs mt-1">Agent çalıştığında loglar burada görünecek</p>
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredLogs.map((log, index) => {
                  const config = levelConfig[log.level];
                  const Icon = config.icon;
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-2 px-2 py-1 rounded border",
                        config.bg,
                        config.border
                      )}
                    >
                      <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", config.color)} />
                      <span className="text-gray-500 shrink-0">{formatTime(log.timestamp)}</span>
                      {log.module && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                          {log.module}
                        </Badge>
                      )}
                      <span className={cn("text-gray-300 break-all", config.color)}>
                        {log.message}
                      </span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>

          {!autoScroll && filteredLogs.length > 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full gap-2"
            >
              <ArrowDown className="h-4 w-4" />
              En Alta Git
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
