"use client";

import { AdminLayout } from "@/components/AdminLayout";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Zap,
    Brain,
    Database,
    BarChart3,
    Languages,
    Beaker,
    Shield,
    Timer,
    Sparkles,
    Eye,
    CheckCircle2,
    Clock,
    Circle,
    ExternalLink,
    Code2,
    ArrowRight,
    Rocket,
    Bell,
    Share2,
    TrendingUp,
    DollarSign,
    Users,
    Image,
    Search,
    Globe,
    Cpu,
    MapPin,
} from "lucide-react";
import Link from "next/link";

interface Improvement {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    priority: "critical" | "high" | "medium" | "low";
    status: "completed" | "in-progress" | "planned";
    category: string;
    features: string[];
    implementationFile?: string;
    docsLink?: string;
    progress?: number;
    completedDate?: string;
}

const improvements: Improvement[] = [
    // ========== TAMAMLANAN ÖZELLİKLER ==========
    {
        id: "circuit-breaker",
        title: "Circuit Breaker Pattern",
        description:
            "Tüm harici API çağrıları için otomatik hata toleransı ve kurtarma mekanizması.",
        icon: <Shield className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "Resilience",
        progress: 100,
        completedDate: "2026-01",
        features: [
            "DeepSeek, Gemini, Brave, SearXNG için ayrı circuit breaker",
            "5 başarısız çağrıda devre açılır",
            "30 saniye cooldown süresi",
            "Redis üzerinde durum persistansı",
        ],
        implementationFile: "src/lib/circuit-breaker.ts",
    },
    {
        id: "smart-scheduler",
        title: "Smart Scheduling",
        description:
            "Türkiye saat dilimine göre akıllı zamanlama. Peak saatlerde daha sık içerik üretimi.",
        icon: <Timer className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "Scheduling",
        progress: 100,
        completedDate: "2026-01",
        features: [
            "Türkiye saat dilimine göre (UTC+3)",
            "Peak saatler: 08:00-10:00, 12:00-14:00, 18:00-22:00",
            "Breaking news modu: 5 dakika aralık",
        ],
        implementationFile: "src/lib/smart-scheduler.ts",
        docsLink: "/admin/pipeline",
    },
    {
        id: "pgvector-duplicate",
        title: "Semantic Duplicate Detection",
        description:
            "Pgvector ile semantik benzerlik analizi. Aynı konuyu farklı kelimelerle anlatan haberleri yakalama.",
        icon: <Database className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "AI/ML",
        progress: 100,
        completedDate: "2026-01",
        features: [
            "OpenAI text-embedding-3-small modeli",
            "1536 boyutlu vektör embeddings",
            "0.85 threshold ile duplicate tespiti",
        ],
        implementationFile: "src/lib/embeddings.ts",
    },
    {
        id: "pipeline-dashboard",
        title: "Pipeline Dashboard",
        description:
            "Multi-agent pipeline'ın gerçek zamanlı görselleştirmesi ve monitoring.",
        icon: <BarChart3 className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "Monitoring",
        progress: 100,
        completedDate: "2026-01",
        features: [
            "6 agent akış diyagramı",
            "Circuit breaker durum göstergesi",
            "Smart scheduler bilgileri",
        ],
        implementationFile: "src/app/admin/pipeline/page.tsx",
        docsLink: "/admin/pipeline",
    },
    {
        id: "title-ab-testing",
        title: "Title A/B Testing",
        description:
            "Her haber için 3 alternatif başlık üretimi ve performans takibi.",
        icon: <Beaker className="w-6 h-6" />,
        priority: "medium",
        status: "completed",
        category: "Optimization",
        progress: 100,
        completedDate: "2026-01",
        features: [
            "3 başlık varyantı: Primary, Clickbait, SEO",
            "CTR (Click-through rate) takibi",
            "A/B test dashboard",
        ],
        implementationFile: "src/lib/title-ab-testing.ts",
    },
    {
        id: "seo-automation",
        title: "SEO Automation Suite",
        description:
            "Tam otomatik SEO: Schema.org JSON-LD, sitemap, meta tags, internal linking.",
        icon: <Search className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "SEO",
        progress: 100,
        completedDate: "2026-02",
        features: [
            "NewsArticle, BreadcrumbList, Organization JSON-LD",
            "Dynamic sitemap.xml generation",
            "AI-generated meta descriptions",
            "Internal linking system",
        ],
        implementationFile: "src/lib/seo/structured-data.ts",
    },
    {
        id: "image-optimization",
        title: "Image Optimization & CDN",
        description:
            "Sharp ile görsel optimizasyonu, WebP dönüşümü, Cloudflare R2 CDN desteği.",
        icon: <Image className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "Performance",
        progress: 100,
        completedDate: "2026-02",
        features: [
            "Sharp ile WebP conversion",
            "Multiple size variants (large, medium, small, thumb)",
            "Cloudflare R2 CDN support",
            "Local storage fallback",
        ],
        implementationFile: "src/lib/image-optimizer.ts",
    },
    {
        id: "multi-level-cache",
        title: "Multi-Level Caching",
        description:
            "L1 Memory + L2 Redis çok katmanlı cache sistemi. Tag-based invalidation.",
        icon: <Cpu className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "Performance",
        progress: 100,
        completedDate: "2026-02",
        features: [
            "L1: Memory cache (30s TTL)",
            "L2: Redis cache (custom TTL)",
            "Tag-based cache invalidation",
            "Automatic cache warming",
        ],
        implementationFile: "src/lib/cache.ts",
    },
    {
        id: "websocket-realtime",
        title: "WebSocket Real-time Updates",
        description:
            "Socket.io ile gerçek zamanlı dashboard güncellemeleri ve bildirimler.",
        icon: <Zap className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "Real-time",
        progress: 100,
        completedDate: "2026-02",
        features: [
            "Agent progress notifications",
            "Article published events",
            "Admin dashboard live updates",
            "Visitor tracking real-time",
        ],
        implementationFile: "src/lib/socket.ts",
    },
    {
        id: "ghostwriter-engine",
        title: "Ghostwriter Engine",
        description:
            "Anti-AI detection içerik üretimi. Burstiness, perplexity, emotional hooks.",
        icon: <Brain className="w-6 h-6" />,
        priority: "high",
        status: "completed",
        category: "AI/ML",
        progress: 100,
        completedDate: "2026-02",
        features: [
            "Complex sentence variation (burstiness)",
            "Emotional hooks integration",
            "Forbidden AI patterns filtering",
            "Human-like content generation",
        ],
        implementationFile: "src/lib/deepseek.ts",
    },

    // ========== DEVAM EDEN ÖZELLİKLER ==========
    {
        id: "multi-language-rss",
        title: "Multi-Language RSS Feeds",
        description:
            "İngilizce dışında Almanca, Fransızca, Japonca AI haber kaynakları.",
        icon: <Languages className="w-6 h-6" />,
        priority: "medium",
        status: "in-progress",
        category: "Content",
        progress: 60,
        features: [
            "5+ dilde RSS kaynakları",
            "Otomatik dil tespiti",
            "Türkçeye çeviri",
            "Coğrafi haber dağılımı",
        ],
        implementationFile: "src/lib/rss.ts",
    },

    // ========== YENİ PLANLANAN ÖZELLİKLER (2026 Q1-Q2) ==========
    {
        id: "ai-personalization",
        title: "AI Personalization Engine",
        description:
            "Kullanıcı tercihlerine göre kişiselleştirilmiş içerik önerileri ve 'For You' feed.",
        icon: <Users className="w-6 h-6" />,
        priority: "critical",
        status: "planned",
        category: "AI/ML",
        progress: 0,
        features: [
            "User preference tracking",
            "Reading history analysis",
            "Category affinity scoring",
            "Personalized homepage feed",
            "'For You' section",
            "Email digest personalization",
        ],
    },
    {
        id: "push-notifications",
        title: "Push Notification System",
        description:
            "Firebase FCM ile web push bildirimleri. Breaking news alerts, personalized updates.",
        icon: <Bell className="w-6 h-6" />,
        priority: "critical",
        status: "planned",
        category: "Engagement",
        progress: 0,
        features: [
            "Web Push Notifications (PWA)",
            "Breaking news alerts",
            "Personalized updates",
            "Topic-based subscriptions",
            "Scheduled notifications (08:00, 18:00)",
        ],
    },
    {
        id: "social-auto-post",
        title: "Automated Social Media Posting",
        description:
            "Yayın sonrası otomatik sosyal medya paylaşımı. Platform-specific formatting.",
        icon: <Share2 className="w-6 h-6" />,
        priority: "high",
        status: "planned",
        category: "Social",
        progress: 0,
        features: [
            "Auto-post on publish",
            "Twitter thread format + hashtags",
            "LinkedIn professional tone",
            "Best time scheduling",
            "Performance tracking",
        ],
    },
    {
        id: "ml-ranking",
        title: "ML-Based Article Ranking",
        description:
            "Machine learning ile engagement tahmini. AI + ML hybrid scoring sistemi.",
        icon: <TrendingUp className="w-6 h-6" />,
        priority: "high",
        status: "planned",
        category: "AI/ML",
        progress: 0,
        features: [
            "RandomForestRegressor model",
            "Historical data training",
            "Engagement prediction",
            "Hybrid scoring: AI (60%) + ML (40%)",
            "Continuous learning",
        ],
    },
    {
        id: "advanced-analytics",
        title: "Advanced Analytics Dashboard",
        description:
            "Detaylı kullanıcı davranış analizi: retention, session depth, scroll tracking.",
        icon: <Eye className="w-6 h-6" />,
        priority: "high",
        status: "planned",
        category: "Analytics",
        progress: 0,
        features: [
            "Retention rate tracking",
            "Session depth (articles read)",
            "Scroll depth tracking",
            "Time on page analytics",
            "Conversion funnel visualization",
        ],
    },
    {
        id: "content-quality-scoring",
        title: "Content Quality Scoring",
        description:
            "AI ile içerik kalitesi değerlendirmesi. Readability, SEO uyumu, AI detection.",
        icon: <Sparkles className="w-6 h-6" />,
        priority: "medium",
        status: "planned",
        category: "AI/ML",
        progress: 0,
        features: [
            "Flesch-Kincaid readability (TR variant)",
            "Originality score",
            "SEO compliance check",
            "AI detection score",
            "Auto-improve suggestions",
        ],
    },
    {
        id: "monetization",
        title: "Monetization Infrastructure",
        description:
            "Premium membership, newsletter sponsorship, native ads, API access.",
        icon: <DollarSign className="w-6 h-6" />,
        priority: "medium",
        status: "planned",
        category: "Business",
        progress: 0,
        features: [
            "Stripe integration",
            "Premium membership (ad-free)",
            "Newsletter sponsorship",
            "API access (B2B)",
            "Paywall component",
        ],
    },
    {
        id: "live-visitor-map",
        title: "Live Visitor Map",
        description:
            "Leaflet.js ile gerçek zamanlı ziyaretçi haritası ve coğrafi istatistikler.",
        icon: <MapPin className="w-6 h-6" />,
        priority: "medium",
        status: "planned",
        category: "Analytics",
        progress: 0,
        features: [
            "Real-time visitor pins",
            "Country/city aggregation",
            "Heatmap overlay",
            "Geographic insights",
        ],
    },
    {
        id: "multi-language-content",
        title: "Multi-Language Content Generation",
        description:
            "Almanca, İspanyolca, Arapça AI içerik üretimi. RTL support.",
        icon: <Globe className="w-6 h-6" />,
        priority: "low",
        status: "planned",
        category: "Content",
        progress: 0,
        features: [
            "German (DE) - EU market",
            "Spanish (ES) - LATAM market",
            "Arabic (AR) - MENA market",
            "RTL layout support",
            "Hreflang SEO tags",
        ],
    },
];

