/**
 * Real-Time Agent Progress Bar Component
 *
 * Displays live progress updates during agent execution
 * via Socket.io connection.
 */

"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAdminSocket } from "@/hooks/useSocket";

interface ProgressData {
  step: string;
  message: string;
  progress: number;
  timestamp?: string;
}

interface AgentProgressBarProps {
  className?: string;
}

export function AgentProgressBar({ className }: AgentProgressBarProps) {
  const { socket, isConnected } = useAdminSocket();
  const [agentStatus, setAgentStatus] = useState<
    "idle" | "running" | "completed" | "failed"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [articlesCreated, setArticlesCreated] = useState(0);

  useEffect(() => {
    if (!socket) return;

    // Agent events
    socket.on(
      "agent:started",
      (data: { timestamp: string; logId: string }) => {
        console.log("[AgentProgressBar] Agent started:", data);
        setAgentStatus("running");
        setProgress(0);
        setCurrentStep("Agent başlatıldı...");
        setArticlesCreated(0);
      },
    );

    socket.on("agent:progress", (data: ProgressData) => {
      console.log("[AgentProgressBar] Progress update:", data);
      setProgress(data.progress);
      setCurrentStep(data.message);
    });

    socket.on(
      "agent:completed",
      (data: { articlesCreated: number; duration: number }) => {
        console.log("[AgentProgressBar] Agent completed:", data);
        setAgentStatus("completed");
        setProgress(100);
        setCurrentStep("Tamamlandı!");
        setArticlesCreated(data.articlesCreated);
      },
    );

    socket.on("agent:failed", (data: { error: string }) => {
      console.log("[AgentProgressBar] Agent failed:", data);
      setAgentStatus("failed");
      setCurrentStep(`Hata: ${data.error}`);
    });

    socket.on(
      "article:published",
      (data: { id: string; title: string }) => {
        console.log("[AgentProgressBar] Article published:", data);
        setArticlesCreated((prev) => prev + 1);
      },
    );

    // Cleanup
    return () => {
      socket.off("agent:started");
      socket.off("agent:progress");
      socket.off("agent:completed");
      socket.off("agent:failed");
      socket.off("article:published");
    };
  }, [socket]);

  // Don't render if idle
  if (agentStatus === "idle") {
    return null;
  }

  return (
    <div className={`rounded-lg border bg-card p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Agent Durumu</h3>
          {agentStatus === "running" && (
            <Badge variant="default" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Çalışıyor
            </Badge>
          )}
          {agentStatus === "completed" && (
            <Badge
              variant="default"
              className="flex items-center gap-1 bg-green-500"
            >
              <CheckCircle2 className="h-3 w-3" />
              Tamamlandı
            </Badge>
          )}
          {agentStatus === "failed" && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Hata
            </Badge>
          )}
          {!isConnected && (
            <Badge variant="outline" className="text-xs">
              Bağlantı yok
            </Badge>
          )}
        </div>
        {articlesCreated > 0 && (
          <span className="text-sm text-muted-foreground">
            {articlesCreated} makale oluşturuldu
          </span>
        )}
      </div>

      <Progress value={progress} className="h-2 mb-2" />

      <p className="text-xs text-muted-foreground">{currentStep}</p>
    </div>
  );
}
