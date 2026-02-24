"use client";

import { useState, memo } from "react";
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
import {
    DollarSign,
    Banknote,
    MousePointerClick,
    Eye,
    TrendingUp,
    TrendingDown,
    Globe,
    FileText,
    LayoutGrid,
    Brain,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Info,
    ChevronDown,
    ChevronUp,
    Clock,
    Sparkles,
    ArrowUpRight,
} from "lucide-react";
import {
    useAdSenseSummary,
    useAdSenseReport,
    useAdSenseAnalyses,
    useTriggerAdSenseAnalysis,
    useUpdateAdSenseAnalysis,
} from "@/hooks/use-swr-admin";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
} from "recharts";

// ─── Color helpers ───
const PRIORITY_COLORS = {
    HIGH: "text-red-500 bg-red-500/10 border-red-500/30",
    MEDIUM: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    LOW: "text-blue-500 bg-blue-500/10 border-blue-500/30",
};

const SEVERITY_ICONS = {
    CRITICAL: <AlertTriangle className="h-4 w-4 text-red-500" />,
    WARNING: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    INFO: <Info className="h-4 w-4 text-blue-500" />,
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: "İnceleme Bekliyor", color: "text-yellow-500 border-yellow-500/30" },
    REVIEWED: { label: "İncelendi", color: "text-blue-500 border-blue-500/30" },
    APPLIED: { label: "Uygulandı", color: "text-emerald-500 border-emerald-500/30" },
    DISMISSED: { label: "Reddedildi", color: "text-gray-500 border-gray-500/30" },
};

const CHART_COLORS = ["#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#f97316", "#06b6d4", "#ec4899"];

// ─── Metric Card ───
const MetricCard = memo(function MetricCard({
    title,
    value,
    sub,
    icon: Icon,
    color,
}: {
    title: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <Card className={`border-${color}-500/20 bg-card/80 backdrop-blur-sm`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`shrink-0 p-2.5 bg-${color}-500/10 rounded-xl`}>
                        <Icon className={`h-5 w-5 text-${color}-500`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {title}
                        </span>
                        <div className={`text-2xl font-black text-${color}-500 leading-tight`}>
                            {value}
                        </div>
                        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

// ─── Custom Tooltip for Charts ───
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
            <p className="text-xs font-bold mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-xs" style={{ color: p.color }}>
                    {p.name}: {typeof p.value === "number" ? (p.name.includes("$") || p.name === "Gelir" ? `$${p.value.toFixed(2)}` : p.value.toLocaleString("tr-TR")) : p.value}
                </p>
            ))}
        </div>
    );
}

