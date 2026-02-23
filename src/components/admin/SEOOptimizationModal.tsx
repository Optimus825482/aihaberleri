"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Search,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SEODiff } from "./SEODiffView";
export type { SEODiff };

const SEODiffView = dynamic(
  () => import("./SEODiffView").then((mod) => mod.SEODiffView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Yükleniyor...</span>
      </div>
    ),
  },
);

interface SEOOptimizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  articleTitle: string;
  onSuccess?: () => void;
}

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "pending" | "running" | "completed" | "error";
}

const PIPELINE_STEPS: Omit<PipelineStep, "status">[] = [
  { id: "evaluate", label: "SEO Değerlendirmesi", icon: <Search className="h-5 w-5" /> },
  { id: "optimize", label: "Optimizasyon", icon: <Wand2 className="h-5 w-5" /> },
  { id: "validate", label: "Doğrulama", icon: <ShieldCheck className="h-5 w-5" /> },
];

/**
 * SEO Optimization Modal
 * Pipeline: Evaluate → Optimize → Validate → User Approval
 */
export function SEOOptimizationModal({
  open,
  onOpenChange,
  articleId,
  articleTitle,
  onSuccess,
}: SEOOptimizationModalProps) {
  const [step, setStep] = useState<"config" | "processing" | "review" | "completed">("config");
  const [progress, setProgress] = useState(0);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [diffs, setDiffs] = useState<SEODiff[]>([]);
  const [beforeScore, setBeforeScore] = useState<number | null>(null);
  const [afterScore, setAfterScore] = useState<number | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [pipelineMessage, setPipelineMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startOptimization = async () => {
    setStep("processing");
    setProgress(0);
    setError(null);
    setBeforeScore(null);
    setAfterScore(null);
    setScoreDelta(null);

    // Initialize pipeline steps
    const steps: PipelineStep[] = PIPELINE_STEPS.map((s) => ({
      ...s,
      status: "pending" as const,
    }));
    setPipelineSteps(steps);

    // Start progress animation
    const stepIds = ["evaluate", "optimize", "validate"];
    let stepIndex = 0;

    const progressInterval = setInterval(() => {
      if (stepIndex < stepIds.length) {
        setPipelineSteps((prev) =>
          prev.map((s) =>
            s.id === stepIds[stepIndex] ? { ...s, status: "running" } : s,
          ),
        );
        setProgress(((stepIndex + 1) / stepIds.length) * 80);
      }
    }, 2000);

    try {
      const response = await fetch(
        `/api/admin/articles/${articleId}/optimize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Optimizasyon başarısız oldu");
      }

      const data = await response.json();

      // Mark all steps completed
      setPipelineSteps((prev) =>
        prev.map((s) => ({ ...s, status: "completed" as const })),
      );
      setProgress(100);

      // Set score data
      setBeforeScore(data.beforeScore ?? null);
      setAfterScore(data.afterScore ?? null);
      setScoreDelta(data.scoreDelta ?? null);
      setPipelineMessage(data.message || "");

      if (data.diffs && data.diffs.length > 0) {
        setDiffs(data.diffs);
        // Small delay so user sees completed steps
        await new Promise((resolve) => setTimeout(resolve, 500));
        setStep("review");
      } else {
        setPipelineMessage("Makale zaten optimize durumda, değişiklik gerekmiyor.");
        setStep("completed");
      }
    } catch (err) {
      clearInterval(progressInterval);
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(message);

      // Mark current running step as error
      setPipelineSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s)),
      );

      setStep("config");
      toast({
        title: "Hata ❌",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleApplyDiffs = async (selectedFields: string[]) => {
    try {
      const response = await fetch(
        `/api/admin/articles/${articleId}/apply-seo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: selectedFields,
            diffs: diffs.filter((d) => selectedFields.includes(d.field)),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Değişiklikler uygulanamadı");
      }

      const data = await response.json();
      if (data.newScore) {
        setAfterScore(data.newScore);
      }

      setStep("completed");
      toast({
        title: "Başarılı ✅",
        description: `${selectedFields.length} değişiklik uygulandı`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Hata ❌",
        description: "Değişiklikler uygulanamadı",
        variant: "destructive",
      });
    }
  };

  const handleReject = () => {
    setStep("config");
    setDiffs([]);
  };

  const handleClose = () => {
    setStep("config");
    setProgress(0);
    setPipelineSteps([]);
    setDiffs([]);
    setBeforeScore(null);
    setAfterScore(null);
    setScoreDelta(null);
    setPipelineMessage("");
    setError(null);
    onOpenChange(false);
  };

  const ScoreCard = () => {
    if (beforeScore === null || afterScore === null) return null;
    const delta = scoreDelta ?? (afterScore - beforeScore);
    const isPositive = delta >= 0;

    return (
      <div className="flex items-center justify-center gap-6 p-4 bg-muted/30 rounded-lg border">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Mevcut Skor</div>
          <div className="text-2xl font-bold">{beforeScore}</div>
        </div>
        <div className="text-2xl text-muted-foreground">→</div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Yeni Skor</div>
          <div className="text-2xl font-bold">{afterScore}</div>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${isPositive
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {isPositive ? "+" : ""}{delta}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            SEO Optimizasyonu
          </DialogTitle>
          <DialogDescription>{articleTitle}</DialogDescription>
        </DialogHeader>

        {/* Configuration Step */}
        {step === "config" && (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                Akıllı SEO Pipeline
              </h4>
              <p className="text-sm text-muted-foreground">
                Makale deterministik SEO kurallarıyla değerlendirilir, sorunlu alanlar AI ile optimize edilir,
                ardından tekrar değerlendirilerek skor düşüşü olmadığı doğrulanır. Sonuçlar onayına sunulur.
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Search className="h-3 w-3" /> Değerlendir
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <Wand2 className="h-3 w-3" /> Optimize Et
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Doğrula
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Onayla
                </span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button
              onClick={startOptimization}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              SEO Optimizasyonunu Başlat
            </Button>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">
                SEO Pipeline Çalışıyor...
              </h3>
              <p className="text-sm text-muted-foreground">
                Makale değerlendiriliyor, optimize ediliyor ve doğrulanıyor
              </p>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="space-y-2">
              {pipelineSteps.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {s.status === "pending" && (
                    <div className="h-5 w-5 rounded-full border-2 border-muted" />
                  )}
                  {s.status === "running" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {s.status === "completed" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {s.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && (
          <div className="py-4 space-y-4">
            <ScoreCard />
            {pipelineMessage && (
              <p className="text-sm text-muted-foreground text-center">{pipelineMessage}</p>
            )}
            <SEODiffView
              diffs={diffs}
              onApply={handleApplyDiffs}
              onReject={handleReject}
            />
          </div>
        )}

        {/* Completed Step */}
        {step === "completed" && (
          <div className="space-y-6 py-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <div>
              <h3 className="text-xl font-bold mb-2">
                Optimizasyon Tamamlandı! 🎉
              </h3>
              {pipelineMessage && (
                <p className="text-muted-foreground mb-3">{pipelineMessage}</p>
              )}
              <ScoreCard />
            </div>
            <Button onClick={handleClose} className="w-full">
              Kapat
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