const StatusBadge = ({ status }: { status: Improvement["status"] }) => {
    const variants = {
        completed: {
            className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
            text: "Tamamlandı",
        },
        "in-progress": {
            className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            icon: <Clock className="w-3 h-3 mr-1" />,
            text: "Devam Ediyor",
        },
        planned: {
            className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
            icon: <Circle className="w-3 h-3 mr-1" />,
            text: "Planlandı",
        },
    };

    const variant = variants[status];

    return (
        <Badge
            variant="outline"
            className={`${variant.className} flex items-center`}
        >
            {variant.icon}
            {variant.text}
        </Badge>
    );
};

const PriorityBadge = ({ priority }: { priority: Improvement["priority"] }) => {
    const variants = {
        critical: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        high: "bg-red-500/20 text-red-400 border-red-500/30",
        medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };

    const labels = {
        critical: "🔥 Kritik",
        high: "Yüksek Öncelik",
        medium: "Orta Öncelik",
        low: "Düşük Öncelik",
    };

    return (
        <Badge variant="outline" className={variants[priority]}>
            {labels[priority]}
        </Badge>
    );
};

export default function ImprovementsPage() {
    const completedCount = improvements.filter(
        (i) => i.status === "completed"
    ).length;
    const inProgressCount = improvements.filter(
        (i) => i.status === "in-progress"
    ).length;
    const plannedCount = improvements.filter((i) => i.status === "planned").length;
    const overallProgress = Math.round(
        (completedCount / improvements.length) * 100
    );

    const categories = [...new Set(improvements.map((i) => i.category))];

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                            <Rocket className="w-8 h-8 text-blue-400" />
                            İyileştirmeler & Geliştirme Planı
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Multi-Agent News Pipeline için planlanan ve tamamlanan
                            geliştirmeler
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/pipeline">
                            <Button variant="outline" className="gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Pipeline Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Tamamlanan</p>
                                    <p className="text-3xl font-bold text-emerald-400">
                                        {completedCount}
                                    </p>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Devam Ediyor</p>
                                    <p className="text-3xl font-bold text-blue-400">
                                        {inProgressCount}
                                    </p>
                                </div>
                                <Clock className="w-8 h-8 text-blue-400/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Planlandı</p>
                                    <p className="text-3xl font-bold text-gray-400">
                                        {plannedCount}
                                    </p>
                                </div>
                                <Circle className="w-8 h-8 text-gray-400/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                        <CardContent className="pt-6">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Genel İlerleme
                                    </p>
                                    <span className="text-lg font-bold text-purple-400">
                                        {overallProgress}%
                                    </span>
                                </div>
                                <Progress value={overallProgress} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                        const count = improvements.filter(
                            (i) => i.category === category
                        ).length;
                        return (
                            <Badge
                                key={category}
                                variant="secondary"
                                className="px-3 py-1 text-sm"
                            >
                                {category} ({count})
                            </Badge>
                        );
                    })}
                </div>

                {/* Improvements Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {improvements.map((improvement) => (
                        <Card
                            key={improvement.id}
                            className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${improvement.status === "completed"
                                    ? "bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20"
                                    : improvement.status === "in-progress"
                                        ? "bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20"
                                        : "bg-gradient-to-br from-gray-500/5 to-transparent border-gray-500/20"
                                }`}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`p-2 rounded-lg ${improvement.status === "completed"
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : improvement.status === "in-progress"
                                                        ? "bg-blue-500/20 text-blue-400"
                                                        : "bg-gray-500/20 text-gray-400"
                                                }`}
                                        >
                                            {improvement.icon}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">
                                                {improvement.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                {improvement.category}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <StatusBadge status={improvement.status} />
                                        <PriorityBadge priority={improvement.priority} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    {improvement.description}
                                </p>

                                {improvement.progress !== undefined && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>İlerleme</span>
                                            <span>{improvement.progress}%</span>
                                        </div>
                                        <Progress value={improvement.progress} className="h-1.5" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Özellikler
                                    </p>
                                    <ul className="space-y-1">
                                        {improvement.features.map((feature, idx) => (
                                            <li
                                                key={idx}
                                                className="text-xs text-muted-foreground flex items-start gap-2"
                                            >
                                                <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {(improvement.implementationFile || improvement.docsLink) && (
                                    <div className="flex gap-2 pt-2 border-t border-border/50">
                                        {improvement.implementationFile && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs font-mono gap-1 cursor-pointer hover:bg-muted/50"
                                            >
                                                <Code2 className="w-3 h-3" />
                                                {improvement.implementationFile.split("/").pop()}
                                            </Badge>
                                        )}
                                        {improvement.docsLink && (
                                            <Link href={improvement.docsLink}>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs gap-1 cursor-pointer hover:bg-muted/50"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Dashboard
                                                </Badge>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Documentation Link */}
                <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/20">
                    <CardContent className="py-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-blue-500/20">
                                    <Sparkles className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">
                                        Detaylı Analiz & Dokümantasyon
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Multi-Agent Pipeline&apos;ın tam teknik analizi ve
                                        geliştirme önerileri
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="gap-2" asChild>
                                    <a
                                        href="/docs/MULTI-AGENT-NEWS-PIPELINE-ANALYSIS.md"
                                        target="_blank"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Pipeline Analizi
                                    </a>
                                </Button>
                                <Button variant="outline" className="gap-2" asChild>
                                    <a
                                        href="/docs/PIPELINE-IMPROVEMENT-PROPOSALS.md"
                                        target="_blank"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Geliştirme Önerileri
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
