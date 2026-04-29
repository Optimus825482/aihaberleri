"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { AlertTriangle, Link2, Loader2, RefreshCw, Upload } from "lucide-react";

type CoverageAction = "queue_recovery" | "notify_google" | "both" | "recover_then_notify";
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

interface CoverageSummary {
  total: number;
  recoverable: number;
  queued: number;
  notified: number;
  skipped: number;
  failed: number;
}

interface CoverageResponse {
  success: boolean;
  batchId?: string;
  summary?: CoverageSummary;
  results?: CoverageResult[];
  error?: string;
}

interface BatchListItem {
  id: string;
  action: CoverageAction;
  status: string;
  totalItems: number;
  recoverableItems: number;
  queuedItems: number;
  notifiedItems: number;
  skippedItems: number;
  failedItems: number;
  createdAt: string;
  completedAt: string | null;
  category?: { id: string; name: string };
  _count?: { items: number };
}

interface BatchDetailResponse {
  success: boolean;
  batch?: BatchListItem & {
    items: CoverageResult[];
  };
  error?: string;
}

function isLikelyHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function parseUploadedUrls(content: string, fileName: string): {
  urls: string[];
  skipped: number;
} {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const extracted: string[] = [];
  let skipped = 0;

  for (const line of lines) {
    if (isCsv) {
      const parts = line.split(/[\t,;]/).map((part) => part.trim().replace(/^"|"$/g, ""));
      const candidate = parts.find((part) => isLikelyHttpUrl(part));
      if (candidate) extracted.push(candidate);
      else skipped++;
      continue;
    }

    if (isLikelyHttpUrl(line)) extracted.push(line);
    else skipped++;
  }

  return { urls: extracted, skipped };
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    queued: { label: "Queued", variant: "secondary" },
    notified: { label: "Notified", variant: "default" },
    both: { label: "Both", variant: "default" },
    skipped: { label: "Skipped", variant: "outline" },
    failed: { label: "Failed", variant: "destructive" },
    running: { label: "Running", variant: "secondary" },
    completed: { label: "Completed", variant: "default" },
    partial: { label: "Partial", variant: "outline" },
  };

  const state = map[key] ?? { label: status, variant: "outline" as const };
  return <Badge variant={state.variant}>{state.label}</Badge>;
}

