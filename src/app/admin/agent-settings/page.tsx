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
  Wrench,
  ImageIcon,
  Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CountdownTimer } from "@/components/CountdownTimer";

interface AgentSettings {
  enabled: boolean;
  intervalHours: number;
  articlesPerRun: number;
  categories: string[];
  lastRun: string | null;
  nextRun: string | null;
  emailNotifications: boolean;
  adminEmail: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface WorkerStatus {
  workerOnline: boolean;
  lastHeartbeat: string | null;
  timeSinceHeartbeat?: number;
}

interface RecentLog {
  id: string;
  status: string;
  articlesCreated: number;
  duration: number;
  createdAt: string;
  errors?: string[];
}

export default function AgentSettingsPage() {
  const [settings, setSettings] = useState<AgentSettings>({
    enabled: true,
    intervalHours: 6,
    articlesPerRun: 3,
    categories: [],
    lastRun: null,
    nextRun: null,
    emailNotifications: true,
    adminEmail: "ikinciyenikitap54@gmail.com",
  });
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    [],
  );
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>({
    workerOnline: false,
    lastHeartbeat: null,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchWorkerStatus();
    fetchRecentLogs();

    // Poll worker status every 30 seconds
    const interval = setInterval(() => {
      fetchWorkerStatus();
    }, 30000);

    return () => clearInterval(interval);
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

  const fetchWorkerStatus = async () => {
    try {
      const response = await fetch("/api/agent/worker-status");
      const data = await response.json();
      setWorkerStatus(data);
    } catch (error) {
      console.error("Failed to fetch worker status:", error);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const response = await fetch("/api/agent/logs?limit=5");
      const data = await response.json();
      if (data.success) {
        setRecentLogs(data.data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch recent logs:", error);
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
          emailNotifications: settings.emailNotifications,
          adminEmail: settings.adminEmail,
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          executeNow: true, // Manuel tetikleme için hemen çalıştır
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Başarılı",
          description:
            "Agent tetiklendi, tarama ekranına yönlendiriliyorsunuz...",
        });

        // redirect to scan page with jobId parameter
        setTimeout(() => {
          window.location.href = `/admin/scan?autoStart=true&jobId=${data.data.jobId}`;
        }, 1500);
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
              </div>
              <Badge
                variant={workerStatus.workerOnline ? "default" : "destructive"}
                className="ml-2"
              >
                Worker: {workerStatus.workerOnline ? "🟢 Online" : "🔴 Offline"}
              </Badge>
            </CardTitle>
            <CardDescription>
              {settings.enabled
                ? "Agent otomatik olarak haber topluyor"
                : "Agent şu anda çalışmıyor"}
              {workerStatus.lastHeartbeat && (
                <span className="text-xs block mt-1">
                  Son heartbeat: {new Date(workerStatus.lastHeartbeat).toLocaleString("tr-TR")}
                </span>
              )}
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
                  {settings.nextRun && settings.enabled ? (
                    <CountdownTimer
                      targetTimestamp={settings.nextRun}
                      onComplete={() => fetchSettings()}
                    />
                  ) : (
                    "-"
                  )}
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
                    {settings.intervalHours < 1
                      ? `${Math.round(settings.intervalHours * 60)} dk`
                      : `${settings.intervalHours} saat`}
                  </Badge>
                </div>
                <select
                  id="interval"
                  aria-label="Çalışma sıklığı seçin"
                  value={settings.intervalHours}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, intervalHours: parseFloat(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background/50 backdrop-blur-sm text-foreground"
                >
                  <option value="0.25">15 Dakikada Bir</option>
                  <option value="0.5">30 Dakikada Bir</option>
                  <option value="1">Saatte Bir</option>
                  <option value="2">2 Saatte Bir</option>
                  <option value="3">3 Saatte Bir</option>
                  <option value="4">4 Saatte Bir</option>
                  <option value="6">6 Saatte Bir</option>
                  <option value="12">12 Saatte Bir</option>
                  <option value="24">Günde Bir</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Agent her {settings.intervalHours < 1
                    ? `${Math.round(settings.intervalHours * 60)} dakikada`
                    : `${settings.intervalHours} saatte`} bir çalışacak
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

              <hr className="my-4 border-muted" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">E-posta Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      İşlem sonrası rapor gönderilsin
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        emailNotifications: checked,
                      }))
                    }
                  />
                </div>

                {settings.emailNotifications && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Yönetici E-posta
                    </Label>
                    <input
                      className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      placeholder="email@example.com"
                      value={settings.adminEmail}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          adminEmail: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
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

        {/* Recent Logs Card */}
        {recentLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Son Çalıştırmalar
              </CardTitle>
              <CardDescription>
                Agent'ın son 5 çalıştırma geçmişi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          log.status === "SUCCESS"
                            ? "default"
                            : log.status === "PARTIAL"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
                      <div>
                        <div className="text-sm font-medium">
                          {log.articlesCreated} haber oluşturuldu
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {log.duration}s
                      </div>
                      {log.errors && log.errors.length > 0 && (
                        <div className="text-xs text-red-500">
                          {log.errors.length} hata
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Card */}
        <MaintenanceCard />

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

// Maintenance Card Component
function MaintenanceCard() {
  const [dbMigrating, setDbMigrating] = useState(false);
  const [imgMigrating, setImgMigrating] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    needsMigration: boolean;
    missingColumns: string[];
  } | null>(null);
  const [imgStatus, setImgStatus] = useState<{
    pendingCount: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkDbStatus();
    checkImageStatus();
  }, []);

  const checkDbStatus = async () => {
    try {
      const res = await fetch("/api/admin/db-migrate");
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch {
      // API might not exist yet
    }
  };

  const checkImageStatus = async () => {
    try {
      const res = await fetch("/api/admin/migrate-images");
      if (res.ok) {
        const data = await res.json();
        setImgStatus({ pendingCount: data.pendingMigration || 0 });
      }
    } catch {
      // API might not exist yet
    }
  };

  const runDbMigration = async () => {
    setDbMigrating(true);
    try {
      const res = await fetch("/api/admin/db-migrate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Başarılı",
          description: "Database kolonları eklendi",
        });
        checkDbStatus();
      } else {
        toast({
          title: "Hata",
          description: data.error || "Migration başarısız",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Hata",
        description: "Migration yapılamadı",
        variant: "destructive",
      });
    } finally {
      setDbMigrating(false);
    }
  };

  const runImageMigration = async () => {
    setImgMigrating(true);
    try {
      const res = await fetch("/api/admin/migrate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Başarılı",
          description: `${data.successCount} görsel R2'ye taşındı`,
        });
        checkImageStatus();
      } else {
        toast({
          title: "Hata",
          description: data.error || "Migration başarısız",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Hata",
        description: "Görsel migration yapılamadı",
        variant: "destructive",
      });
    } finally {
      setImgMigrating(false);
    }
  };

  return (
    <Card className="bg-orange-500/5 border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <Wrench className="h-5 w-5" />
          Bakım İşlemleri
        </CardTitle>
        <CardDescription>
          Database ve görsel düzeltme araçları
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database Migration */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Database Kolonları</div>
              <div className="text-xs text-muted-foreground">
                {dbStatus === null
                  ? "Kontrol ediliyor..."
                  : dbStatus.needsMigration
                    ? `${dbStatus.missingColumns.length} kolon eksik`
                    : "✓ Tüm kolonlar mevcut"}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runDbMigration}
            disabled={dbMigrating || Boolean(dbStatus && !dbStatus.needsMigration)}
          >
            {dbMigrating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "Düzelt"
            )}
          </Button>
        </div>

        {/* Image Migration */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Görsel Migration</div>
              <div className="text-xs text-muted-foreground">
                {imgStatus === null
                  ? "Kontrol ediliyor..."
                  : imgStatus.pendingCount > 0
                    ? `${imgStatus.pendingCount} görsel Pollinations'da`
                    : "✓ Tüm görseller R2'de"}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runImageMigration}
            disabled={imgMigrating || Boolean(imgStatus && imgStatus.pendingCount === 0)}
          >
            {imgMigrating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "10 Taşı"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
