"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, RefreshCw } from "lucide-react";

interface Settings {
  heroCarouselCount: number;
  heroCarouselInterval: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    heroCarouselCount: 5,
    heroCarouselInterval: 6000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert(
          "Ayarlar kaydedildi! Değişikliklerin görünmesi için sayfayı yenileyin.",
        );
      } else {
        alert("Ayarlar kaydedilemedi");
      }
    } catch (error) {
      alert("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Site Ayarları</h1>
          <p className="text-muted-foreground mt-2">
            Sitenin genel ayarlarını buradan yönetin
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hero Carousel Ayarları</CardTitle>
            <CardDescription>
              Anasayfa manşet carousel'inin ayarlarını düzenleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="heroCarouselCount">
                Gösterilecek Haber Sayısı
              </Label>
              <Input
                id="heroCarouselCount"
                type="number"
                min="1"
                max="10"
                value={settings.heroCarouselCount}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    heroCarouselCount: parseInt(e.target.value) || 5,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Carousel'de kaç haber gösterileceğini belirleyin (1-10 arası)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroCarouselInterval">
                Geçiş Süresi (milisaniye)
              </Label>
              <Input
                id="heroCarouselInterval"
                type="number"
                min="2000"
                max="15000"
                step="1000"
                value={settings.heroCarouselInterval}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    heroCarouselInterval: parseInt(e.target.value) || 6000,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Her slayt arasındaki bekleme süresi (2-15 saniye arası)
                <br />
                <span className="font-medium">
                  Şu anki: {settings.heroCarouselInterval / 1000} saniye
                </span>
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Ayarları Kaydet
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={fetchSettings}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sıfırla
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Önizleme</CardTitle>
            <CardDescription>
              Mevcut ayarlarla carousel nasıl görünecek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Haber Sayısı</p>
                  <p className="text-2xl font-bold">
                    {settings.heroCarouselCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Geçiş Süresi</p>
                  <p className="text-2xl font-bold">
                    {settings.heroCarouselInterval / 1000}s
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Toplam Süre</p>
                  <p className="text-2xl font-bold">
                    {(settings.heroCarouselCount *
                      settings.heroCarouselInterval) /
                      1000}
                    s
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Carousel tüm haberleri göstermek için yaklaşık{" "}
                <span className="font-medium">
                  {(settings.heroCarouselCount *
                    settings.heroCarouselInterval) /
                    1000}{" "}
                  saniye
                </span>{" "}
                sürecek
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
