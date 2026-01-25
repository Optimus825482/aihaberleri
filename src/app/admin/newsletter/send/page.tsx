"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";

export default function SendNewsletterPage() {
  const [subscribers, setSubscribers] = useState<number>(0);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch active subscribers count
    fetch("/api/newsletter/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const active = data.subscribers.filter(
            (s: any) => s.status === "ACTIVE",
          ).length;
          setSubscribers(active);
        }
      })
      .catch(console.error);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage("");

    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, content }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✅ ${data.sent} aboneye e-posta gönderildi!`);
        setSubject("");
        setContent("");
      } else {
        setMessage(`❌ ${data.error || "Bir hata oluştu"}`);
      }
    } catch (error) {
      setMessage("❌ E-posta gönderilirken bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">E-posta Bülteni Gönder</h1>
            <p className="text-muted-foreground">
              Bülten abonelerine e-posta gönderin
            </p>
          </div>
          <Link
            href="/admin/newsletter"
            className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
          >
            ← Abone Listesi
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold">{subscribers}</div>
            <div className="text-sm text-muted-foreground">Aktif Abone</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">
              Bugün Gönderilen
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold">0%</div>
            <div className="text-sm text-muted-foreground">Açılma Oranı</div>
          </div>
        </div>

        {/* Send Email Form */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">E-posta Gönder</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tüm aktif bülten abonelerine e-posta gönderin
          </p>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Konu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Örn: Bu Haftanın En Önemli AI Haberleri"
                required
                maxLength={100}
                className="w-full px-4 py-2 border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {subject.length}/100 karakter
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                İçerik <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="E-posta içeriğinizi buraya yazın..."
                required
                rows={12}
                className="w-full px-4 py-2 border rounded-md bg-background font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                HTML desteklenir. Markdown kullanabilirsiniz.
              </p>
            </div>

            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.startsWith("✅")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={sending || !subject || !content}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {sending
                  ? "Gönderiliyor..."
                  : `📧 ${subscribers} Aboneye Gönder`}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Önizleme</h2>
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border rounded-lg p-6">
            <div className="border-b pb-4 mb-4">
              <div className="text-xs text-muted-foreground mb-2">
                Kimden: AI Haberleri &lt;info@aihaberleri.org&gt;
              </div>
              <div className="text-xl font-bold">
                {subject || "Konu buraya gelecek"}
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              {content ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: content.replace(/\n/g, "<br>"),
                  }}
                />
              ) : (
                <p className="text-muted-foreground">
                  İçerik buraya gelecek...
                </p>
              )}
            </div>
            <div className="border-t pt-4 mt-6 text-xs text-muted-foreground">
              <p>
                Bu e-postayı almak istemiyorsanız,{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  abonelikten çıkabilirsiniz
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-bold mb-2">💡 İpuçları</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Konu satırı kısa ve ilgi çekici olmalı</li>
            <li>• İçeriği kısa paragraflar halinde yazın</li>
            <li>• Önemli bilgileri kalın yazın</li>
            <li>• Her e-postada bir CTA (Call to Action) bulunmalı</li>
            <li>• Çok sık e-posta göndermekten kaçının (haftada max 2-3)</li>
            <li>• Mobil uyumlu içerik oluşturun</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
