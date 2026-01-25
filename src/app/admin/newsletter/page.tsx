"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/newsletter/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubscribers(data.subscribers);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = {
    total: subscribers.length,
    active: subscribers.filter((s: any) => s.status === "ACTIVE").length,
    unsubscribed: subscribers.filter((s: any) => s.status === "UNSUBSCRIBED")
      .length,
    bounced: subscribers.filter((s: any) => s.status === "BOUNCED").length,
  };

  const handleExport = () => {
    const csv = [
      ["E-posta", "Durum", "Sıklık", "Kayıt Tarihi", "Son Gönderim", "Kaynak"],
      ...subscribers.map((s: any) => [
        s.email,
        s.status,
        s.frequency,
        new Date(s.subscribedAt).toISOString(),
        s.lastSentAt ? new Date(s.lastSentAt).toISOString() : "",
        s.source || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Bülten Aboneleri</h1>
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bülten Aboneleri</h1>
            <p className="text-muted-foreground">
              E-posta bülteni abonelerini yönetin
            </p>
          </div>
          <Link
            href="/admin/newsletter/send"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            📧 E-posta Gönder
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Toplam Abone</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
            <div className="text-sm text-muted-foreground">Aktif</div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold text-orange-600">
              {stats.unsubscribed}
            </div>
            <div className="text-sm text-muted-foreground">
              Abonelikten Çıkmış
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="text-2xl font-bold text-red-600">
              {stats.bounced}
            </div>
            <div className="text-sm text-muted-foreground">Bounce</div>
          </div>
        </div>

        {/* Subscribers Table */}
        <div className="bg-card border rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">E-posta</th>
                  <th className="text-left p-4 font-semibold">Durum</th>
                  <th className="text-left p-4 font-semibold">Sıklık</th>
                  <th className="text-left p-4 font-semibold">Kayıt Tarihi</th>
                  <th className="text-left p-4 font-semibold">Son Gönderim</th>
                  <th className="text-left p-4 font-semibold">Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center p-8 text-muted-foreground"
                    >
                      Henüz abone yok
                    </td>
                  </tr>
                ) : (
                  subscribers.map((subscriber: any) => (
                    <tr key={subscriber.id} className="border-b last:border-0">
                      <td className="p-4 font-mono text-sm">
                        {subscriber.email}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            subscriber.status === "ACTIVE"
                              ? "default"
                              : subscriber.status === "UNSUBSCRIBED"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {subscriber.status === "ACTIVE"
                            ? "Aktif"
                            : subscriber.status === "UNSUBSCRIBED"
                              ? "Çıkmış"
                              : subscriber.status === "BOUNCED"
                                ? "Bounce"
                                : "Şikayet"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">
                        {subscriber.frequency === "REALTIME"
                          ? "Anında"
                          : subscriber.frequency === "DAILY"
                            ? "Günlük"
                            : subscriber.frequency === "WEEKLY"
                              ? "Haftalık"
                              : "Aylık"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(subscriber.subscribedAt).toLocaleDateString(
                          "tr-TR",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {subscriber.lastSentAt
                          ? new Date(subscriber.lastSentAt).toLocaleDateString(
                              "tr-TR",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "-"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {subscriber.source || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Button */}
        {subscribers.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              📥 CSV Olarak İndir
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
