"use client";

import React, { memo, useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

interface BatchProgressModalProps {
  isOpen: boolean;
  total: number;
  completed: number;
  failed: number;
  operation: string;
  onClose: () => void;
}

export const BatchProgressModal = memo(function BatchProgressModal({
  isOpen,
  total,
  completed,
  failed,
  operation,
  onClose,
}: BatchProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const isComplete = completed + failed >= total;
  const successCount = completed - failed;

  useEffect(() => {
    if (total > 0) {
      setProgress(((completed + failed) / total) * 100);
    }
  }, [completed, failed, total]);

  // Auto-close after 3 seconds when complete
  useEffect(() => {
    if (isComplete && total > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, total, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {!isComplete ? (
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          ) : failed > 0 ? (
            <AlertCircle className="w-6 h-6 text-yellow-500" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-500" />
          )}
          <h3 className="text-xl font-semibold text-gray-800">
            {isComplete ? "İşlem Tamamlandı" : `${operation} İşlemi`}
          </h3>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>İlerleme</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{total}</div>
            <div className="text-xs text-gray-500 mt-1">Toplam</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {successCount}
            </div>
            <div className="text-xs text-green-600 mt-1">Başarılı</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{failed}</div>
            <div className="text-xs text-red-600 mt-1">Başarısız</div>
          </div>
        </div>

        {/* Status message */}
        <div className="text-center text-sm text-gray-600 mb-6">
          {!isComplete ? (
            <p>
              {completed + failed} / {total} öğe işlendi...
            </p>
          ) : failed > 0 ? (
            <p className="text-yellow-600">
              {successCount} öğe başarılı, {failed} öğe başarısız oldu
            </p>
          ) : (
            <p className="text-green-600">Tüm öğeler başarıyla işlendi!</p>
          )}
        </div>

        {/* Close button (only when complete) */}
        {isComplete && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            Kapat
          </button>
        )}
      </div>
    </div>
  );
});
