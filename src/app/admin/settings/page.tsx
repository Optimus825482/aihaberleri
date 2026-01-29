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
import {
  Settings as SettingsIcon,
  Globe,
  Search,
  Mail,
  Bot,
  Save,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<
    "general" | "seo" | "email" | "social"
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
                { key: "site_name", label: "Site Adı", type: "text" },
                {
                  key: "site_description",
                  label: "Site Açıklaması",
                  type: "textarea",
                },
                { key: "site_url", label: "Site URL", type: "url" },
                { key: "site_language", label: "Dil", type: "text" },
              ].map((field) => {
                const setting = data?.settings.general.find(
                  (s) => s.key === field.key,
                );
                return (
                  <div key={field.key}>
                    <label className="text-sm font-bold mb-2 block">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        defaultValue={setting?.value || ""}
                        onBlur={(e) => saveSetting(field.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type}
                        defaultValue={setting?.value || ""}
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
                { key: "seo_title", label: "Meta Başlık", type: "text" },
                {
                  key: "seo_description",
                  label: "Meta Açıklama",
                  type: "textarea",
                },
                {
                  key: "seo_keywords",
                  label: "Anahtar Kelimeler",
                  type: "text",
                },
                { key: "seo_og_image", label: "OG Image URL", type: "url" },
              ].map((field) => {
                const setting = data?.settings.seo.find(
                  (s) => s.key === field.key,
                );
                return (
                  <div key={field.key}>
                    <label className="text-sm font-bold mb-2 block">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        defaultValue={setting?.value || ""}
                        onBlur={(e) => saveSetting(field.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type}
                        defaultValue={setting?.value || ""}
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
                    <label className="text-sm font-bold mb-2 block">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      defaultValue={setting?.value || ""}
                      onBlur={(e) => saveSetting(field.key, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Social Media Settings */}
        {activeTab === "social" && (
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
                      <label className="text-sm font-bold mb-2 block">
                        {platform.label}
                      </label>
                      <input
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
                      />
                      <span className="text-xs font-bold">Aktif</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
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
