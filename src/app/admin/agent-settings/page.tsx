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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  Clock,
  FileText,
  Layers,
  Play,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AgentSettings {
  enabled: boolean;
  intervalHours: number;
  articlesPerRun: number;
  categories: string[];
  lastRun: string | null;
  nextRun: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AgentSettingsPage() {
  const [settings, setSettings] = useState<AgentSettings>({
    enabled: true,
    intervalHours: 6,
    articlesPerRun: 3,
    categories: [],
    lastRun: null,
    nextRun: null,
  });
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/agent/settings");
      const data = await response.json();

      if (data.success) {
        setSettings(data.data.settings);
        setAvailableCategories(data.data.availableCategories);
      } else {
        toast({
          title: "Hata",
          description: data.error || "Ayarlar yüklenemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayarlar yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/agent/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: settings.enabled,
          intervalHours: settings.intervalHours,
          articlesPerRun: settings.articlesPerRun,
          categories: settings.categories,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Ayarlar kaydedildi",
        });
        fetchSettings(); // Refresh to get updated nextRun
      } else {
        toast({
          title: "Hata",
          description: data.error || "Ayarlar kaydedilemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const triggerAgent = async () => {
    if (!settings.enabled) {
      toast({
        title: "Uyarı",
        description: "Agent devre dışı. Lütfen önce aktif edin.",
        variant: "destructive",
      });
      return;
    }

    setTriggering(true);
    try {
      const response = await fetch("/api/agent/trigger", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Agent manuel olarak tetiklendi",
        });
        fetchSettings(); // Refresh to get updated times
      } else {
        toast({
          title: "Hata",
          description: data.error || "Agent tetiklenemedi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Agent tetiklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setTriggering(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const selectAllCategories = () => {
    setSettings((prev) => ({
      ...prev,
      categories: availableCategories.map((cat) => cat.id),
    }));
  };

  const deselectAllCategories = () => {
    setSettings((prev) => ({
      ...prev,
      categories: [],
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Agent Ayarları
            </h1>
            <p className="text-muted-foreground mt-2">
              Otonom haber toplama agent'ını yapılandırın
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={triggerAgent}
              disabled={!settings.enabled || triggering}
              variant="outline"
            >
              <Play className="mr-2 h-4 w-4" />
              {triggering ? "Tetikleniyor..." : "Manuel Tetikle"}
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card
          className={`border-2 ${settings.enabled ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.enabled ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Agent Aktif
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Agent Devre Dışı
                </>
              )}
            </CardTitle>
            <CardDescription>
              {settings.enabled
                ? "Agent otomatik olarak haber topluyor"
                : "Agent şu anda çalışmıyor"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-card rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">
                  Son Çalışma
                </div>
                <div className="font-medium">
                  {settings.lastRun
                    ? new Date(settings.lastRun).toLocaleString("tr-TR")
                    : "Henüz çalışmadı"}
                </div>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">
                  Sonraki Çalışma
                </div>
                <div className="font-medium">
                  {settings.nextRun && settings.enabled
                    ? new Date(settings.nextRun).toLocaleString("tr-TR")
                    : "Planlanmadı"}
                </div>
              </div>
              <div className="p-4 bg-card rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">
                  Kalan Süre
                </div>
                <div className="font-medium">
                  {settings.nextRun && settings.enabled
                    ? `${Math.max(0, Math.round((new Date(settings.nextRun).getTime() - Date.now()) / (1000 * 60 * 60)))} saat`
                    : "-"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Temel Ayarlar
              </CardTitle>
              <CardDescription>Agent'ın çalışma parametreleri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="text-base">
                    Agent Durumu
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Agent'ı aktif veya pasif yapın
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              {/* Interval Hours */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="interval" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Çalışma Sıklığı
                  </Label>
                  <Badge variant="secondary">
                    {settings.intervalHours} saat
                  </Badge>
                </div>
                <Slider
                  id="interval"
                  min={1}
                  max={24}
                  step={1}
                  value={[settings.intervalHours]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, intervalHours: value }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Agent her {settings.intervalHours} saatte bir çalışacak
                </p>
              </div>

              {/* Articles Per Run */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="articles" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Haber Sayısı
                  </Label>
                  <Badge variant="secondary">
                    {settings.articlesPerRun} haber
                  </Badge>
                </div>
                <Slider
                  id="articles"
                  min={1}
                  max={10}
                  step={1}
                  value={[settings.articlesPerRun]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, articlesPerRun: value }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Her çalıştırmada {settings.articlesPerRun} haber toplanacak
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Kategori Seçimi
              </CardTitle>
              <CardDescription>
                Hangi kategorilerden haber toplanacak?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCategories}
                  className="flex-1"
                >
                  Tümünü Seç
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllCategories}
                  className="flex-1"
                >
                  Tümünü Kaldır
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {availableCategories.length > 0 ? (
                  availableCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={category.id}
                        checked={settings.categories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label
                        htmlFor={category.id}
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {category.name}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {category.slug}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Kategori bulunamadı
                  </p>
                )}
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {settings.categories.length === 0 ? (
                    <span className="text-orange-500 font-medium">
                      ⚠️ Hiçbir kategori seçilmedi. Tüm kategorilerden haber
                      toplanacak.
                    </span>
                  ) : (
                    <span>{settings.categories.length} kategori seçildi</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-5 w-5" />
              Nasıl Çalışır?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              • Agent belirlediğiniz sıklıkta otomatik olarak çalışır ve haber
              toplar
            </p>
            <p>• Her çalıştırmada belirlediğiniz sayıda haber oluşturulur</p>
            <p>
              • Seçili kategorilerden haber toplanır (hiçbiri seçili değilse
              tümünden)
            </p>
            <p>
              • Manuel tetikleme ile istediğiniz zaman agent'ı
              çalıştırabilirsiniz
            </p>
            <p>
              • Ayarları değiştirdikten sonra "Kaydet" butonuna tıklamayı
              unutmayın
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