export default function CoverageRecoveryPage() {
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [action, setAction] = useState<CoverageAction>("both");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CoverageResult[]>([]);
  const [summary, setSummary] = useState<CoverageSummary | undefined>(undefined);

  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const parsedUrls = useMemo(
    () =>
      Array.from(
        new Set(
          urlInput
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
        ),
      ),
    [urlInput],
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/admin/articles/coverage-recovery?limit=30", {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "History yüklenemedi");
      }

      const nextBatches: BatchListItem[] = Array.isArray(data.batches) ? data.batches : [];
      setBatches(nextBatches);
      setActiveBatchId(data.activeBatchId ?? null);

      const currentSelected = selectedBatchId;
      if (currentSelected && nextBatches.some((batch) => batch.id === currentSelected)) return;

      if (data.activeBatchId && nextBatches.some((batch) => batch.id === data.activeBatchId)) {
        setSelectedBatchId(data.activeBatchId);
      } else if (nextBatches.length > 0) {
        setSelectedBatchId(nextBatches[0].id);
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Geçmiş yüklenemedi",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedBatchId, toast]);

  const loadBatchDetail = useCallback(
    async (batchId: string) => {
      try {
        const response = await fetch(`/api/admin/articles/coverage-recovery/${batchId}`, {
          credentials: "include",
        });
        const data: BatchDetailResponse = await response.json();
        if (!response.ok || !data.success || !data.batch) {
          throw new Error(data.error || "Batch detayları alınamadı");
        }

        setResults(data.batch.items ?? []);
        setSummary({
          total: data.batch.totalItems,
          recoverable:
            (data.batch as BatchListItem & { recoverableItems?: number }).recoverableItems ??
            data.batch.totalItems - (data.batch.skippedItems ?? 0),
          queued: data.batch.queuedItems ?? 0,
          notified: data.batch.notifiedItems ?? 0,
          skipped: data.batch.skippedItems ?? 0,
          failed: data.batch.failedItems ?? 0,
        });
      } catch (error: unknown) {
        toast({
          variant: "destructive",
          title: "Batch detayları alınamadı",
          description: error instanceof Error ? error.message : "Bilinmeyen hata",
        });
      }
    },
    [toast],
  );

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

    void loadHistory();
  }, [loadHistory, toast]);

  useEffect(() => {
    if (!selectedBatchId) return;
    void loadBatchDetail(selectedBatchId);
  }, [selectedBatchId, loadBatchDetail]);

  useEffect(() => {
    const targetBatch = batches.find((batch) => batch.id === selectedBatchId);
    if (!targetBatch || targetBatch.status !== "RUNNING") return;

    const interval = setInterval(() => {
      void loadHistory();
      void loadBatchDetail(targetBatch.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [batches, selectedBatchId, loadBatchDetail, loadHistory]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isAccepted = /\.(txt|csv)$/i.test(file.name);
    if (!isAccepted) {
      toast({
        variant: "destructive",
        title: "Desteklenmeyen dosya",
        description: "Lütfen .txt veya .csv dosyası yükleyin.",
      });
      event.target.value = "";
      return;
    }

    try {
      const content = await file.text();
      const { urls, skipped } = parseUploadedUrls(content, file.name);
      const merged = Array.from(new Set([...parsedUrls, ...urls]));
      setUrlInput(merged.join("\n"));

      const added = Math.max(0, merged.length - parsedUrls.length);
      toast({
        title: "Dosya işlendi",
        description: `${added} URL eklendi${skipped > 0 ? `, ${skipped} satır atlandı` : ""}.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Dosya okunamadı",
        description: "Dosya içeriği işlenemedi.",
      });
    } finally {
      event.target.value = "";
    }
  };

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
        body: JSON.stringify({ urls: parsedUrls, categoryId, action }),
      });

      const data: CoverageResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Coverage recovery isteği başarısız");
      }

      setResults(data.results ?? []);
      setSummary(data.summary);
      if (data.batchId) setSelectedBatchId(data.batchId);
      await loadHistory();
      toast({ title: "Coverage recovery başlatıldı" });
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
            <CardTitle>Yeni İşlem Başlat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                TXT/CSV Yükle
                <input
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <span className="text-xs text-muted-foreground">
                Dosyadaki URL&apos;ler otomatik parse edilip listeye eklenir.
              </span>
            </div>

            <Textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="min-h-[180px]"
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
                    <SelectItem value="recover_then_notify">recover_then_notify</SelectItem>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Geçmiş / Aktif Batchler</CardTitle>
            <Button variant="outline" size="sm" onClick={() => void loadHistory()} disabled={historyLoading}>
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yenile"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Batch</th>
                    <th className="text-left p-2">Durum</th>
                    <th className="text-left p-2">Aksiyon</th>
                    <th className="text-left p-2">Kategori</th>
                    <th className="text-left p-2">Özet</th>
                    <th className="text-left p-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr
                      key={batch.id}
                      className={`border-t cursor-pointer hover:bg-muted/30 ${
                        selectedBatchId === batch.id ? "bg-muted/40" : ""
                      }`}
                      onClick={() => setSelectedBatchId(batch.id)}
                    >
                      <td className="p-2">
                        <div className="font-mono text-xs">{batch.id}</div>
                        {activeBatchId === batch.id ? (
                          <div className="text-[11px] text-primary">Aktif batch</div>
                        ) : null}
                      </td>
                      <td className="p-2">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="p-2">{batch.action}</td>
                      <td className="p-2">{batch.category?.name || "-"}</td>
                      <td className="p-2">
                        {batch.totalItems} / Q:{batch.queuedItems} N:{batch.notifiedItems} S:{batch.skippedItems} F:
                        {batch.failedItems}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(batch.createdAt).toLocaleString("tr-TR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Seçili Batch Özeti</CardTitle>
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
              <CardTitle>Seçili Batch Sonuçları</CardTitle>
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
