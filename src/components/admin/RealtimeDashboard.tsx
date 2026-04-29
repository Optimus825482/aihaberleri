"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Activity,
  Newspaper,
  Eye,
  Globe,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  MapPin,
  FileText,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { PIPELINE_STEP_DEFINITIONS, type PipelineStepId } from "@/lib/pipeline-registry";

interface RealtimeData {
  timestamp: string;
  visitors: {
    active: number;
    list: Array<{
      id: string;
      page: string;
      location: string;
      flag: string;
      lastActivity: string;
    }>;
    countries: Array<{
      name: string;
      count: number;
      flag: string;
    }>;
  };
  articles: {
    todayCount: number;
    todayViews: number;
    recent: Array<{
      id: string;
      title: string;
      slug: string;
      category: string;
      publishedAt: string;
      views: number;
    }>;
  };
  pipeline: {
    queue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    agents: Array<{
      name: string;
      active: number;
      waiting: number;
      completed: number;
      failed: number;
      isRunning: boolean;
    }>;
    circuits: Array<{
      name: string;
      state: string;
      failureRate: number;
    }>;
    isProcessing: boolean;
  };
}

type RealtimeAgent = RealtimeData["pipeline"]["agents"][number];

const LEGACY_CONTENT_ENRICHER_ID = "content-enricher";

const LEGACY_CONTENT_ENRICHER_AGENT_IDS: PipelineStepId[] = [
  "source-gatherer",
  "content-synthesizer",
  "content-validator",
];

const AGENT_DISPLAY_NAMES = Object.fromEntries(
  PIPELINE_STEP_DEFINITIONS.map((step) => [step.id, step.displayName]),
) as Record<string, string>;

const normalizeAgents = (agents: RealtimeAgent[]): RealtimeAgent[] => {
  const agentMap = new Map<string, RealtimeAgent>();
  const hasSplitContentAgents = agents.some((agent) =>
    LEGACY_CONTENT_ENRICHER_AGENT_IDS.includes(agent.name as PipelineStepId),
  );

  for (const agent of agents) {
    if (agent.name === LEGACY_CONTENT_ENRICHER_ID && !hasSplitContentAgents) {
      for (const stepId of LEGACY_CONTENT_ENRICHER_AGENT_IDS) {
        agentMap.set(stepId, {
          ...agent,
          name: stepId,
        });
      }
      continue;
    }

    agentMap.set(agent.name, agent);
  }

  const orderedAgents = PIPELINE_STEP_DEFINITIONS.map((step) => {
    const normalizedAgent = agentMap.get(step.id);

    return (
      normalizedAgent ?? {
        name: step.id,
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
        isRunning: false,
      }
    );
  });

  const extraAgents = Array.from(agentMap.values()).filter(
    (agent) => !AGENT_DISPLAY_NAMES[agent.name],
  );

  return [...orderedAgents, ...extraAgents];
};

const CIRCUIT_DISPLAY_NAMES: Record<string, string> = {
  deepseek: "DeepSeek AI",
  gemini: "Gemini AI",
  pollinations: "Pollinations",
  searxng: "Google News",
  jina: "Jina Reader",
  tavily: "Tavily",
};

