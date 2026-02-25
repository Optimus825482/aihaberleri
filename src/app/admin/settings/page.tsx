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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Settings as SettingsIcon,
  Globe,
  Search,
  Mail,
  Bot,
  Save,
  Image as ImageIcon,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Share2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Setting {
  id: string;
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SocialMedia {
  id: string;
  platform: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsData {
  settings: {
    general: Setting[];
    seo: Setting[];
    email: Setting[];
    agent: Setting[];
    social_share: Setting[];
    other: Setting[];
  };
  socialMedia: SocialMedia[];
}

const socialPlatforms = [
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "twitter", label: "Twitter", icon: Twitter },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "youtube", label: "YouTube", icon: Youtube },
];

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillLimit, setBackfillLimit] = useState(20);
  const [backfillDryRun, setBackfillDryRun] = useState(true);
  const [backfillResult, setBackfillResult] = useState<{
    dryRun: boolean;
    requestedLimit: number;
    candidates: number;
    updated: number;
    failed: number;
    backupProviderUsed: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "general" | "seo" | "email" | "social" | "agent"
  >("general");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    // Optimistic local update for social_share toggles
    if (key.startsWith("social_share_")) {
      setData((prev) => {
        if (!prev) return prev;
        const arr = [...(prev.settings.social_share || [])];
        const idx = arr.findIndex((s) => s.key === key);
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], value };
        } else {
          arr.push({
            id: `local-${key}`,
            key,
            value,
            encrypted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        return {
          ...prev,
          settings: { ...prev.settings, social_share: arr },
        };
      });
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (response.ok) {
        fetchSettings();
      }
    } catch (error) {
      console.error("Failed to save setting:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveSocialMedia = async (
    platform: string,
    url: string,
    enabled: boolean,
  ) => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url, enabled }),
      });

      if (response.ok) {
        fetchSettings();
      }
    } catch (error) {
      console.error("Failed to save social media:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateLocalSetting = (key: string, value: string) => {
    setData((prev) => {
      if (!prev) return prev;

      const existingIndex = prev.settings.general.findIndex((s) => s.key === key);
      const updatedGeneral = [...prev.settings.general];

      if (existingIndex >= 0) {
        updatedGeneral[existingIndex] = {
          ...updatedGeneral[existingIndex],
          value,
        };
      } else {
        updatedGeneral.push({
          id: `local-${key}`,
          key,
          value,
          encrypted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        settings: {
          ...prev.settings,
          general: updatedGeneral,
        },
      };
    });
  };

  const runImageBackfill = async () => {
    try {
      setBackfillLoading(true);
      setBackfillResult(null);

      const response = await fetch("/api/admin/images/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: backfillLimit,
          dryRun: backfillDryRun,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Backfill işlemi başarısız oldu");
      }

      setBackfillResult(result.data);
    } catch (error) {
      console.error("Image backfill trigger error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Backfill çalıştırılırken hata oluştu",
      );
    } finally {
      setBackfillLoading(false);
    }
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
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Site <span className="text-primary italic">Ayarları</span>
          </h1>
          <p className="text-muted-foreground">
            Genel ayarlar, SEO ve sosyal medya yönetimi
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: "general", label: "Genel", icon: Globe },
            { key: "agent", label: "Haber Botu", icon: Bot },
            { key: "seo", label: "SEO", icon: Search },
            { key: "email", label: "E-posta", icon: Mail },
            { key: "social", label: "Sosyal Medya", icon: Facebook },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className="font-bold whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* General Settings */}
        {activeTab === "general" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Genel Ayarlar
              </CardTitle>
              <CardDescription>
                Site başlığı, açıklama ve temel ayarlar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "site_name", label: "Site Adı", type: "text", placeholder: "AI Haberleri", defaultValue: "AI Haberleri" },
                {
                  key: "site_description",
                  label: "Site Açıklaması",
                  type: "textarea",
                  placeholder: "Yapay Zeka ve Teknoloji Haberleri",
                  defaultValue: "Yapay Zeka ve Teknoloji Haberleri - En güncel AI, robotik, otomasyon ve makine öğrenimi haberleri"
                },
                { key: "site_url", label: "Site URL", type: "url", placeholder: "https://aihaberleri.org", defaultValue: "https://aihaberleri.org" },
                { key: "site_language", label: "Dil", type: "text", placeholder: "tr", defaultValue: "tr" },
              ].map((field) => {
                const setting = data?.settings.general.find(
                  (s) => s.key === field.key,
                );
                return (
                  <div key={field.key}>
                    <label htmlFor={`general-${field.key}`} className="text-sm font-bold mb-2 block">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        id={`general-${field.key}`}
                        defaultValue={setting?.value || field.defaultValue || ""}
                        placeholder={field.placeholder}
                        onBlur={(e) => saveSetting(field.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        rows={3}
                      />
                    ) : (
                      <input
                        id={`general-${field.key}`}
                        type={field.type}
                        defaultValue={setting?.value || field.defaultValue || ""}
                        placeholder={field.placeholder}
                        onBlur={(e) => saveSetting(field.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      />
                    )}
                  </div>
                );
              })}

              <div className="pt-2 border-t border-ai-surface-border space-y-3">
                <h3 className="text-sm font-bold">Haber İçgörü Blokları</h3>

                {[
                  {
                    key: "site_insight_summary",
                    label: "3 Maddede Özet",
                    description: "Haber detay sayfasında özet kartını göster",
                    defaultValue: "true",
                  },
                  {
                    key: "site_insight_importance",
                    label: "Bu Haber Neden Önemli?",
                    description: "Haber detay sayfasında önem kartını göster",
                    defaultValue: "true",
                  },
                  {
                    key: "site_insight_timeline",
                    label: "Aynı Konuda Zaman Çizgisi",
                    description: "Haber detay sayfasında zaman çizgisi bloğunu göster",
                    defaultValue: "true",
                  },
                ].map((item) => {
                  const setting = data?.settings.general.find((s) => s.key === item.key);
                  const isChecked = (setting?.value ?? item.defaultValue) === "true";

                  return (
                    <label
                      key={item.key}
                      className="flex items-start justify-between gap-4 rounded-lg border border-ai-surface-border p-3 cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const value = e.target.checked ? "true" : "false";
                          updateLocalSetting(item.key, value);
                          saveSetting(item.key, value);
                        }}
                        className="mt-1 h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-ai-surface-border space-y-3">
                <h3 className="text-sm font-bold">Yeni Deneyim Blokları</h3>

                {[
                  {
                    key: "site_feature_glossary",
                    label: "AI Terimler Mini Sözlük",
                    description: "Haber detayda tooltip sözlük bloğunu göster",
                    defaultValue: "true",
                  },
                  {
                    key: "site_feature_mobile_action_bar",
                    label: "Mobil Alt Aksiyon Barı",
                    description: "Mobilde paylaş/kaydet/dinle barını göster",
                    defaultValue: "true",
                  },
                  {
                    key: "site_feature_verification_panel",
                    label: "Doğrulama Paneli",
                    description: "Haber sonunda küçük doğrulama panelini göster",
                    defaultValue: "true",
                  },
                  {
                    key: "site_feature_daily_briefing",
                    label: "Günlük Brifing Modu",
                    description: "Ana sayfada 5 dakikalık özet ve opsiyonel sesli blok",
                    defaultValue: "true",
                  },
                  {
                    key: "site_feature_model_cards",
                    label: "Model/Şirket Kartları",
                    description: "Ana sayfada OpenAI/Google/Anthropic kartlarını göster",
                    defaultValue: "true",
                  },
                  {
                    key: "site_feature_heat_map",
                    label: "Gündem Isı Haritası",
                    description: "Ana sayfada trendScore tabanlı yükselen konuları göster",
                    defaultValue: "true",
                  },
                ].map((item) => {
                  const setting = data?.settings.general.find((s) => s.key === item.key);
                  const isChecked = (setting?.value ?? item.defaultValue) === "true";

                  return (
                    <label
                      key={item.key}
                      className="flex items-start justify-between gap-4 rounded-lg border border-ai-surface-border p-3 cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const value = e.target.checked ? "true" : "false";
                          updateLocalSetting(item.key, value);
                          saveSetting(item.key, value);
                        }}
                        className="mt-1 h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SEO Settings */}
        {activeTab === "seo" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Search className="h-5 w-5" />
                SEO Ayarları
              </CardTitle>
              <CardDescription>
                Arama motoru optimizasyonu ayarları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "seo_title", label: "Meta Başlık", type: "text", placeholder: "AI Haberleri - Yapay Zeka ve Teknoloji Haberleri", defaultValue: "AI Haberleri - Yapay Zeka ve Teknoloji Haberleri" },
                {
                  key: "seo_description",
                  label: "Meta Açıklama",
                  type: "textarea",
                  placeholder: "En güncel yapay zeka, robotik, otomasyon ve makine öğrenimi haberleri",
                  defaultValue: "En güncel yapay zeka, robotik, otomasyon ve makine öğrenimi haberleri. AI dünyasındaki gelişmeleri takip edin."
                },
                {
                  key: "seo_keywords",
                  label: "Anahtar Kelimeler",
                  type: "text",
                  placeholder: "yapay zeka, AI, robotik, makine öğrenimi",
                  defaultValue: "yapay zeka, AI, robotik, makine öğrenimi, derin öğrenme, otomasyon, ChatGPT, teknoloji haberleri"
                },
                { key: "seo_og_image", label: "OG Image URL", type: "url", placeholder: "https://aihaberleri.org/logos/banners/hero-banner.png", defaultValue: "https://aihaberleri.org/logos/banners/hero-banner.png" },
              ].map((field) => {
                const setting = data?.settings.seo.find(
                  (s) => s.key === field.key,
                );
                return (
                  <div key={field.key}>
                    <label htmlFor={field.key} className="text-sm font-bold mb-2 block">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        id={field.key}
                        defaultValue={setting?.value || field.defaultValue || ""}
                        placeholder={field.placeholder}
                        onBlur={(e) => saveSetting(field.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        rows={3}
                      />
                    ) : (
                      <input
                        id={field.key}
                        type={field.type}
                        defaultValue={setting?.value || field.defaultValue || ""}
                        placeholder={field.placeholder}
                        onBlur={(e) => saveSetting(field.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Email Settings */}
        {activeTab === "email" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-posta Ayarları
              </CardTitle>
              <CardDescription>SMTP ve e-posta bildirimleri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email_from", label: "Gönderen E-posta", type: "email" },
                { key: "email_from_name", label: "Gönderen Adı", type: "text" },
                { key: "email_smtp_host", label: "SMTP Host", type: "text" },
                { key: "email_smtp_port", label: "SMTP Port", type: "number" },
                {
                  key: "email_smtp_user",
                  label: "SMTP Kullanıcı",
                  type: "text",
                },
                {
                  key: "email_smtp_pass",
                  label: "SMTP Şifre",
                  type: "password",
                },
              ].map((field) => {
                const setting = data?.settings.email.find(
                  (s) => s.key === field.key,
                );
                return (
                  <div key={field.key}>
                    <label htmlFor={field.key} className="text-sm font-bold mb-2 block">
                      {field.label}
                    </label>
                    <div className="relative">
                      <Input
                        id={field.key}
                        type={
                          field.type === "password" && !showPasswords[field.key]
                            ? "password"
                            : field.type === "password"
                            ? "text"
                            : field.type
                        }
                        defaultValue={
                          field.type === "password" && setting?.value
                            ? "••••••••"
                            : setting?.value || ""
                        }
                        onBlur={(e) => {
                          // Only save if value was actually changed
                          if (e.target.value !== "••••••••") {
                            saveSetting(field.key, e.target.value);
                          }
                        }}
                        className="pr-20"
                      />
                      {field.type === "password" && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                [field.key]: !prev[field.key],
                              }))
                            }
                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                          >
                            {showPasswords[field.key] ? "Gizle" : "Göster"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Agent (Haber Botu) Settings */}
        {activeTab === "agent" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Haber Botu Ayarları
              </CardTitle>
              <CardDescription>
                Otomatik haber toplama ve yayınlama ayarları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Çalışma Aralığı */}
              <div>
                <label htmlFor="agent-interval" className="text-sm font-bold mb-2 block">
                  Çalışma Aralığı
                </label>
                <select
                  id="agent-interval"
                  defaultValue={
                    data?.settings.agent.find(
                      (s) => s.key === "agent.intervalHours",
                    )?.value || "6"
                  }
                  onChange={(e) =>
                    saveSetting("agent.intervalHours", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="0.1">6 Dakikada Bir</option>
                  <option value="0.133">8 Dakikada Bir</option>
                  <option value="0.167">10 Dakikada Bir</option>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Haber botunun ne sıklıkla çalışacağını belirler
                </p>
              </div>

              {/* Minimum Haber Sayısı */}
              <div>
                <label htmlFor="agent-min-articles" className="text-sm font-bold mb-2 block">
                  Minimum Haber Sayısı (Her Çalışmada)
                </label>
                <select
                  id="agent-min-articles"
                  defaultValue={
                    data?.settings.agent.find(
                      (s) => s.key === "agent.minArticles",
                    )?.value || "3"
                  }
                  onChange={(e) =>
                    saveSetting("agent.minArticles", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="1">1 Haber</option>
                  <option value="2">2 Haber</option>
                  <option value="3">3 Haber</option>
                  <option value="4">4 Haber</option>
                  <option value="5">5 Haber</option>
                </select>
              </div>

              {/* Maksimum Haber Sayısı */}
              <div>
                <label htmlFor="agent-max-articles" className="text-sm font-bold mb-2 block">
                  Maksimum Haber Sayısı (Her Çalışmada)
                </label>
                <select
                  id="agent-max-articles"
                  defaultValue={
                    data?.settings.agent.find(
                      (s) => s.key === "agent.maxArticles",
                    )?.value || "5"
                  }
                  onChange={(e) =>
                    saveSetting("agent.maxArticles", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="1">1 Haber</option>
                  <option value="2">2 Haber</option>
                  <option value="3">3 Haber</option>
                  <option value="4">4 Haber</option>
                  <option value="5">5 Haber</option>
                  <option value="6">6 Haber</option>
                  <option value="7">7 Haber</option>
                  <option value="8">8 Haber</option>
                  <option value="10">10 Haber</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Her çalışmada min-max arasında rastgele sayıda haber yayınlanır
                </p>
              </div>

              {/* Durum Bilgisi */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-bold mb-2">📊 Mevcut Durum</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Sonraki Çalışma:</span>{" "}
                    {data?.settings.agent.find((s) => s.key === "agent.nextRun")
                      ?.value
                      ? new Date(
                        data.settings.agent.find(
                          (s) => s.key === "agent.nextRun",
                        )!.value,
                      ).toLocaleString("tr-TR")
                      : "Belirlenmedi"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Aralık:</span>{" "}
                    {(() => {
                      const hours = parseFloat(
                        data?.settings.agent.find(
                          (s) => s.key === "agent.intervalHours",
                        )?.value || "6",
                      );
                      if (hours < 1) return `${hours * 60} dakika`;
                      return `${hours} saat`;
                    })()}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Haber Sayısı:</span>{" "}
                    {data?.settings.agent.find((s) => s.key === "agent.minArticles")
                      ?.value || "3"}{" "}
                    -{" "}
                    {data?.settings.agent.find((s) => s.key === "agent.maxArticles")
                      ?.value || "5"}{" "}
                    arası
                  </p>
                </div>
              </div>

              {/* Uyarı */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ Ayarları değiştirdikten sonra değişikliklerin etkili olması
                  için bir sonraki çalışmayı bekleyin veya "Manuel Tetikle" ile
                  hemen çalıştırın.
                </p>
              </div>

              <div className="p-4 border border-ai-surface-border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <h4 className="font-bold text-sm">Eksik Görselleri Tamamla</h4>
                </div>

                <p className="text-xs text-muted-foreground">
                  Yayındaki görselsiz haberler için ücretsiz yedek provider zinciri ile
                  otomatik görsel tamamlar.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Limit</label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={backfillLimit}
                      onChange={(e) =>
                        setBackfillLimit(
                          Math.max(1, Math.min(200, Number(e.target.value) || 20)),
                        )
                      }
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold h-10">
                    <input
                      type="checkbox"
                      checked={backfillDryRun}
                      onChange={(e) => setBackfillDryRun(e.target.checked)}
                    />
                    Dry-run
                  </label>

                  <Button
                    onClick={runImageBackfill}
                    disabled={backfillLoading}
                    className="font-bold"
                  >
                    {backfillLoading
                      ? "Çalıştırılıyor..."
                      : backfillDryRun
                        ? "Dry-run Çalıştır"
                        : "Backfill Başlat"}
                  </Button>
                </div>

                {backfillResult && (
                  <div className="text-xs rounded-md bg-muted/40 border border-ai-surface-border p-3 space-y-1">
                    <p>
                      <span className="font-semibold">Mod:</span>{" "}
                      {backfillResult.dryRun ? "Dry-run" : "Gerçek update"}
                    </p>
                    <p>
                      <span className="font-semibold">Aday:</span> {backfillResult.candidates}
                    </p>
                    <p>
                      <span className="font-semibold">Güncellenen:</span> {backfillResult.updated}
                    </p>
                    <p>
                      <span className="font-semibold">Hata:</span> {backfillResult.failed}
                    </p>
                    <p>
                      <span className="font-semibold">Yedek provider kullanımı:</span>{" "}
                      {backfillResult.backupProviderUsed}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social Media Settings */}
        {activeTab === "social" && (
          <>
            {/* Auto-Sharing Toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Otomatik Paylaşım Ayarları
                </CardTitle>
                <CardDescription>
                  Haberlerin hangi sosyal medya platformlarına otomatik paylaşılacağını belirleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    key: "social_share_twitter_tr",
                    label: "Twitter (TR)",
                    emoji: "🐦",
                    description: "Türkçe tweet paylaşımı",
                  },
                  {
                    key: "social_share_facebook_tr",
                    label: "Facebook (TR)",
                    emoji: "📘",
                    description: "Türkçe Facebook sayfasına paylaşım",
                  },
                  {
                    key: "social_share_facebook_en",
                    label: "Facebook (EN)",
                    emoji: "📘",
                    description: "İngilizce Facebook sayfasına paylaşım",
                  },
                  {
                    key: "social_share_bluesky_tr",
                    label: "Bluesky (TR)",
                    emoji: "🦋",
                    description: "Türkçe Bluesky paylaşımı",
                  },
                  {
                    key: "social_share_bluesky_en",
                    label: "Bluesky (EN)",
                    emoji: "🦋",
                    description: "İngilizce Bluesky paylaşımı",
                  },
                  {
                    key: "social_share_mastodon_tr",
                    label: "Mastodon (TR)",
                    emoji: "🐘",
                    description: "Türkçe Mastodon paylaşımı",
                  },
                  {
                    key: "social_share_mastodon_en",
                    label: "Mastodon (EN)",
                    emoji: "🐘",
                    description: "İngilizce Mastodon paylaşımı",
                  },
                ].map((platform) => {
                  const setting = data?.settings.social_share?.find(
                    (s) => s.key === platform.key,
                  );
                  const isEnabled = setting ? setting.value === "true" : true;

                  return (
                    <div
                      key={platform.key}
                      className="flex items-center justify-between gap-4 rounded-lg border border-ai-surface-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{platform.emoji}</span>
                        <div>
                          <p className="text-sm font-bold">{platform.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {platform.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isEnabled ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                          {isEnabled ? "Açık" : "Kapalı"}
                        </span>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            saveSetting(platform.key, checked ? "true" : "false");
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="p-3 bg-muted/50 rounded-lg mt-2">
                  <p className="text-xs text-muted-foreground">
                    💡 Kapalı platformlara yeni haberler paylaşılmaz. Mevcut paylaşımlar etkilenmez.
                    Değişiklikler anında devreye girer.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Facebook className="h-5 w-5" />
                Sosyal Medya Bağlantıları
              </CardTitle>
              <CardDescription>Sosyal medya profil linkleri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialPlatforms.map((platform) => {
                const social = data?.socialMedia.find(
                  (s) => s.platform === platform.key,
                );
                const Icon = platform.icon;

                return (
                  <div
                    key={platform.key}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <Icon className="h-6 w-6 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <label htmlFor={`social-${platform.key}`} className="text-sm font-bold mb-2 block">
                        {platform.label}
                      </label>
                      <input
                        id={`social-${platform.key}`}
                        type="url"
                        defaultValue={social?.url || ""}
                        onBlur={(e) =>
                          saveSocialMedia(
                            platform.key,
                            e.target.value,
                            social?.enabled ?? true,
                          )
                        }
                        placeholder={`https://${platform.key}.com/...`}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id={`social-${platform.key}-enabled`}
                        type="checkbox"
                        defaultChecked={social?.enabled ?? true}
                        onChange={(e) =>
                          saveSocialMedia(
                            platform.key,
                            social?.url || "",
                            e.target.checked,
                          )
                        }
                        className="w-4 h-4"
                        aria-label={`${platform.label} aktif/pasif`}
                      />
                      <span className="text-xs font-bold">Aktif</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          </>
        )}

        {/* Save Indicator */}
        {saving && (
          <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="font-bold">Kaydediliyor...</span>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
