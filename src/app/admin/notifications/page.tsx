"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/AdminLayout";

export default function NotificationsPage() {
  const [subscribers, setSubscribers] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch push subscribers count
    fetch("/api/push/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubscribers(data.count);
        }
      })
      .catch(console.error);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage("");

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✅ ${data.sent} aboneye bildirim gönderildi!`);
        setTitle("");
        setBody("");
        setUrl("");
      } else {
        setMessage(`❌ ${data.error || "Bir hata oluştu"}`);
      }
    } catch (error) {
      setMessage("❌ Bildirim gönderilirken bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Push Bildirimleri</h1>
          <p className="text-muted-foreground">
            Abonelere push bildirimi gönderin
          </p>
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
            <div className="text-sm text-muted-foreground">Tıklama Oranı</div>
          </div>
        </div>

        {/* Send Notification Form */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Push Bildirimi Gönder</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tüm push bildirim abonelerine anında bildirim gönderin
          </p>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Başlık <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Yeni Haber Yayınlandı!"
                required
                maxLength={50}
                className="w-full px-4 py-2 border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {title.length}/50 karakter
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mesaj <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Örn: GPT-5 duyuruldu! Detaylar için tıklayın."
                required
                maxLength={120}
                rows={3}
                className="w-full px-4 py-2 border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {body.length}/120 karakter
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                URL (İsteğe Bağlı)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://aihaberleri.org/news/..."
                className="w-full px-4 py-2 border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bildirime tıklandığında açılacak sayfa
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
                disabled={sending || !title || !body}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {sending
                  ? "Gönderiliyor..."
                  : `🔔 ${subscribers} Aboneye Gönder`}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Önizleme</h2>
          <div className="max-w-sm mx-auto">
            <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4">
              <div className="flex items-start gap-3">
                <img
                  src="/logos/brand/logo-icon.png"
                  alt="Logo"
                  className="w-10 h-10 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">
                    {title || "Başlık buraya gelecek"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {body || "Mesaj içeriği buraya gelecek"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    AI Haberleri • Şimdi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-bold mb-2">💡 İpuçları</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Başlık kısa ve dikkat çekici olmalı (max 50 karakter)</li>
            <li>• Mesaj net ve anlaşılır olmalı (max 120 karakter)</li>
            <li>• Çok sık bildirim göndermekten kaçının (günde max 2-3)</li>
            <li>• Önemli haberler için bildirim gönderin</li>
            <li>• URL ekleyerek kullanıcıları doğru sayfaya yönlendirin</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
