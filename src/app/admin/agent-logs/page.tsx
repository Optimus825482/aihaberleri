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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Play,
    Pause,
    Trash2,
    Download,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info,
    Bug,
    Wifi,
    WifiOff,
    ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function AgentLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [showDebug, setShowDebug] = useState(false);
    const [filter, setFilter] = useState<string>("");
    const eventSourceRef = useRef<EventSource | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
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
                        // Keep last 500 logs
                        return newLogs.slice(-500);
                    });
                } else if (data.type === "heartbeat") {
                    // Connection alive
                }
            } catch (e) {
                console.error("Failed to parse log:", e);
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            eventSource.close();
            // Try to reconnect after 5 seconds
            setTimeout(connect, 5000);
        };
    }, [isPaused]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [connect]);

    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    const clearLogs = () => {
        setLogs([]);
    };

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

    const filteredLogs = logs.filter((log) => {
        if (!showDebug && log.level === "debug") return false;
        if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) {
            return false;
        }
        return true;
    });

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const stats = {
        total: logs.length,
        success: logs.filter((l) => l.level === "success").length,
        warn: logs.filter((l) => l.level === "warn").length,
        error: logs.filter((l) => l.level === "error").length,
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                            Canlı Agent Logları
                        </h1>
                        <p className="text-gray-400 mt-1">
                            News Agent işlem akışını gerçek zamanlı izleyin
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
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
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-gray-900/50 border-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Info className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                                <p className="text-xs text-gray-500">Toplam Log</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-900/50 border-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.success}</p>
                                <p className="text-xs text-gray-500">Başarılı</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-900/50 border-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10">
                                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.warn}</p>
                                <p className="text-xs text-gray-500">Uyarı</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-900/50 border-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <XCircle className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.error}</p>
                                <p className="text-xs text-gray-500">Hata</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Controls */}
                <Card className="bg-gray-900/50 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={cn(
                                        "gap-2",
                                        isPaused && "border-yellow-500/50 text-yellow-400"
                                    )}
                                >
                                    {isPaused ? (
                                        <>
                                            <Play className="h-4 w-4" />
                                            Devam Et
                                        </>
                                    ) : (
                                        <>
                                            <Pause className="h-4 w-4" />
                                            Duraklat
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearLogs}
                                    className="gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Temizle
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadLogs}
                                    className="gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    İndir
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={connect}
                                    className="gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Yeniden Bağlan
                                </Button>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="auto-scroll"
                                        checked={autoScroll}
                                        onCheckedChange={setAutoScroll}
                                    />
                                    <Label htmlFor="auto-scroll" className="text-sm text-gray-400">
                                        Otomatik Kaydır
                                    </Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="show-debug"
                                        checked={showDebug}
                                        onCheckedChange={setShowDebug}
                                    />
                                    <Label htmlFor="show-debug" className="text-sm text-gray-400">
                                        Debug Göster
                                    </Label>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Filtrele..."
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Log Viewer */}
                <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span
                                    className={cn(
                                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                        isConnected && !isPaused ? "bg-green-400" : "bg-gray-400"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "relative inline-flex rounded-full h-2 w-2",
                                        isConnected && !isPaused ? "bg-green-500" : "bg-gray-500"
                                    )}
                                />
                            </span>
                            Log Akışı
                        </CardTitle>
                        <CardDescription>
                            {filteredLogs.length} log gösteriliyor
                            {isPaused && " (duraklatıldı)"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={scrollRef}
                            className="h-[600px] overflow-y-auto bg-black/50 rounded-lg border border-gray-800 font-mono text-sm"
                        >
                            {filteredLogs.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <div className="text-center">
                                        <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Henüz log yok</p>
                                        <p className="text-xs mt-1">
                                            Agent çalıştığında loglar burada görünecek
                                        </p>
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
                                                    "flex items-start gap-2 px-2 py-1.5 rounded border",
                                                    config.bg,
                                                    config.border
                                                )}
                                            >
                                                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                                                <span className="text-gray-500 shrink-0">
                                                    {formatTime(log.timestamp)}
                                                </span>
                                                {log.module && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs px-1.5 py-0 shrink-0"
                                                    >
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

                        {!autoScroll && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="fixed bottom-8 right-8 gap-2 shadow-lg"
                            >
                                <ArrowDown className="h-4 w-4" />
                                En Alta Git
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
