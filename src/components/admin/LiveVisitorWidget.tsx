"use client";

import { memo, useEffect, useState, useCallback, useRef } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    RefreshCw,
    Zap,
    MapPin,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────
interface VisitorEntry {
    id: string;
    page: string;
    location: string;
    flag: string;
    lastActivity: string;
}

interface CountryEntry {
    name: string;
    count: number;
    flag: string;
}

interface RealtimeVisitors {
    active: number;
    list: VisitorEntry[];
    countries: CountryEntry[];
}

interface RealtimeSSEData {
    timestamp: string;
    visitors: RealtimeVisitors;
    articles: {
        todayCount: number;
        todayViews: number;
    };
    pipeline: {
        queue: { waiting: number; active: number; completed: number; failed: number };
        isProcessing: boolean;
    };
}

// ─── Sparkline — Pure CSS mini chart ──────────────────────
const Sparkline = memo(function Sparkline({ history }: { history: number[] }) {
    if (history.length < 2) return null;
    const max = Math.max(...history, 1);
    const barCount = history.length;

    return (
        <div className="flex items-end gap-[2px] h-8">
            {history.map((v, i) => {
                const h = Math.max((v / max) * 100, 4);
                const isLast = i === barCount - 1;
                return (
                    <div
                        key={i}
                        className={cn(
                            "w-1.5 sm:w-2 rounded-t-sm transition-all duration-500",
                            isLast
                                ? "bg-emerald-400"
                                : v > 0
                                    ? "bg-emerald-500/30"
                                    : "bg-muted/20"
                        )}
                        style={{ height: `${h}%` }}
                    />
                );
            })}
        </div>
    );
});

// ─── Active Page Row ──────────────────────────────────────
const VisitorRow = memo(function VisitorRow({
    visitor,
    index,
}: {
    visitor: VisitorEntry;
    index: number;
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-2 py-1.5 transition-all duration-300",
                index === 0 && "animate-in fade-in slide-in-from-top-1"
            )}
        >
            <span className="text-sm shrink-0">{visitor.flag || "🌍"}</span>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-medium truncate text-foreground">
                    {visitor.page}
                </p>
                <p className="text-[9px] text-muted-foreground truncate">
                    {visitor.location}
                </p>
            </div>
            <div className="shrink-0">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
            </div>
        </div>
    );
});

