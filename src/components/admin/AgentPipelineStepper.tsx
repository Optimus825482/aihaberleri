"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Globe,
    Filter,
    Copy,
    Search,
    Image as ImageIcon,
    Database,
    FileText,
    CheckCircle2,
    Circle,
    Loader2,
    Share2,
    ShieldCheck,
    XCircle,
    Zap,
    Clock,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STEP_DEFINITIONS, type PipelineStepId } from "@/lib/pipeline-registry";

interface AgentStep {
    id: string;
    name: string;
    displayName: string;
    icon?: React.ElementType;
    status: "pending" | "running" | "completed" | "error" | "skipped";
    duration?: number;
    itemsProcessed?: number;
    error?: string;
}

interface PipelineState {
    isRunning: boolean;
    currentStep: number;
    steps: AgentStep[];
    startedAt?: string;
    completedAt?: string;
    articlesCreated: number;
    totalDuration?: number;
}

const LEGACY_CONTENT_ENRICHER_ID = "content-enricher";

const LEGACY_CONTENT_ENRICHER_STEP_IDS: PipelineStepId[] = [
    "source-gatherer",
    "content-synthesizer",
    "content-validator",
];

const STEP_ICON_BY_ID: Record<PipelineStepId, React.ElementType> = {
    "duplicate-detector": Copy,
    "relevance-filter": Filter,
    "trend-enrichment": Globe,
    "source-gatherer": Search,
    "content-synthesizer": FileText,
    "content-validator": ShieldCheck,
    "visual-generator": ImageIcon,
    "seo-optimizer": TrendingUp,
    "database-publisher": Database,
    "social-share": Share2,
};

const DEFAULT_STEPS: AgentStep[] = PIPELINE_STEP_DEFINITIONS.map((step) => ({
    id: step.id,
    name: step.name,
    displayName: step.displayName,
    icon: STEP_ICON_BY_ID[step.id] ?? Circle,
    status: "pending",
}));

const STEP_META_BY_ID = DEFAULT_STEPS.reduce<Record<string, Pick<AgentStep, "displayName" | "icon" | "name">>>((acc, step) => {
    acc[step.id] = {
        displayName: step.displayName,
        icon: step.icon,
        name: step.name,
    };
    return acc;
}, {});

const normalizeStepRecord = (rawStep: any, overrideId?: string): AgentStep => {
    const id = overrideId ?? rawStep?.id ?? "unknown-step";
    const meta = STEP_META_BY_ID[id] ?? {};

    return {
        id,
        name: rawStep?.name ?? meta.name ?? id,
        displayName: rawStep?.displayName ?? meta.displayName ?? rawStep?.name ?? id ?? "Bilinmeyen Adım",
        icon: meta.icon ?? Circle,
        status: rawStep?.status ?? "pending",
        duration: rawStep?.duration,
        itemsProcessed: rawStep?.itemsProcessed,
        error: rawStep?.error,
    } as AgentStep;
};

const expandLegacyContentEnricherStep = (rawStep: any): AgentStep[] => {
    const legacyStatus = rawStep?.status ?? "pending";

    return LEGACY_CONTENT_ENRICHER_STEP_IDS.map((stepId, index) => {
        let status: AgentStep["status"] = "pending";

        if (legacyStatus === "completed" || legacyStatus === "skipped") {
            status = legacyStatus;
        } else if (legacyStatus === "error") {
            status = index === 0 ? "error" : "pending";
        } else if (legacyStatus === "running") {
            status = index === 0 ? "running" : "pending";
        }

        return normalizeStepRecord(
            {
                ...rawStep,
                status,
                duration: index === 0 ? rawStep?.duration : undefined,
                itemsProcessed: rawStep?.itemsProcessed,
                error: index === 0 ? rawStep?.error : undefined,
            },
            stepId,
        );
    });
};

