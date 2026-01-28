import React, { useRef, useEffect } from "react";
import { Terminal } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export interface LogMessage {
  message: string;
  type: "info" | "success" | "error" | "progress";
  timestamp: string;
}

interface SystemMonitorProps {
  logs: LogMessage[];
  executing: boolean;
  isAgentEnabled: boolean;
}

export function SystemMonitor({
  logs,
  executing,
  isAgentEnabled,
}: SystemMonitorProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card className="bg-[#09090b] border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden group">
      <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <Terminal className="h-4 w-4 text-primary" />
            <CardTitle className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
              {isAgentEnabled ? "GHOSTWRITER_SYSTEM_MONITOR" : "SYSTEM_OFFLINE"}
            </CardTitle>
          </div>
          {executing && (
            <div className="flex items-center gap-2 text-green-400 text-[10px] font-black bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              REAL-TIME STREAMING
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="font-mono text-[11px] h-72 overflow-y-auto p-6 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.05),transparent)]">
          {logs.length === 0 && !executing ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-3 grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-50 transition-all duration-700">
              <Terminal className="h-10 w-10" />
              <p className="font-black uppercase tracking-tighter text-xs">
                Terminal Standby Mode
              </p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className="flex gap-4 animate-in fade-in duration-300"
              >
                <span className="text-zinc-600 shrink-0 font-bold opacity-50">
                  [{new Date(log.timestamp).toLocaleTimeString("tr-TR")}]
                </span>
                <span
                  className={`${
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "success"
                        ? "text-primary font-bold"
                        : log.type === "progress"
                          ? "text-sky-400"
                          : "text-zinc-400"
                  } leading-relaxed`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
          {executing && (
            <div className="text-primary animate-pulse font-black px-4">_</div>
          )}
          <div ref={logsEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
