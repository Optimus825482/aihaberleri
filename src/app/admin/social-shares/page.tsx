/**
 * Social Media Shares Admin Page
 * Central dashboard for tracking and managing social media shares
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
    Share2,
    RefreshCw,
    Play,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Settings,
    Loader2,
} from "lucide-react";

// Platform icons and colors
const platformConfig: Record<string, { icon: string; color: string; label: string }> = {
    FACEBOOK: { icon: "📘", color: "bg-blue-600", label: "Facebook TR" },
    FACEBOOK_EN: { icon: "📘", color: "bg-blue-500", label: "Facebook EN" },
    BLUESKY: { icon: "🦋", color: "bg-blue-400", label: "Bluesky" },
    MASTODON: { icon: "🐘", color: "bg-purple-600", label: "Mastodon" },
    TUMBLR: { icon: "📝", color: "bg-indigo-600", label: "Tumblr" },
};

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
        SHARED: { icon: <CheckCircle className="w-3 h-3" />, color: "bg-green-500/20 text-green-400", text: "Paylaşıldı" },
        PENDING: { icon: <Clock className="w-3 h-3" />, color: "bg-yellow-500/20 text-yellow-400", text: "Bekliyor" },
        SCHEDULED: { icon: <Clock className="w-3 h-3" />, color: "bg-blue-500/20 text-blue-400", text: "Planlandı" },
        PROCESSING: { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: "bg-purple-500/20 text-purple-400", text: "İşleniyor" },
        FAILED: { icon: <XCircle className="w-3 h-3" />, color: "bg-red-500/20 text-red-400", text: "Başarısız" },
        NOT_CREATED: { icon: <AlertCircle className="w-3 h-3" />, color: "bg-gray-500/20 text-gray-400", text: "Yok" },
    };

    const c = config[status] || config.NOT_CREATED;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${c.color}`}>
            {c.icon}
            {c.text}
        </span>
    );
}

export default function SocialSharesPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [batchLoading, setBatchLoading] = useState(false);
    const [stats, setStats] = useState<Record<string, any>>({});
    const [batches, setBatches] = useState<any[]>([]);

    // Filters
    const [search, setSearch] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [unsharedOnly, setUnsharedOnly] = useState(false);

    // Batch settings
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["FACEBOOK", "FACEBOOK_EN", "BLUESKY", "MASTODON", "TUMBLR"]);
    const [batchSize, setBatchSize] = useState(10);
    const [intervalSeconds, setIntervalSeconds] = useState(10);

    // Active batch tracking
    const [activeBatch, setActiveBatch] = useState<any>(null);
    const [progressPolling, setProgressPolling] = useState<NodeJS.Timeout | null>(null);

    // Fetch articles
    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(search && { search }),
                ...(selectedPlatform && { platform: selectedPlatform }),
                ...(unsharedOnly && { unsharedOnly: "true" }),
            });

            const res = await fetch(`/api/admin/social-shares?${params}`, {
                credentials: "include",
            });
            const data = await res.json();

            if (data.articles) {
                setArticles(data.articles);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        }
        setLoading(false);
    }, [pagination.page, pagination.limit, search, selectedPlatform, unsharedOnly]);

    // Fetch batch stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/social-shares/batch", {
                credentials: "include",
            });
            const data = await res.json();

            if (data.stats) setStats(data.stats);
            if (data.batches) setBatches(data.batches);
            if (data.activeBatch) {
                setActiveBatch(data.activeBatch);
                // Start polling if active batch exists
                if (!progressPolling) {
                    const interval = setInterval(fetchStats, 3000); // Poll every 3 seconds
                    setProgressPolling(interval);
                }
            } else {
                setActiveBatch(null);
                // Stop polling if no active batch
                if (progressPolling) {
                    clearInterval(progressPolling);
                    setProgressPolling(null);
                }
            }
        } catch (error) {
            console.error("Stats fetch error:", error);
        }
    }, [progressPolling]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Start batch
    const startBatch = async () => {
        if (selectedPlatforms.length === 0) {
            alert("En az bir platform seçmelisiniz");
            return;
        }

        setBatchLoading(true);
        try {
            const res = await fetch("/api/admin/social-shares/batch", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    platforms: selectedPlatforms,
                    batchSize,
                    intervalSeconds,
                }),
            });

            const data = await res.json();

            if (data.success) {
                alert(data.message);
                setShowBatchModal(false);
                fetchArticles();
                fetchStats();
            } else {
                alert(data.error || "Batch başlatılamadı");
            }
        } catch (error) {
            console.error("Batch error:", error);
            alert("Batch başlatılırken hata oluştu");
        }
        setBatchLoading(false);
    };

    // Toggle platform selection
    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (progressPolling) {
                clearInterval(progressPolling);
            }
        };
    }, [progressPolling]);

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Share2 className="w-7 h-7" />
                            Sosyal Medya Paylaşımları
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Tüm platformlar için merkezi paylaşım takibi
                        </p>
                    </div>
                    <button
                        onClick={() => setShowBatchModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                    >
                        <Play className="w-4 h-4" />
                        Toplu Paylaşım Başlat
                    </button>
                </div>

                {/* Platform Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Object.entries(platformConfig).map(([platform, config]) => {
                        const stat = stats[platform] || { shared: 0, pending: 0, failed: 0, unshared: 0 };
                        return (
                            <div
                                key={platform}
                                className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{config.icon}</span>
                                    <span className="text-sm font-medium text-white">{config.label}</span>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-green-400">Paylaşıldı:</span>
                                        <span className="text-white">{stat.shared || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-yellow-400">Bekliyor:</span>
                                        <span className="text-white">{stat.pending || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Paylaşılmadı:</span>
                                        <span className="text-white">{stat.unshared || "-"}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Haber ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <select
                        value={selectedPlatform || ""}
                        onChange={(e) => setSelectedPlatform(e.target.value || null)}
                        aria-label="Platform seçimi"
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Tüm Platformlar</option>
                        {Object.entries(platformConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={unsharedOnly}
                            onChange={(e) => setUnsharedOnly(e.target.checked)}
                            className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                        />
                        Sadece paylaşılmayanlar
                    </label>

                    <button
                        onClick={() => { fetchArticles(); fetchStats(); }}
                        className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Yenile
                    </button>
                </div>

                {/* Articles Table */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Haber</th>
                                    {Object.entries(platformConfig).map(([key, config]) => (
                                        <th key={key} className="text-center px-2 py-3 text-sm font-medium text-gray-400">
                                            <span title={config.label}>{config.icon}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Yükleniyor...
                                        </td>
                                    </tr>
                                ) : articles.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                            Haber bulunamadı
                                        </td>
                                    </tr>
                                ) : (
                                    articles.map((article) => (
                                        <tr key={article.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="max-w-md">
                                                    <p className="text-white text-sm font-medium truncate" title={article.title}>
                                                        {article.title}
                                                    </p>
                                                    <p className="text-gray-500 text-xs truncate">
                                                        {article.category?.name} • {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("tr-TR") : "-"}
                                                    </p>
                                                </div>
                                            </td>
                                            {Object.keys(platformConfig).map((platform) => (
                                                <td key={platform} className="px-2 py-3 text-center">
                                                    <StatusBadge status={article.shares?.[platform]?.status || "NOT_CREATED"} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                        <div className="text-sm text-gray-400">
                            Toplam {pagination.total} haber
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page <= 1}
                                aria-label="Önceki sayfa"
                                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-400">
                                Sayfa {pagination.page} / {pagination.totalPages || 1}
                            </span>
                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page >= pagination.totalPages}
                                aria-label="Sonraki sayfa"
                                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Active Batch Progress */}
                {activeBatch && (
                    <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                Aktif Batch Çalışıyor
                            </h3>
                            <span className="text-sm text-purple-300">
                                Sayfa kapatılsa bile devam edecek
                            </span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Platformlar:</span>
                                <span className="text-white">{activeBatch.platform}</span>
                            </div>
                            {activeBatch.progress && (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">İlerleme:</span>
                                        <span className="text-white">
                                            {activeBatch.progress.progress?.currentArticle || 0} / {activeBatch.progress.progress?.totalArticles || activeBatch.totalItems} haber
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">Paylaşılan:</span>
                                        <span className="text-green-400">{activeBatch.progress.progress?.processed || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">Başarısız:</span>
                                        <span className="text-red-400">{activeBatch.progress.progress?.failed || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
                                            style={{
                                                width: `${activeBatch.progress.progress?.total > 0
                                                    ? ((activeBatch.progress.progress?.processed + activeBatch.progress.progress?.failed) / activeBatch.progress.progress?.total) * 100
                                                    : 0}%`
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Batches */}
                {batches.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Son Batch İşlemleri
                        </h3>
                        <div className="space-y-2">
                            {batches.slice(0, 5).map((batch) => (
                                <div key={batch.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span>{platformConfig[batch.platform]?.icon}</span>
                                        <span className="text-white text-sm">{platformConfig[batch.platform]?.label}</span>
                                        <span className="text-gray-400 text-xs">
                                            {batch.processedItems}/{batch.totalItems} işlendi
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${batch.status === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                                            batch.status === "PROCESSING" ? "bg-purple-500/20 text-purple-400" :
                                                batch.status === "FAILED" ? "bg-red-500/20 text-red-400" :
                                                    "bg-gray-500/20 text-gray-400"
                                            }`}>
                                            {batch.status}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                            {new Date(batch.createdAt).toLocaleString("tr-TR")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Batch Modal */}
                {showBatchModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/20 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Play className="w-5 h-5" />
                                Toplu Paylaşım Başlat
                            </h2>

                            <div className="space-y-4">
                                {/* Platform Selection */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Platformlar</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(platformConfig).map(([key, config]) => (
                                            <label
                                                key={key}
                                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedPlatforms.includes(key)
                                                    ? "bg-purple-500/20 border-purple-500"
                                                    : "bg-white/5 border-white/10 hover:border-white/30"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPlatforms.includes(key)}
                                                    onChange={() => togglePlatform(key)}
                                                    className="sr-only"
                                                />
                                                <span className="text-lg">{config.icon}</span>
                                                <span className="text-sm text-white">{config.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Seçili: {selectedPlatforms.length} platform</p>
                                </div>

                                <div>
                                    <label htmlFor="batch-size" className="block text-sm text-gray-400 mb-1">Batch Boyutu</label>
                                    <input
                                        id="batch-size"
                                        type="number"
                                        value={batchSize}
                                        onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                                        min={1}
                                        max={100}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Kaç haber paylaşılacak</p>
                                </div>

                                <div>
                                    <label htmlFor="interval-seconds" className="block text-sm text-gray-400 mb-1">Paylaşım Aralığı (saniye)</label>
                                    <select
                                        id="interval-seconds"
                                        value={intervalSeconds}
                                        onChange={(e) => setIntervalSeconds(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                    >
                                        <option value={5}>5 saniye</option>
                                        <option value={10}>10 saniye</option>
                                        <option value={15}>15 saniye</option>
                                        <option value={30}>30 saniye</option>
                                        <option value={60}>1 dakika</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Her haber arasında beklenecek süre</p>
                                </div>

                                {/* Info Box */}
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                    <p className="text-xs text-blue-300">
                                        <strong>Not:</strong> Her haber için seçili tüm platformlara aynı anda paylaşım yapılır.
                                        İşlem arka planda çalışır, sayfa kapatılsa bile devam eder.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowBatchModal(false)}
                                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:bg-white/20"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={startBatch}
                                    disabled={batchLoading || selectedPlatforms.length === 0 || !!activeBatch}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                                >
                                    {batchLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                    ) : activeBatch ? (
                                        "Batch Çalışıyor"
                                    ) : (
                                        "Başlat"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