const normalizeSteps = (steps: unknown): AgentStep[] => {
    if (!Array.isArray(steps) || steps.length === 0) {
        return DEFAULT_STEPS;
    }

    const stepMap = new Map<string, AgentStep>();
    const hasSplitContentSteps = steps.some((step: any) =>
        LEGACY_CONTENT_ENRICHER_STEP_IDS.includes(step?.id),
    );

    for (const rawStep of steps) {
        if (
            rawStep?.id === LEGACY_CONTENT_ENRICHER_ID &&
            !hasSplitContentSteps
        ) {
            for (const expandedStep of expandLegacyContentEnricherStep(rawStep)) {
                stepMap.set(expandedStep.id, expandedStep);
            }
            continue;
        }

        const normalizedStep = normalizeStepRecord(rawStep);
        stepMap.set(normalizedStep.id, normalizedStep);
    }

    const orderedSteps = DEFAULT_STEPS.map((defaultStep) => {
        const normalizedStep = stepMap.get(defaultStep.id);
        return normalizedStep ? { ...defaultStep, ...normalizedStep } : defaultStep;
    });

    const extraSteps = Array.from(stepMap.values()).filter(
        (step) => !STEP_META_BY_ID[step.id],
    );

    return [...orderedSteps, ...extraSteps];
};