// ─── Main Component ──────────────────────────────────────
function LiveVisitorWidget() {
    const [data, setData] = useState<RealtimeSSEData | null>(null);
    const [connected, setConnected] = useState(false);
    const [history, setHistory] = useState<number[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);
    const retryCountRef = useRef(0);
    const maxRetries = 5;

    const connectSSE = useCallback(() => {
        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const es = new EventSource("/api/admin/realtime");
        eventSourceRef.current = es;

        es.onopen = () => {
            setConnected(true);
            retryCountRef.current = 0;
        };

        es.onmessage = (event) => {
            try {
                const parsed: RealtimeSSEData = JSON.parse(event.data);
                if (parsed.visitors) {
                    setData(parsed);
                    setHistory((prev) => {
                        const next = [...prev, parsed.visitors.active];
                        // Keep last 20 data points
                        return next.length > 20 ? next.slice(-20) : next;
                    });
                }
            } catch {
                /* ignore parse errors */
            }
        };

        es.onerror = () => {
            setConnected(false);
            es.close();

            // Exponential backoff retry
            if (retryCountRef.current < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
                retryCountRef.current++;
                setTimeout(connectSSE, delay);
            }
        };
    }, []);

    useEffect(() => {
        connectSSE();
        return () => {
            eventSourceRef.current?.close();
        };
    }, [connectSSE]);

    const activeCount = data?.visitors?.active ?? 0;
    const visitors = data?.visitors?.list ?? [];
    const countries = data?.visitors?.countries ?? [];

    return (
        <Card className="border-emerald-500/20 bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative p-2 bg-emerald-500/10 rounded-xl">
                            <Zap className="h-4 w-4 text-emerald-500" />
                            {/* Pulse when connected & active */}
                            {connected && activeCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-tight">
                                Canlı Ziyaretçiler
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                                Kendi takip sistemi • SSE ile anlık
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Connection status */}
                        <div
                            className={cn(
                                "flex items-center gap-1 text-[9px] font-bold",
                                connected ? "text-emerald-500" : "text-red-400"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block w-1.5 h-1.5 rounded-full",
                                    connected ? "bg-emerald-500" : "bg-red-400 animate-pulse"
                                )}
                            />
                            <span className="hidden sm:inline">
                                {connected ? "CANLI" : "BAĞLANIYOR"}
                            </span>
                        </div>
                        {!connected && (
                            <button
                                onClick={connectSSE}
                                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                                title="Yeniden bağlan"
                            >
                                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 space-y-3">
                {/* Not connected state */}
                {!data && !connected && (
                    <div className="h-[120px] flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                        <p className="text-xs text-muted-foreground">Bağlanılıyor…</p>
                    </div>
                )}

                {/* Loading state — while waiting for first SSE message */}
                {!data && connected && (
                    <div className="h-[120px] flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                    </div>
                )}

                {data && (
                    <>
                        {/* Big Active Users + Sparkline */}
                        <div className="flex items-end justify-between gap-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl sm:text-5xl font-black text-emerald-500 tabular-nums leading-none">
                                    {activeCount}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground uppercase">
                                    aktif
                                </span>
                            </div>
                            {/* Mini sparkline showing history */}
                            <Sparkline history={history} />
                        </div>

                        {/* Today stats row */}
                        <div className="flex gap-2">
                            <div className="flex-1 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                                <div className="text-base sm:text-lg font-black text-blue-400 tabular-nums">
                                    {data.articles.todayCount}
                                </div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">
                                    Bugün Haber
                                </div>
                            </div>
                            <div className="flex-1 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                                <div className="text-base sm:text-lg font-black text-purple-400 tabular-nums">
                                    {data.articles.todayViews.toLocaleString("tr-TR")}
                                </div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">
                                    Bugün Okuma
                                </div>
                            </div>
                            <div className="flex-1 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
                                <div className="text-base sm:text-lg font-black text-cyan-400 tabular-nums">
                                    {data.pipeline.queue.active + data.pipeline.queue.waiting}
                                </div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">
                                    Pipeline
                                </div>
                            </div>
                        </div>

                        {/* Active visitors list */}
                        {visitors.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    Aktif Sayfalar
                                </p>
                                <div className="divide-y divide-border/20 max-h-[160px] overflow-y-auto scrollbar-thin">
                                    {visitors.slice(0, 8).map((v, i) => (
                                        <VisitorRow key={v.id} visitor={v} index={i} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Countries — Compact pills */}
                        {countries.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    Ülkeler
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {countries.slice(0, 6).map((c, i) => (
                                        <Badge
                                            key={i}
                                            variant="outline"
                                            className="text-[9px] h-5 px-1.5 gap-1 border-emerald-500/20"
                                        >
                                            <span>{c.flag}</span>
                                            {c.name}
                                            <span className="font-black text-emerald-400">
                                                {c.count}
                                            </span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pipeline mini status */}
                        {data.pipeline.isProcessing && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                                </span>
                                <span className="text-[10px] font-bold text-blue-400">
                                    Pipeline aktif — {data.pipeline.queue.active} iş işleniyor
                                </span>
                            </div>
                        )}

                        {/* Timestamp */}
                        {data.timestamp && (
                            <p className="text-[9px] text-muted-foreground text-right">
                                Son güncelleme:{" "}
                                {new Date(data.timestamp).toLocaleTimeString("tr-TR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                })}
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default memo(LiveVisitorWidget);
