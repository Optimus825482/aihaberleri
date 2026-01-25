"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Youtube, Facebook, Instagram, Twitter, Save } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";

interface SocialMedia {
  id: string;
  platform: string;
  url: string;
  enabled: boolean;
}

export default function SocialMediaPage() {
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const socialIcons: Record<string, React.ReactNode> = {
    youtube: <Youtube className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
    instagram: <Instagram className="h-5 w-5" />,
    twitter: <Twitter className="h-5 w-5" />,
  };

  const socialLabels: Record<string, string> = {
    youtube: "YouTube",
    facebook: "Facebook",
    instagram: "Instagram",
    twitter: "Twitter",
  };

  useEffect(() => {
    fetchSocialMedia();
  }, []);

  const fetchSocialMedia = async () => {
    try {
      const response = await fetch("/api/social-media");
      if (response.ok) {
        const data = await response.json();
        setSocialMedia(data);
      }
    } catch (error) {
      console.error("Sosyal medya hesapları yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (platform: string, url: string) => {
    setSocialMedia((prev) =>
      prev.map((social) =>
        social.platform === platform ? { ...social, url } : social,
      ),
    );
  };

  const handleToggle = (platform: string) => {
    setSocialMedia((prev) =>
      prev.map((social) =>
        social.platform === platform
          ? { ...social, enabled: !social.enabled }
          : social,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/social-media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socialMedia),
      });

      if (response.ok) {
        alert("Sosyal medya hesapları güncellendi!");
      } else {
        alert("Güncelleme başarısız!");
      }
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      alert("Bir hata oluştu!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p>Yükleniyor...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sosyal Medya Hesapları</h1>
          <p className="text-muted-foreground">
            Sosyal medya hesaplarınızı yönetin. Bu linkler footer'da
            görüntülenecektir.
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {socialMedia.map((social) => (
            <Card key={social.id} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {socialIcons[social.platform]}
                <h3 className="text-lg font-semibold">
                  {socialLabels[social.platform]}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor={`url-${social.platform}`}>Hesap URL</Label>
                  <Input
                    id={`url-${social.platform}`}
                    type="url"
                    value={social.url}
                    onChange={(e) =>
                      handleUpdate(social.platform, e.target.value)
                    }
                    placeholder={`https://${social.platform}.com/aihaberleriorg`}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`enabled-${social.platform}`}
                    checked={social.enabled}
                    onChange={() => handleToggle(social.platform)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`enabled-${social.platform}`}>
                    Footer'da göster
                  </Label>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
