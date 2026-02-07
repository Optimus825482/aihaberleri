"use client";

import { useState } from "react";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bir hata oluştu");
      }

      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Bir hata oluştu",
      );
    }
  };

  if (status === "success") {
    return (
      <div className="bg-ai-surface-card border border-green-700/50 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-green-900/30 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[32px] text-green-500">check_circle</span>
        </div>
        <h3 className="text-xl font-semibold text-green-400 mb-2">
          Mesajınız Gönderildi!
        </h3>
        <p className="text-green-300/80">
          En kısa sürede size geri dönüş yapacağız.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-ai-primary hover:text-ai-primary-hover transition-colors"
        >
          Yeni mesaj gönder
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status === "error" && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400">
          {errorMessage}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2 text-white">
          Ad Soyad *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 border border-ai-surface-border rounded-xl bg-ai-surface-dark text-white placeholder:text-ai-text-muted focus:ring-2 focus:ring-ai-primary focus:border-transparent transition"
          placeholder="Adınız Soyadınız"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
          E-posta *
        </label>
        <input
          type="email"
          id="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 border border-ai-surface-border rounded-xl bg-ai-surface-dark text-white placeholder:text-ai-text-muted focus:ring-2 focus:ring-ai-primary focus:border-transparent transition"
          placeholder="ornek@email.com"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium mb-2 text-white">
          Konu *
        </label>
        <select
          id="subject"
          required
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
          className="w-full px-4 py-3 border border-ai-surface-border rounded-xl bg-ai-surface-dark text-white focus:ring-2 focus:ring-ai-primary focus:border-transparent transition"
        >
          <option value="">Konu seçin...</option>
          <option value="Genel Soru">Genel Soru</option>
          <option value="Haber Önerisi">Haber Önerisi</option>
          <option value="Reklam">Reklam / İş Birliği</option>
          <option value="Teknik Sorun">Teknik Sorun</option>
          <option value="Şikayet">Şikayet</option>
          <option value="Diğer">Diğer</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2 text-white">
          Mesajınız *
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          className="w-full px-4 py-3 border border-ai-surface-border rounded-xl bg-ai-surface-dark text-white placeholder:text-ai-text-muted focus:ring-2 focus:ring-ai-primary focus:border-transparent transition resize-none"
          placeholder="Mesajınızı buraya yazın..."
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-ai-primary hover:bg-ai-primary-hover text-white font-semibold py-3 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === "loading" ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Gönderiliyor...
          </>
        ) : (
          <>
              <span className="material-symbols-outlined text-[20px]">send</span>
            Mesaj Gönder
          </>
        )}
      </button>
    </form>
  );
}
