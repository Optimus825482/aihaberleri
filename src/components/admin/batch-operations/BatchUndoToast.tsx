"use client";

import React, { memo, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Undo2, X } from "lucide-react";

interface UndoAction {
  id: string;
  operation: string;
  items: string[];
  timestamp: number;
  onUndo: () => Promise<void>;
}

let undoStack: UndoAction[] = [];
const UNDO_TIMEOUT = 10000; // 10 seconds

export function addUndoAction(action: Omit<UndoAction, "id" | "timestamp">) {
  const undoAction: UndoAction = {
    ...action,
    id: `undo-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
  };

  undoStack.push(undoAction);

  // Show toast with undo button
  toast.custom(
    (t) => (
      <UndoToastContent
        toastId={t.id}
        action={undoAction}
        onUndo={async () => {
          try {
            await undoAction.onUndo();
            toast.success("İşlem geri alındı", { id: t.id });
            undoStack = undoStack.filter((a) => a.id !== undoAction.id);
          } catch (error) {
            toast.error(
              "Geri alma başarısız: " +
                (error instanceof Error ? error.message : "Bilinmeyen hata"),
              {
                id: t.id,
              },
            );
          }
        }}
        onDismiss={() => toast.dismiss(t.id)}
      />
    ),
    {
      duration: UNDO_TIMEOUT,
      position: "bottom-right",
    },
  );

  // Auto-remove from stack after timeout
  setTimeout(() => {
    undoStack = undoStack.filter((a) => a.id !== undoAction.id);
  }, UNDO_TIMEOUT);
}

interface UndoToastContentProps {
  toastId: string;
  action: UndoAction;
  onUndo: () => Promise<void>;
  onDismiss: () => void;
}

const UndoToastContent = memo(function UndoToastContent({
  toastId,
  action,
  onUndo,
  onDismiss,
}: UndoToastContentProps) {
  const [timeLeft, setTimeLeft] = useState(UNDO_TIMEOUT / 1000);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - action.timestamp;
      const remaining = Math.max(0, Math.ceil((UNDO_TIMEOUT - elapsed) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [action.timestamp]);

  const handleUndo = async () => {
    setIsUndoing(true);
    await onUndo();
    setIsUndoing(false);
  };

  return (
    <div className="bg-white/90 backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl p-4 max-w-md animate-slide-in-right">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Undo2 className="w-5 h-5 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {action.operation} işlemi tamamlandı
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {action.items.length} öğe işlendi
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1 mb-3 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / (UNDO_TIMEOUT / 1000)) * 100}%` }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{timeLeft}s kaldı</span>
            <button
              onClick={handleUndo}
              disabled={isUndoing}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {isUndoing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Geri alınıyor...</span>
                </>
              ) : (
                <>
                  <Undo2 className="w-3 h-3" />
                  <span>Geri Al</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const BatchUndoToast = memo(function BatchUndoToast() {
  // This is a utility component, no UI needed
  return null;
});