export function RealtimeDashboard() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/admin/realtime");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.error) {
          setError(parsed.error);
        } else {
          setData(parsed);
          setError(null);
        }
      } catch (e) {
        console.error("Failed to parse realtime data:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-32 bg-muted/50" />
        ))}
      </div>
    );
  }

  const { visitors, articles, pipeline } = data;
  const normalizedAgents = normalizeAgents(pipeline.agents);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div
          className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            isConnected ? "bg-green-500" : "bg-red-500",
          )}
        />
        <span>{isConnected ? "Canlı Bağlantı" : "Yeniden Bağlanıyor..."}</span>
        {error && <span className="text-red-500 ml-2">{error}</span>}
      </div>

      {/* Live Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Visitors */}
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktif Ziyaretçi
            </CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {visitors.active}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {visitors.countries.length} farklı ülke
            </p>
          </CardContent>
        </Card>

        {/* Today's Articles */}
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bugün Yayınlanan
            </CardTitle>
            <Newspaper className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {articles.todayCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {articles.todayViews.toLocaleString("tr-TR")} görüntülenme
            </p>
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        <Card
          className={cn(
            "border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent",
            pipeline.isProcessing && "animate-pulse",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
            <Activity
              className={cn(
                "h-4 w-4",
                pipeline.isProcessing
                  ? "text-purple-500 animate-spin"
                  : "text-muted-foreground",
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">
              {pipeline.queue.active > 0 ? "Çalışıyor" : "Beklemede"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pipeline.queue.waiting} kuyrukta, {pipeline.queue.completed}{" "}
              tamamlandı
            </p>
          </CardContent>
        </Card>

        {/* Queue Health */}
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Kuyruk Sağlığı
            </CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {pipeline.queue.failed > 0
                ? `${pipeline.queue.failed} Hata`
                : "Sağlıklı"}
            </div>
            <div className="mt-2">
              <Progress
                value={
                  pipeline.queue.completed > 0
                    ? (pipeline.queue.completed /
                        (pipeline.queue.completed + pipeline.queue.failed)) *
                      100
                    : 100
                }
                className="h-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Pipeline & Agents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Agent Durumu
              </CardTitle>
              <CardDescription>Multi-agent pipeline durumu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {normalizedAgents.map((agent) => (
                  <div key={agent.name} className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full flex-shrink-0",
                        agent.isRunning
                          ? "bg-green-500 animate-pulse"
                          : agent.failed > 0
                            ? "bg-red-500"
                            : "bg-gray-400",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {AGENT_DISPLAY_NAMES[agent.name] || agent.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          {agent.isRunning && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-500 border-green-500/20"
                            >
                              Çalışıyor
                            </Badge>
                          )}
                          {agent.waiting > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                            >
                              {agent.waiting} bekliyor
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            {agent.completed} tamamlandı
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={agent.isRunning ? 50 : 0}
                        className="h-1 mt-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Circuit Breakers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Servis Durumu
              </CardTitle>
              <CardDescription>
                Harici API circuit breaker durumları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pipeline.circuits.map((circuit) => (
                  <div
                    key={circuit.name}
                    className={cn(
                      "p-3 rounded-lg border flex items-center gap-3",
                      circuit.state === "CLOSED"
                        ? "border-green-500/20 bg-green-500/5"
                        : circuit.state === "OPEN"
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-yellow-500/20 bg-yellow-500/5",
                    )}
                  >
                    {circuit.state === "CLOSED" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : circuit.state === "OPEN" ? (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {CIRCUIT_DISPLAY_NAMES[circuit.name] || circuit.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {circuit.failureRate > 0
                          ? `%${circuit.failureRate} hata`
                          : "Sağlıklı"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Son Yayınlanan Haberler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {articles.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz haber yayınlanmadı
                  </p>
                ) : (
                  articles.recent.map((article) => (
                    <Link
                      key={article.id}
                      href={`/news/${article.slug}`}
                      target="_blank"
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm line-clamp-1">
                            {article.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {article.category}
                            </Badge>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(
                                new Date(article.publishedAt),
                                {
                                  addSuffix: true,
                                  locale: tr,
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {article.views}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Visitors */}
        <div className="space-y-6">
          {/* Country Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Ülke Dağılımı
              </CardTitle>
              <CardDescription>Aktif ziyaretçilerin ülkeleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visitors.countries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aktif ziyaretçi yok
                  </p>
                ) : (
                  visitors.countries.map((country) => (
                    <div key={country.name} className="flex items-center gap-3">
                      <span className="text-xl">{country.flag}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {country.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {country.count}
                          </span>
                        </div>
                        <Progress
                          value={(country.count / visitors.active) * 100}
                          className="h-1 mt-1"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Visitors List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Aktif Ziyaretçiler
              </CardTitle>
              <CardDescription>Son 5 dakikadaki ziyaretçiler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {visitors.list.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aktif ziyaretçi yok
                  </p>
                ) : (
                  visitors.list.map((visitor) => (
                    <div
                      key={visitor.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <span className="text-lg">{visitor.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {visitor.page === "/" ? "Ana Sayfa" : visitor.page}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {visitor.location}
                        </p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
