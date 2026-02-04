/**
 * A/B Testing Dashboard Component
 *
 * Displays A/B test statistics for articles
 */

"use client";

import { useState, useEffect } from "react";
import { TitleVariantType } from "@/lib/title-ab-testing";

interface ABTestStats {
    variants: {
        primary: string;
        clickbait: string;
        seo: string;
    };
    activeVariant: TitleVariantType;
    stats: {
        variant: TitleVariantType;
        title: string;
        views: number;
        clicks: number;
        ctr: number;
    }[];
    winner: TitleVariantType | null;
    totalViews: number;
    totalClicks: number;
}

interface ABTestDashboardProps {
    articleId: string;
    articleTitle: string;
}

export function ABTestDashboard({
    articleId,
    articleTitle,
}: ABTestDashboardProps) {
    const [stats, setStats] = useState<ABTestStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lockingWinner, setLockingWinner] = useState(false);

    useEffect(() => {
        fetchStats();
    }, [articleId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/ab-testing/${articleId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setStats(null);
                    return;
                }
                throw new Error("Failed to fetch A/B test stats");
            }

            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    const lockWinner = async () => {
        try {
            setLockingWinner(true);
            const response = await fetch(`/api/ab-testing/${articleId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "lock" }),
            });

            const data = await response.json();
            if (data.success) {
                await fetchStats();
            } else {
                setError(data.error || "Failed to lock winner");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLockingWinner(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 bg-slate-800/50 rounded-lg animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-slate-700 rounded"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400">
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>Bu makale için A/B testi yapılandırılmamış</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/20 rounded-lg border border-red-700">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    const getVariantLabel = (variant: TitleVariantType) => {
        switch (variant) {
            case "primary":
                return "Profesyonel";
            case "clickbait":
                return "Dikkat Çekici";
            case "seo":
                return "SEO Odaklı";
        }
    };

    const getVariantColor = (variant: TitleVariantType, isWinner: boolean) => {
        if (isWinner) return "bg-green-500/20 border-green-500";
        switch (variant) {
            case "primary":
                return "bg-blue-500/20 border-blue-500/50";
            case "clickbait":
                return "bg-orange-500/20 border-orange-500/50";
            case "seo":
                return "bg-purple-500/20 border-purple-500/50";
        }
    };

    return (
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg
                        className="w-5 h-5 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                    </svg>
                    Başlık A/B Testi
                </h3>

                {stats.winner ? (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Kazanan: {getVariantLabel(stats.winner)}
                    </span>
                ) : (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Test Devam Ediyor
                    </span>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-400 text-sm">Toplam Görüntülenme</p>
                    <p className="text-2xl font-bold text-white">
                        {stats.totalViews.toLocaleString("tr-TR")}
                    </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-400 text-sm">Toplam Tıklama</p>
                    <p className="text-2xl font-bold text-white">
                        {stats.totalClicks.toLocaleString("tr-TR")}
                    </p>
                </div>
            </div>

            {/* Variant Cards */}
            <div className="space-y-3">
                {stats.stats.map((stat) => {
                    const isWinner = stats.winner === stat.variant;
                    const isActive = stats.activeVariant === stat.variant;

                    return (
                        <div
                            key={stat.variant}
                            className={`p-3 rounded-lg border ${getVariantColor(stat.variant, isWinner)}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-sm font-medium ${isWinner ? "text-green-400" : "text-slate-300"}`}
                                    >
                                        {getVariantLabel(stat.variant)}
                                    </span>
                                    {isActive && !stats.winner && (
                                        <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded text-xs">
                                            Aktif
                                        </span>
                                    )}
                                    {isWinner && (
                                        <span className="px-2 py-0.5 bg-green-500/30 text-green-300 rounded text-xs">
                                            🏆 Kazanan
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`text-lg font-bold ${isWinner ? "text-green-400" : "text-white"}`}
                                >
                                    {(stat.ctr * 100).toFixed(2)}% CTR
                                </span>
                            </div>

                            <p className="text-slate-300 text-sm mb-2 line-clamp-1">
                                {stat.title}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span>
                                    👁️ {stat.views.toLocaleString("tr-TR")} görüntülenme
                                </span>
                                <span>👆 {stat.clicks.toLocaleString("tr-TR")} tıklama</span>
                            </div>

                            {/* CTR Progress Bar */}
                            <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${isWinner
                                            ? "bg-green-500"
                                            : stat.variant === "primary"
                                                ? "bg-blue-500"
                                                : stat.variant === "clickbait"
                                                    ? "bg-orange-500"
                                                    : "bg-purple-500"
                                        }`}
                                    style={{ width: `${Math.min(stat.ctr * 100 * 5, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            {!stats.winner && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                    <button
                        onClick={lockWinner}
                        disabled={lockingWinner || stats.totalViews < 100}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {lockingWinner ? (
                            <>
                                <svg
                                    className="w-4 h-4 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Kilitleniyor...
                            </>
                        ) : stats.totalViews < 100 ? (
                            <>
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                                Min. 100 görüntülenme gerekli ({stats.totalViews}/100)
                            </>
                        ) : (
                            <>
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                Kazananı Kilitle
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export default ABTestDashboard;
