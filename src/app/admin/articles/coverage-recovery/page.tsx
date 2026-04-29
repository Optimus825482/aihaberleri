"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Link2, Loader2, RefreshCw } from "lucide-react";

type CoverageAction = "queue_recovery" | "notify_google" | "both";
type ResultStatus = "queued" | "notified" | "both" | "skipped" | "failed";

interface Category {
  id: string;
  name: string;
}

interface CoverageResult {
  inputUrl: string;
  normalizedUrl: string | null;
  slug: string | null;
  locale: "tr" | "en" | null;
  status: ResultStatus;
  reason?: string;
  jobId?: string;
  queued: boolean;
  notified: boolean;
}

interface CoverageResponse {
  success: boolean;
  summary?: {
    total: number;
    recoverable: number;
    queued: number;
    notified: number;
    skipped: number;
    failed: number;
  };
  results?: CoverageResult[];
  error?: string;
}

function StatusBadge({ status }: { status: ResultStatus }) {
  const map: Record<ResultStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    queued: { label: "Queued", variant: "secondary" },
    notified: { label: "Notified", variant: "default" },
    both: { label: "Both", variant: "default" },
    skipped: { label: "Skipped", variant: "outline" },
    failed: { label: "Failed", variant: "destructive" },
  };

  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function CoverageRecoveryPage() {
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [action, setAction] = useState<CoverageAction>("both");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CoverageResult[]>([]);
  const [summary, setSummary] = useState<CoverageResponse["summary"]>(undefined);

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list: Category[] = data?.data ?? data ?? [];
        setCategories(list);
        if (list.length > 0) setCategoryId(list[0].id);
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Kategori yüklenemedi",
          description: "Lütfen sayfayı yenileyin.",
        });
      });
  }, [toast]);

  const parsedUrls = useMemo(() => {
    return urlInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [urlInput]);

  const submit = async () => {
    if (!categoryId) {
      toast({ variant: "destructive", title: "Kategori gerekli" });
      return;
    }

    if (parsedUrls.length === 0) {
      toast({ variant: "destructive", title: "En az bir URL girin" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/articles/coverage-recovery", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: parsedUrls,
          categoryId,
          action,
        }),
      });

      const data: CoverageResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Coverage recovery isteği başarısız");
      }

      setResults(data.results ?? []);
      setSummary(data.summary);
      toast({ title: "Coverage recovery tamamlandı" });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "İşlem başarısız",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Coverage Recovery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search Console 404 URL listesini yeniden üretim kuyruğuna ekleyin ve Google&apos;a bildirin.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>URL Girişi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="min-h-[220px]"
              placeholder="Her satıra bir URL yapıştırın"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs mb-1 text-muted-foreground">Kategori</p>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seç" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs mb-1 text-muted-foreground">Aksiyon</p>
                <Select value={action} onValueChange={(value: CoverageAction) => setAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="queue_recovery">queue_recovery</SelectItem>
                    <SelectItem value="notify_google">notify_google</SelectItem>
                    <SelectItem value="both">both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={submit} disabled={loading || parsedUrls.length === 0} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Çalışıyor...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      İşlemi Başlat
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Özet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                <div className="rounded border p-2">Toplam: {summary.total}</div>
                <div className="rounded border p-2">Recoverable: {summary.recoverable}</div>
                <div className="rounded border p-2">Queued: {summary.queued}</div>
                <div className="rounded border p-2">Notified: {summary.notified}</div>
                <div className="rounded border p-2">Skipped: {summary.skipped}</div>
                <div className="rounded border p-2">Failed: {summary.failed}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sonuçlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">URL</th>
                      <th className="text-left p-2">Slug</th>
                      <th className="text-left p-2">Locale</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Reason</th>
                      <th className="text-left p-2">Job ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={`${result.inputUrl}-${index}`} className="border-t">
                        <td className="p-2 max-w-[420px] truncate" title={result.normalizedUrl || result.inputUrl}>
                          {result.normalizedUrl || result.inputUrl}
                        </td>
                        <td className="p-2">{result.slug || "-"}</td>
                        <td className="p-2 uppercase">{result.locale || "-"}</td>
                        <td className="p-2">
                          <StatusBadge status={result.status} />
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {result.reason ? (
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {result.reason}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-2">
                          <Input value={result.jobId || "-"} readOnly className="h-8 text-xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
