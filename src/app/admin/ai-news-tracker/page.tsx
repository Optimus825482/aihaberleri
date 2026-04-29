"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Newspaper } from "lucide-react";

type TrackerStatus = "new" | "reviewing" | "saved";

interface TrackerItem {
  id: string;
  title: string;
  url: string;
  source: string;
  status: TrackerStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data?: TrackerItem[] | TrackerItem;
  error?: string;
}

const statusLabels: Record<TrackerStatus, string> = {
  new: "Yeni",
  reviewing: "İnceleniyor",
  saved: "Kaydedildi",
};

const statusVariant: Record<TrackerStatus, "secondary" | "default" | "outline"> = {
  new: "secondary",
  reviewing: "default",
  saved: "outline",
};

export default function AiNewsTrackerPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai-news-tracker", {
        credentials: "include",
      });
      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.data)) {
        throw new Error(data.error || "Kayıtlar yüklenemedi");
      }

      setItems(data.data);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Yükleme hatası",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/ai-news-tracker", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, source, notes }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success || !data.data || Array.isArray(data.data)) {
        throw new Error(data.error || "Kayıt eklenemedi");
      }

      setItems((prev) => [data.data as TrackerItem, ...prev]);
      setTitle("");
      setUrl("");
      setSource("");
      setNotes("");

      toast({ title: "Kayıt eklendi" });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Kaydetme hatası",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: TrackerStatus) => {
    setUpdatingId(id);
    try {
      const response = await fetch("/api/admin/ai-news-tracker", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success || !data.data || Array.isArray(data.data)) {
        throw new Error(data.error || "Durum güncellenemedi");
      }

      const updated = data.data as TrackerItem;
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Güncelleme hatası",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            AI News Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin için bağımsız, reklamsız ve sade AI haber takip ekranı.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Yeni Kayıt</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submit}>
                <div className="space-y-1">
                  <Label htmlFor="title">Başlık</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="source">Kaynak</Label>
                  <Input id="source" value={source} onChange={(e) => setSource(e.target.value)} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes">Not</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Kısa notlar..."
                    className="min-h-[100px]"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    "Kaydet"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Kayıtlar</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Yükleniyor...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground">Henüz kayıt yok.</div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium leading-tight">{item.title}</p>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary break-all hover:underline"
                          >
                            {item.url}
                          </a>
                        </div>
                        <Badge variant={statusVariant[item.status]}>{statusLabels[item.status]}</Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">Kaynak: {item.source}</div>
                      {item.notes ? <p className="text-sm whitespace-pre-wrap">{item.notes}</p> : null}

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">
                          Güncellendi: {new Date(item.updatedAt).toLocaleString("tr-TR")}
                        </div>
                        <Select
                          value={item.status}
                          onValueChange={(value: TrackerStatus) => void updateStatus(item.id, value)}
                          disabled={updatingId === item.id}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Yeni</SelectItem>
                            <SelectItem value="reviewing">İnceleniyor</SelectItem>
                            <SelectItem value="saved">Kaydedildi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
