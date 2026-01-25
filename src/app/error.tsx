"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white px-4">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-red-600">Hata!</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          Bir şeyler yanlış gitti
        </h2>
        <p className="mb-8 text-lg text-gray-600">
          Üzgünüz, beklenmeyen bir hata oluştu.
        </p>
        <button
          onClick={reset}
          className="inline-block rounded-lg bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-700"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
