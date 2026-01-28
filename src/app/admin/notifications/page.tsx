"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { Send, Bell, Smartphone } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    url: "https://aihaberleri.org",
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Gönderim başarısız");

      toast.success("Bildirim tüm abonelere başarıyla gönderildi! 🚀");
      setFormData({ ...formData, message: "", title: "" });
    } catch (error) {
      toast.error("Hata oluştu: " + (error as Error).message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-8 h-8 text-primary" />
            Push Bildirim Merkezi
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Yeni Bildirim Oluştur</CardTitle>
              <CardDescription>
                Tüm kayıtlı cihazlara anlık bildirim gönderin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Bildirim Başlığı
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Örn: 🚨 Son Dakika: GPT-5 Duyuruldu!"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Mesaj İçeriği
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Kullanıcıların göreceği kısa özet..."
                    required
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Yönlendirilecek URL
                  </label>
                  <Input
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    placeholder="https://aihaberleri.org/news/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Bildirime tıklayan kullanıcı bu adrese gidecek.
                  </p>
                </div>

                <Button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    "Gönderiliyor..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Tüm Cihazlara Gönder
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="bg-muted/50 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Önizleme
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-full min-h-[300px]">
              <div className="w-[320px] bg-background border rounded-2xl shadow-2xl overflow-hidden">
                <div className="h-6 bg-muted border-b flex items-center justify-center text-[10px] text-muted-foreground">
                  Phone Screen
                </div>
                <div className="p-4 bg-cover bg-center h-[500px] relative">
                  {/* Mock Notification */}
                  <div className="absolute top-4 left-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-xl p-3 shadow-lg border animate-in slide-in-from-top duration-700">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                        <img
                          src="/logos/brand/logo-icon.png"
                          alt="Icon"
                          className="w-8 h-8 object-contain"
                          onError={(e) =>
                            (e.currentTarget.src =
                              "https://placehold.co/40x40?text=AI")
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-sm truncate pr-2">
                            {formData.title || "Bildirim Başlığı"}
                          </h4>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            Şimdi
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {formData.message ||
                            "Mesaj içeriği burada görünecek..."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
