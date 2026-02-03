"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  FileText,
  Code2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEODiffView, SEODiff } from "./SEODiffView";

export type SEOAgent = "analyzer" | "content" | "technical";
export type SEOMode = "auto" | "review";

interface SEOOptimizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  articleTitle: string;
  onSuccess?: () => void;
}

interface OptimizationStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
}

const AGENT_CONFIG = {
  analyzer: {
    label: "SEO Analyzer",
    description: "Temel SEO analizi ve skorlama",
    icon: Brain,
    color: "text-blue-500",
  },
  content: {
    label: "Content Optimizer",
    description: "İçerik optimizasyonu ve anahtar kelime",
    icon: FileText,
    color: "text-purple-500",
  },
  technical: {
    label: "Technical SEO",
    description: "Meta tags, yapılandırılmış veri",
    icon: Code2,
    color: "text-green-500",
  },
};

/**
 * SEO Optimization Modal
 * Multi-agent SEO optimization with progress tracking
 */
export function SEOOptimizationModal({
  open,
  onOpenChange,
  articleId,
  articleTitle,
  onSuccess,
}: SEOOptimizationModalProps) {
  const [selectedAgents, setSelectedAgents] = useState<Set<SEOAgent>>(
    new Set(["analyzer", "content", "technical"]),
  );
  const [mode, setMode] = useState<SEOMode>("review");
  const [step, setStep] = useState<
    "config" | "processing" | "review" | "completed"
  >("config");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<OptimizationStep[]>([]);
  const [diffs, setDiffs] = useState<SEODiff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleAgent = useCallback((agent: SEOAgent) => {
    setSelectedAgents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(agent)) {
        newSet.delete(agent);
      } else {
        newSet.add(agent);
      }
      return newSet;
    });
  }, []);

  const startOptimization = async () => {
    if (selectedAgents.size === 0) {
      toast({
        title: "Hata",
        description: "Lütfen en az bir agent seçin",
        variant: "destructive",
      });
      return;
    }

    setStep("processing");
    setProgress(0);
    setError(null);

    // Initialize steps
    const steps: OptimizationStep[] = Array.from(selectedAgents).map(
      (agent) => ({
        id: agent,
        label: AGENT_CONFIG[agent].label,
        status: "pending",
      }),
    );
    setCurrentStep(steps);

    try {
      // Call optimization API
      const response = await fetch(
        `/api/admin/articles/${articleId}/optimize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agents: Array.from(selectedAgents),
            mode,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Optimizasyon başarısız oldu");
      }

      const data = await response.json();

      // Simulate progress for each agent
      let currentProgress = 0;
      const progressPerAgent = 100 / selectedAgents.size;

      for (const agent of Array.from(selectedAgents)) {
        // Update step status
        setCurrentStep((prev) =>
          prev.map((s) => (s.id === agent ? { ...s, status: "running" } : s)),
        );

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 1000));

        currentProgress += progressPerAgent;
        setProgress(currentProgress);

        // Mark as completed
        setCurrentStep((prev) =>
          prev.map((s) => (s.id === agent ? { ...s, status: "completed" } : s)),
        );
      }

      setProgress(100);

      if (mode === "review" && data.diffs && data.diffs.length > 0) {
        // Show diff view for review
        setDiffs(data.diffs);
        setStep("review");
      } else {
        // Auto mode - directly applied
        setStep("completed");
        toast({
          title: "Optimizasyon Tamamlandı ✅",
          description: `${selectedAgents.size} agent başarıyla çalıştırıldı`,
        });

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      setStep("config");
      toast({
        title: "Hata ❌",
        description: "Optimizasyon başarısız oldu",
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
    setCurrentStep([]);
    setDiffs([]);
    setError(null);
    onOpenChange(false);
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
            {/* Agent Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Agent Seçimi ({selectedAgents.size}/3)
              </Label>
              <div className="grid gap-3">
                {(Object.keys(AGENT_CONFIG) as SEOAgent[]).map((agent) => {
                  const config = AGENT_CONFIG[agent];
                  const Icon = config.icon;
                  const isSelected = selectedAgents.has(agent);

                  return (
                    <div
                      key={agent}
                      className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => toggleAgent(agent)}
                    >
                      <Checkbox checked={isSelected} />
                      <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                      <div className="flex-1">
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Optimizasyon Modu
              </Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as SEOMode)}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="review" id="review" />
                  <Label htmlFor="review" className="flex-1 cursor-pointer">
                    <div className="font-medium">İnceleme Modu</div>
                    <div className="text-sm text-muted-foreground">
                      Değişiklikleri önce incele, sonra uygula
                    </div>
                  </Label>
                  <Badge variant="outline">Önerilen</Badge>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="auto" id="auto" />
                  <Label htmlFor="auto" className="flex-1 cursor-pointer">
                    <div className="font-medium">Otomatik Mod</div>
                    <div className="text-sm text-muted-foreground">
                      Değişiklikleri otomatik uygula
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={startOptimization}
              disabled={selectedAgents.size === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Optimizasyonu Başlat
            </Button>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">
                SEO Optimizasyonu Yapılıyor...
              </h3>
              <p className="text-sm text-muted-foreground">
                Agent'lar makaleyi analiz ediyor ve optimize ediyor
              </p>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="space-y-2">
              {currentStep.map((s) => (
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
          <div className="py-4">
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
              <p className="text-muted-foreground">
                Makale başarıyla optimize edildi
              </p>
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