// ─── Main Page ───
export default function AdSensePage() {
    const { data: summaryData, isLoading: summaryLoading } = useAdSenseSummary(300000);
    const { data: reportData, isLoading: reportLoading } = useAdSenseReport(30, "detailed");
    const { data: analysesData, mutate: refreshAnalyses } = useAdSenseAnalyses(10);
    const { trigger: triggerAnalysis, isMutating: isAnalyzing } = useTriggerAdSenseAnalysis();
    const { trigger: updateAnalysis } = useUpdateAdSenseAnalysis();

    const summary = summaryData?.success ? summaryData.data : null;
    const report = reportData?.success ? reportData.data : null;
    const analyses = analysesData?.success ? analysesData.data : [];
    const configured = summaryData?.configured !== false;

    const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
    const [days, setDays] = useState(30);

    const handleAnalyze = async () => {
        try {
            await triggerAnalysis();
            refreshAnalyses();
        } catch (e: any) {
            console.error("Analiz hatası:", e);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        await updateAnalysis({ id, status });
        refreshAnalyses();
    };

    if (!configured) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Card className="max-w-md w-full border-yellow-500/20">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                                <DollarSign className="w-8 h-8 text-yellow-500" />
                            </div>
                            <h2 className="text-xl font-black mb-2">AdSense Yapılandırması Gerekli</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                AdSense verilerini görebilmek için <code className="text-xs bg-muted px-1 py-0.5 rounded">ADSENSE_ACCOUNT_ID</code> environment variable&apos;ını
                                ayarlamanız gerekiyor.
                            </p>
                            <div className="text-left bg-muted/50 p-4 rounded-xl text-xs font-mono space-y-1">
                                <p className="text-muted-foreground"># .env dosyasına ekle:</p>
                                <p>ADSENSE_ACCOUNT_ID=pub-XXXXXXXXXXXXXXXX</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                            AdSense <span className="text-yellow-500 italic">Yönetimi</span>
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                            Gelir takibi, performans analizi ve AI destekli optimizasyon
                        </p>
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="font-bold rounded-full text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Brain className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {isAnalyzing ? "Analiz ediliyor..." : "AI Analiz"}
                    </Button>
                </div>

                {/* Summary Metrics */}
                {summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricCard
                            title="Bugün Kazanç"
                            value={`$${summary.todayEarnings?.toFixed(2) || "0.00"}`}
                            sub={`${summary.todayClicks || 0} tık • ${summary.todayImpressions || 0} gösterim`}
                            icon={DollarSign}
                            color="yellow"
                        />
                        <MetricCard
                            title="Bu Ay"
                            value={`$${summary.monthEarnings?.toFixed(2) || "0.00"}`}
                            sub={`${summary.monthClicks || 0} tık • CTR: ${summary.monthCtr?.toFixed(2) || "0"}%`}
                            icon={Banknote}
                            color="emerald"
                        />
                        <MetricCard
                            title="Toplam Kazanç"
                            value={`$${summary.totalEarnings?.toFixed(2) || "0.00"}`}
                            sub="tüm zamanlar"
                            icon={TrendingUp}
                            color="blue"
                        />
                        <MetricCard
                            title="Bugün CTR / CPC"
                            value={`${summary.todayCtr?.toFixed(2) || "0"}%`}
                            sub={`CPC: $${summary.todayCpc?.toFixed(3) || "0"} • RPM: $${summary.todayRpm?.toFixed(2) || "0"}`}
                            icon={MousePointerClick}
                            color="orange"
                        />
                    </div>
                )}

                {summaryLoading && !summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-28 animate-pulse bg-muted/30 rounded-2xl" />
                        ))}
                    </div>
                )}

                {/* Revenue Chart */}
                {report?.dailyData && report.dailyData.length > 0 && (
                    <Card className="border-yellow-500/20 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="pb-2 px-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-yellow-500/10 rounded-xl">
                                        <TrendingUp className="h-4 w-4 text-yellow-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">
                                            Gelir Trendi
                                        </CardTitle>
                                        <CardDescription className="text-[10px]">
                                            Son {days} gün
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {[7, 14, 30].map((d) => (
                                        <Button
                                            key={d}
                                            variant={days === d ? "default" : "outline"}
                                            size="sm"
                                            className="h-6 px-2 text-[10px] rounded-full"
                                            onClick={() => setDays(d)}
                                        >
                                            {d}g
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-2 pb-4">
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={report.dailyData.slice(-days)}>
                                        <defs>
                                            <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10 }}
                                            stroke="hsl(var(--muted-foreground))"
                                            tickFormatter={(v) => {
                                                const parts = v.split("-");
                                                return `${parts[2]}/${parts[1]}`;
                                            }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10 }}
                                            stroke="hsl(var(--muted-foreground))"
                                            tickFormatter={(v) => `$${v}`}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="earnings"
                                            name="Gelir"
                                            stroke="#eab308"
                                            strokeWidth={2}
                                            fill="url(#earningsGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Breakdowns: Country + Ad Units */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Country Breakdown */}
                    {report?.byCountry && report.byCountry.length > 0 && (
                        <Card className="border-blue-500/20 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-2 px-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 rounded-xl">
                                        <Globe className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">
                                            Ülke Bazlı Gelir
                                        </CardTitle>
                                        <CardDescription className="text-[10px]">
                                            Son {days} gün — Top 10
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={report.byCountry.slice(0, 10)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                                            <YAxis type="category" dataKey="country" tick={{ fontSize: 10 }} width={90} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="earnings" name="Gelir" radius={[0, 4, 4, 0]}>
                                                {report.byCountry.slice(0, 10).map((_: any, i: number) => (
                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Ad Units Breakdown */}
                    {report?.byAdUnit && report.byAdUnit.length > 0 && (
                        <Card className="border-purple-500/20 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-2 px-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-500/10 rounded-xl">
                                        <LayoutGrid className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">
                                            Reklam Birimleri
                                        </CardTitle>
                                        <CardDescription className="text-[10px]">
                                            Ad unit performansı
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="space-y-2">
                                    {report.byAdUnit.map((unit: any, i: number) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">{unit.adUnit}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {unit.clicks} tık • {unit.impressions.toLocaleString("tr-TR")} gösterim
                                                </p>
                                            </div>
                                            <span className="text-sm font-black text-purple-500 shrink-0 ml-2">
                                                ${unit.earnings.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Top Pages */}
                {report?.byPage && report.byPage.length > 0 && (
                    <Card className="border-emerald-500/20 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="pb-2 px-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-500/10 rounded-xl">
                                    <FileText className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">
                                        Sayfa Bazlı Performans
                                    </CardTitle>
                                    <CardDescription className="text-[10px]">
                                        En çok gelir getiren sayfalar — Top 15
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="space-y-1">
                                {report.byPage.slice(0, 15).map((page: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                                    >
                                        <span className="text-[10px] font-black text-muted-foreground w-5 text-right shrink-0">
                                            {i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">{page.page}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {page.clicks} tık • {page.impressions.toLocaleString("tr-TR")} gösterim • RPM: ${page.rpm.toFixed(2)}
                                            </p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-500 shrink-0">
                                            ${page.earnings.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* AI Analyses History */}
                <Card className="border-violet-500/20 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-2 px-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-violet-500/10 rounded-xl">
                                    <Sparkles className="h-4 w-4 text-violet-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">
                                        AI Analiz Geçmişi
                                    </CardTitle>
                                    <CardDescription className="text-[10px]">
                                        Yapay zeka destekli performans önerileri
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                variant="outline"
                                size="sm"
                                className="rounded-full text-xs border-violet-500/30 hover:bg-violet-500/10"
                            >
                                {isAnalyzing ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                    <Brain className="mr-1 h-3 w-3 text-violet-500" />
                                )}
                                Yeni Analiz
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        {analyses.length === 0 ? (
                            <div className="text-center py-10">
                                <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Henüz analiz yapılmamış. &quot;AI Analiz&quot; butonuna tıklayarak başlayın.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {analyses.map((analysis: any) => {
                                    const isExpanded = expandedAnalysis === analysis.id;
                                    const statusInfo = STATUS_MAP[analysis.status] || STATUS_MAP.PENDING;
                                    const snapshot = analysis.metricsSnapshot as any;

                                    return (
                                        <div
                                            key={analysis.id}
                                            className="border border-border/50 rounded-xl overflow-hidden"
                                        >
                                            {/* Header */}
                                            <button
                                                onClick={() => setExpandedAnalysis(isExpanded ? null : analysis.id)}
                                                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                                            >
                                                <div className="p-2 bg-violet-500/10 rounded-lg">
                                                    <Brain className="h-4 w-4 text-violet-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold">
                                                            Analiz #{analysis.id.slice(-6)}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] h-5 ${statusInfo.color}`}
                                                        >
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDistanceToNow(new Date(analysis.createdAt), {
                                                                addSuffix: true,
                                                                locale: tr,
                                                            })}
                                                        </span>
                                                        {analysis.aiDuration && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                AI: {(analysis.aiDuration / 1000).toFixed(1)}s
                                                            </span>
                                                        )}
                                                        {snapshot?.summary && (
                                                            <span className="text-[10px] text-yellow-500 font-bold">
                                                                ${snapshot.summary.todayEarnings?.toFixed(2) || "0"}/gün
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                                )}
                                            </button>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="px-4 pb-4 space-y-4 border-t border-border/50">
                                                    {/* Metric Snapshot at the Time */}
                                                    {snapshot?.summary && (
                                                        <div className="mt-4 p-3 rounded-xl bg-muted/30">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                                Analiz Anındaki Metrikler
                                                            </p>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                                <div>
                                                                    <span className="text-muted-foreground block">Bugünkü:</span>
                                                                    <span className="font-bold text-yellow-500">
                                                                        ${snapshot.summary.todayEarnings?.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground block">Aylık:</span>
                                                                    <span className="font-bold text-emerald-500">
                                                                        ${snapshot.summary.monthEarnings?.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground block">CTR:</span>
                                                                    <span className="font-bold">
                                                                        {snapshot.summary.todayCtr?.toFixed(2)}%
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground block">RPM:</span>
                                                                    <span className="font-bold">
                                                                        ${snapshot.summary.todayRpm?.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* AI Analysis Text */}
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                            AI Analizi
                                                        </p>
                                                        <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                                            {analysis.analysis}
                                                        </div>
                                                    </div>

                                                    {/* Recommendations */}
                                                    {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                                Öneriler ({analysis.recommendations.length})
                                                            </p>
                                                            <div className="space-y-2">
                                                                {analysis.recommendations.map((rec: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className={`p-3 rounded-xl border ${PRIORITY_COLORS[rec.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.LOW}`}
                                                                    >
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[9px] h-4 px-1.5"
                                                                            >
                                                                                {rec.priority}
                                                                            </Badge>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[9px] h-4 px-1.5"
                                                                            >
                                                                                {rec.category}
                                                                            </Badge>
                                                                            <span className="text-xs font-bold">{rec.title}</span>
                                                                        </div>
                                                                        <p className="text-xs text-foreground/80">{rec.description}</p>
                                                                        {rec.expectedImpact && (
                                                                            <p className="text-[10px] mt-1 flex items-center gap-1 text-emerald-500">
                                                                                <ArrowUpRight className="h-3 w-3" />
                                                                                {rec.expectedImpact}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Warnings */}
                                                    {Array.isArray(analysis.warnings) && analysis.warnings.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                                Uyarılar
                                                            </p>
                                                            <div className="space-y-2">
                                                                {analysis.warnings.map((warn: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className="flex items-start gap-2 p-3 rounded-xl bg-muted/30"
                                                                    >
                                                                        {SEVERITY_ICONS[warn.severity as keyof typeof SEVERITY_ICONS] || SEVERITY_ICONS.INFO}
                                                                        <div>
                                                                            <p className="text-xs font-semibold">{warn.message}</p>
                                                                            {warn.metric && (
                                                                                <p className="text-[10px] text-muted-foreground">
                                                                                    Metrik: {warn.metric}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                                                        {analysis.status === "PENDING" && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleStatusChange(analysis.id, "REVIEWED")}
                                                                    className="text-xs rounded-full border-blue-500/30 hover:bg-blue-500/10"
                                                                >
                                                                    <CheckCircle2 className="mr-1 h-3 w-3 text-blue-500" />
                                                                    İncelendi
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleStatusChange(analysis.id, "APPLIED")}
                                                                    className="text-xs rounded-full border-emerald-500/30 hover:bg-emerald-500/10"
                                                                >
                                                                    <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />
                                                                    Uygulandı
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleStatusChange(analysis.id, "DISMISSED")}
                                                                    className="text-xs rounded-full border-gray-500/30 hover:bg-gray-500/10"
                                                                >
                                                                    Reddet
                                                                </Button>
                                                            </>
                                                        )}
                                                        {analysis.status === "REVIEWED" && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleStatusChange(analysis.id, "APPLIED")}
                                                                className="text-xs rounded-full border-emerald-500/30 hover:bg-emerald-500/10"
                                                            >
                                                                <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />
                                                                Uygulandı Olarak İşaretle
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
