"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Play,
  Loader2,
  XCircle,
  CheckCircle,
  RotateCcw,
  Square,
  CheckSquare,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ComboSummary {
  key: string;
  platform: string;
  language: string;
  label: string;
  icon: string;
  missingCount: number;
  articleCount: number;
}

interface ActiveBatch {
  id: string;
  platform: string;
  status: string;
  progress?: {
    state: string;
    progress: {
      currentArticle?: number;
      totalArticles?: number;
      processed?: number;
      failed?: number;
      skipped?: number;
    };
  };
}

export default function RetrySharesPage() {
  const { toast } = useToast();
  const [combos, setCombos] = useState<ComboSummary[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalMissing, setTotalMissing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [starting, setStarting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Active batch tracking
  const [activeBatch, setActiveBatch] = useState<ActiveBatch | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/retry-shares", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.summary) {
        setCombos(data.summary);
        setTotalArticles(data.totalArticles);
        setTotalMissing(data.totalMissing);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
    setLoading(false);
  }, []);

  const fetchBatchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social-shares/batch", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.activeBatch) {
        setActiveBatch(data.activeBatch);
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => {
            fetchBatchStatus();
            fetchData();
          }, 3000);
        }
      } else {
        if (activeBatch) {
          fetchData();
          toast({ title: "Tamamlandı", description: "Retry işlemi bitti" });
        }
        setActiveBatch(null);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (e) {
      console.error("Batch status error:", e);
    }
  }, [activeBatch, fetchData, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    fetchBatchStatus();
  }, []);
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const toggleCombo = (key: string) => {
    setSelectedCombos((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const selectAllWithMissing = () => {
    const withMissing = combos
      .filter((c) => c.missingCount > 0)
      .map((c) => c.key);
    setSelectedCombos((prev) =>
      prev.length === withMissing.length ? [] : withMissing,
    );
  };

  const startRetry = async () => {
    setShowConfirm(false);
    if (selectedCombos.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "En az bir platform seçin",
      });
      return;
    }
    setStarting(true);
    try {
      const res = await fetch("/api/admin/retry-shares", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combos: selectedCombos, intervalSeconds }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Başlatıldı", description: data.message });
        setSelectedCombos([]);
        fetchBatchStatus();
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: data.error,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Retry başlatılamadı",
      });
    }
    setStarting(false);
  };

  const cancelBatch = async () => {
    if (!activeBatch) return;
    setCancelConfirm(false);
    try {
      const res = await fetch(
        `/api/admin/social-shares/batch?batchId=${activeBatch.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "İptal Edildi", description: "Batch durduruldu" });
        setActiveBatch(null);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        fetchData();
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İptal edilemedi",
      });
    }
  };

  const selectedMissingTotal = combos
    .filter((c) => selectedCombos.includes(c.key))
    .reduce((sum, c) => sum + c.missingCount, 0);

  return (
    <AdminLayout>
      {/* Cancel Dialog */}
      <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry İptal</AlertDialogTitle>
            <AlertDialogDescription>
              Aktif retry işlemini iptal etmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Start Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry Başlat</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCombos.length} platform+dil kombinasyonu için toplam ~
              {selectedMissingTotal} eksik paylaşım {intervalSeconds} saniye
              aralıkla yapılacak. Tahmini süre: ~
              {Math.ceil((selectedMissingTotal * intervalSeconds) / 60)} dakika.
              Devam edilsin mi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={startRetry}>Başlat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-7 h-7 text-cyan-400" />
              Eksik Paylaşım Retry
            </h1>
            <p className="text-gray-400 mt-1">
              Platform ve dil bazında eksik paylaşımları tekrar dene
              {!loading && (
                <span className="text-cyan-400 ml-2 font-medium">
                  ({totalMissing} eksik / {totalArticles} toplam haber)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchData();
                fetchBatchStatus();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Yenile
            </button>
          </div>
        </div>

        {/* Active Batch Progress */}
        {activeBatch && (
          <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-xl border border-cyan-500/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                Retry Devam Ediyor — {activeBatch.platform}
              </h3>
              <button
                onClick={() => setCancelConfirm(true)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" /> İptal
              </button>
            </div>
            {activeBatch.progress?.progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">İlerleme:</span>
                  <span className="text-white">
                    {activeBatch.progress.progress.currentArticle || 0} /{" "}
                    {activeBatch.progress.progress.totalArticles || "?"} haber
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-400">
                    ✅ {activeBatch.progress.progress.processed || 0}
                  </span>
                  <span className="text-red-400">
                    ❌ {activeBatch.progress.progress.failed || 0}
                  </span>
                  <span className="text-yellow-400">
                    ⏭️ {activeBatch.progress.progress.skipped || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                    style={{
                      width: `${
                        (activeBatch.progress.progress.totalArticles || 0) > 0
                          ? ((activeBatch.progress.progress.currentArticle ||
                              0) /
                              (activeBatch.progress.progress.totalArticles ||
                                1)) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-cyan-300">
                  Sayfa kapatılsa bile arka planda devam eder
                </p>
              </div>
            )}
          </div>
        )}

        {/* Platform+Language Combo Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Platform × Dil Kombinasyonları
            </h2>
            <button
              onClick={selectAllWithMissing}
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {selectedCombos.length ===
              combos.filter((c) => c.missingCount > 0).length ? (
                <>
                  <CheckSquare className="w-4 h-4" /> Seçimi Kaldır
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" /> Tümünü Seç
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {combos.map((combo) => {
                const isSelected = selectedCombos.includes(combo.key);
                const hasMissing = combo.missingCount > 0;
                return (
                  <button
                    key={combo.key}
                    onClick={() => hasMissing && toggleCombo(combo.key)}
                    disabled={!hasMissing || !!activeBatch}
                    className={`rounded-xl p-5 border transition-all text-left relative overflow-hidden ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500 shadow-lg shadow-cyan-500/10"
                        : hasMissing
                          ? "bg-white/5 border-white/10 hover:border-cyan-500/50 hover:bg-white/10"
                          : "bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="w-5 h-5 text-cyan-400" />
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{combo.icon}</span>
                      <div>
                        <div className="text-white font-semibold">
                          {combo.label}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">
                          {combo.language}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-3xl font-bold ${hasMissing ? "text-amber-400" : "text-green-400"}`}
                    >
                      {hasMissing ? combo.missingCount : "✓"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {hasMissing ? "eksik paylaşım" : "tamamı paylaşılmış"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Controls */}
        {selectedCombos.length > 0 && !activeBatch && (
          <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl border border-cyan-500/20 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold">
                  {selectedCombos.length} combo seçildi — ~
                  {selectedMissingTotal} eksik paylaşım
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCombos.map((key) => {
                    const combo = combos.find((c) => c.key === key);
                    return combo ? (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs"
                      >
                        {combo.icon} {combo.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label htmlFor="retry-interval" className="sr-only">
                    Aralık
                  </label>
                  <select
                    id="retry-interval"
                    value={intervalSeconds}
                    onChange={(e) =>
                      setIntervalSeconds(parseInt(e.target.value))
                    }
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                  >
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                    <option value={120}>120s</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={starting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all text-white font-medium disabled:opacity-50"
                >
                  {starting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Retry Başlat
                </button>
              </div>
            </div>

            <p className="text-xs text-cyan-300/60 mt-3">
              Her haber arasında {intervalSeconds}s beklenecek. Tahmini süre: ~
              {Math.ceil((selectedMissingTotal * intervalSeconds) / 60)} dakika.
              İşlem arka planda çalışır.
            </p>
          </div>
        )}

        {/* Info */}
        {!loading && totalMissing === 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-400">
              Tüm Paylaşımlar Tamam
            </h3>
            <p className="text-gray-400 mt-1">
              Tüm haberler tüm platformlarda paylaşılmış.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
