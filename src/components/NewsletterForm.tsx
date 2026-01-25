"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("✅ Bülten aboneliğiniz başarıyla oluşturuldu!");
        setEmail("");
      } else {
        setMessage(`❌ ${data.error || "Bir hata oluştu"}`);
      }
    } catch (error) {
      setMessage("❌ Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-sm mb-2">Bültene Abone Ol</h4>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          required
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm border rounded-md bg-background disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Abone Ol"}
        </button>
      </form>
      {message && (
        <p className="text-xs mt-2 text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