export function AgentPipelineStepper() {
    const [pipelineState, setPipelineState] = useState<PipelineState>({
        isRunning: false,
        currentStep: -1,
        steps: DEFAULT_STEPS,
        articlesCreated: 0,
    });
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchPipelineStatus = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/pipeline/status");
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.pipeline) {
                    setPipelineState({
                        ...data.pipeline,
                        steps: normalizeSteps(data.pipeline.steps),
                    });
                    setLastUpdate(new Date());
                }
            }
        } catch (error) {
            console.error("Failed to fetch pipeline status:", error);
        }
    }, []);

    useEffect(() => {
        fetchPipelineStatus();

        // Poll every 3 seconds when running, 5 seconds otherwise
        const pollInterval = pipelineState.isRunning ? 3000 : 5000;
        const interval = setInterval(fetchPipelineStatus, pollInterval);

        return () => clearInterval(interval);
    }, [fetchPipelineStatus, pipelineState.isRunning]);

    const getStepIcon = (step: AgentStep) => {
        const Icon = step.icon ?? Circle;

        switch (step.status) {
            case "completed":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case "running":
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
            case "error":
                return <XCircle className="h-5 w-5 text-red-500" />;
            case "skipped":
                return <Circle className="h-5 w-5 text-gray-400" />;
            default:
                return <Icon className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getStepClasses = (step: AgentStep, index: number) => {
        const baseClasses = "relative flex flex-col items-center";

        switch (step.status) {
            case "completed":
                return cn(baseClasses, "text-green-600 dark:text-green-400");
            case "running":
                return cn(baseClasses, "text-blue-600 dark:text-blue-400");
            case "error":
                return cn(baseClasses, "text-red-600 dark:text-red-400");
            default:
                return cn(baseClasses, "text-muted-foreground");
        }
    };

    const getConnectorClasses = (index: number) => {
        const step = pipelineState.steps[index];
        const nextStep = pipelineState.steps[index + 1];

        if (step?.status === "completed") {
            return "bg-green-500";
        }
        if (step?.status === "running") {
            return "bg-gradient-to-r from-blue-500 to-blue-300 animate-pulse";
        }
        return "bg-muted";
    };

    const completedSteps = pipelineState.steps.filter(s => s.status === "completed").length;
    const progressPercentage = pipelineState.steps.length > 0
        ? (completedSteps / pipelineState.steps.length) * 100
        : 0;

    // Always show the pipeline stepper - show last run state or idle state
    const isIdle = !pipelineState.isRunning && completedSteps === 0;

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
            {/* Animated Background */}
            {pipelineState.isRunning && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
                </div>
            )}

            <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-xl",
                            pipelineState.isRunning
                                ? "bg-blue-500/20 ring-2 ring-blue-500/50"
                                : "bg-muted"
                        )}>
                            <Zap className={cn(
                                "h-5 w-5",
                                pipelineState.isRunning
                                    ? "text-blue-500 animate-pulse"
                                    : "text-muted-foreground"
                            )} />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                Pipeline Durumu
                                {pipelineState.isRunning && (
                                    <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 animate-pulse">
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Çalışıyor
                                    </Badge>
                                )}
                                {!pipelineState.isRunning && completedSteps > 0 && (
                                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Tamamlandı
                                    </Badge>
                                )}
                                {isIdle && (
                                    <Badge className="bg-muted text-muted-foreground border-border/50">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Bekliyor
                                    </Badge>
                                )}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Multi-Agent haber işleme akışı
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4">
                        {pipelineState.articlesCreated > 0 && (
                            <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">{pipelineState.articlesCreated}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Makale</p>
                            </div>
                        )}
                        {pipelineState.totalDuration && (
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-sm font-medium">
                                        {Math.round(pipelineState.totalDuration / 1000)}s
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <Progress
                        value={progressPercentage}
                        className="h-1.5"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        {completedSteps} / {pipelineState.steps.length} adım tamamlandı
                    </p>
                </div>
            </CardHeader>

            <CardContent className="relative z-10">
                {/* Pipeline Stepper */}
                <div className="relative">
                    {/* Steps Container */}
                    <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {pipelineState.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1 min-w-0">
                                {/* Step */}
                                <div className={cn(getStepClasses(step, index), "flex-shrink-0 w-full")}>
                                    {/* Step Circle */}
                                    <div className={cn(
                                        "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                                        step.status === "running" && "ring-4 ring-blue-500/30 bg-blue-500/20",
                                        step.status === "completed" && "bg-green-500/20",
                                        step.status === "error" && "bg-red-500/20",
                                        step.status === "pending" && "bg-muted"
                                    )}>
                                        {getStepIcon(step)}

                                        {/* Pulse Effect for Running */}
                                        {step.status === "running" && (
                                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                                        )}
                                    </div>

                                    {/* Step Label */}
                                    <p className={cn(
                                        "mt-2 text-[10px] font-semibold text-center uppercase tracking-wider leading-tight max-w-[80px]",
                                        step.status === "running" && "text-blue-600 dark:text-blue-400",
                                        step.status === "completed" && "text-green-600 dark:text-green-400",
                                        step.status === "error" && "text-red-600 dark:text-red-400"
                                    )}>
                                        {step.displayName}
                                    </p>

                                    {/* Duration/Items */}
                                    {step.duration && step.duration > 0 && (
                                        <p className="text-[9px] text-muted-foreground mt-0.5">
                                            {(step.duration / 1000).toFixed(1)}s
                                        </p>
                                    )}
                                    {step.itemsProcessed !== undefined && step.itemsProcessed > 0 && (
                                        <Badge variant="outline" className="mt-1 text-[9px] h-4 px-1">
                                            {step.itemsProcessed} işlem
                                        </Badge>
                                    )}

                                    {/* Error Message */}
                                    {step.error && (
                                        <p className="text-[9px] text-red-500 mt-1 max-w-[80px] truncate" title={step.error}>
                                            {step.error}
                                        </p>
                                    )}
                                </div>

                                {/* Connector */}
                                {index < pipelineState.steps.length - 1 && (
                                    <div
                                        className={cn(
                                            "h-0.5 flex-1 mx-1 rounded-full transition-all duration-500 min-w-[20px]",
                                            getConnectorClasses(index)
                                        )}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Last Update */}
                {lastUpdate && (
                    <p className="text-[9px] text-muted-foreground text-right mt-3">
                        Son güncelleme: {lastUpdate.toLocaleTimeString("tr-TR")}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
