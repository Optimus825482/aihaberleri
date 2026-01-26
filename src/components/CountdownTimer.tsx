"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetTimestamp: number | string | undefined;
  onComplete?: () => void;
  className?: string;
}

export function CountdownTimer({
  targetTimestamp,
  onComplete,
  className = "",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!targetTimestamp) {
      setTimeLeft("");
      return;
    }

    const targetDate = new Date(targetTimestamp).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft("00:00:00");
        if (onComplete) onComplete();
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const formatted = [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
      ].join(":");

      setTimeLeft(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp, onComplete]);

  if (!targetTimestamp || !timeLeft) return null;

  return (
    <div className={`flex items-center gap-2 font-mono ${className}`}>
      <Clock className="w-4 h-4 text-primary animate-pulse" />
      <span className="text-xl font-bold tracking-wider">{timeLeft}</span>
    </div>
  );
}
