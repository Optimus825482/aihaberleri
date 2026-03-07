"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Newspaper,
  Play,
  Loader2,
  Search,
  Hash,
  Timer,
  StopCircle,
  Clock,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
  RefreshCw,
  ArrowLeft,
  Filter,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { usePageVisibility } from "@/hooks/usePageVisibility";

// Types
interface ScanTopic {
  topic: string;
  originalTitle: string;
  description: string;
  source: string;
  sourceUrl: string;
  confidence: number;
  keywords: string[];
  isCovered: boolean;
  publishedAt?: string;
}

interface QueueStatus {
  isActive: boolean;
  intervalMinutes: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  currentItem: string | null;
  startedAt: string | null;
  nextPublishAt: string | null;
}

interface QueueItem {
  topic: string;
  description: string;
  source: string;
  sourceUrl: string;
  keywords: string[];
  confidence: number;
  queuedAt: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

type FilterMode = "all" | "uncovered" | "covered";

export default function YouTubeTopicsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isPageVisible = usePageVisibility();

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [topics, setTopics] = useState<ScanTopic[]>([]);
  const [coveredCount, setCoveredCount] = useState(0);
  const [uncoveredCount, setUncoveredCount] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);

  // Filter & search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Selection
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());

  // Publish dialog
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishInterval, setPublishInterval] = useState(15);
  const [isQueueing, setIsQueueing] = useState(false);

  // Queue status
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  // Fetch queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/youtube/queue-publish");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQueueStatus(data.data.status);
          setQueueItems(data.data.queue);
        }
      }
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    if (!isPageVisible) {
      return undefined;
    }

    fetchQueueStatus();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchQueueStatus();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchQueueStatus, isPageVisible]);

  // Scan channels
  const handleScan = async () => {
    setIsScanning(true);
    setTopics([]);
    setSelectedTopics(new Set());
    try {
      const res = await fetch("/api/admin/youtube/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursAgo: 48 }),
      });
      const data = await res.json();
      if (data.success) {
        setTopics(data.data.topics);
        setCoveredCount(data.data.coveredCount);
        setUncoveredCount(data.data.uncoveredCount);
        setHasScanned(true);
        toast({
          title: "Tarama Tamamlandı",
          description: `${data.data.topicsFound} konu bulundu (${data.data.coveredCount} yapılmış, ${data.data.uncoveredCount} yeni)`,
        });
      } else {
        toast({
          title: "Hata",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Hata",
        description: "Tarama başarısız",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle topic selection
  const toggleTopic = (index: number) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Select all uncovered
  const selectAllUncovered = () => {
    const indices = new Set<number>();
    filteredTopics.forEach((_, filteredIdx) => {
      const realIdx = getOriginalIndex(filteredIdx);
      if (!topics[realIdx].isCovered) indices.add(realIdx);
    });
    setSelectedTopics(indices);
  };

  const deselectAll = () => setSelectedTopics(new Set());

  // Queue publish
  const handleQueuePublish = async () => {
    if (selectedTopics.size === 0) return;
    setIsQueueing(true);
    try {
      const topicsToQueue = Array.from(selectedTopics).map((i) => topics[i]);
      const res = await fetch("/api/admin/youtube/queue-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: topicsToQueue,
          intervalMinutes: publishInterval,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Kuyruk Oluşturuldu", description: data.data.message });
        setIsPublishDialogOpen(false);
        setSelectedTopics(new Set());
        fetchQueueStatus();
      } else {
        toast({
          title: "Hata",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Hata",
        description: "Kuyruk oluşturulamadı",
        variant: "destructive",
      });
    } finally {
      setIsQueueing(false);
    }
  };

  // Cancel queue
  const handleCancelQueue = async () => {
    try {
      const res = await fetch("/api/admin/youtube/queue-publish", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "İptal Edildi",
          description: "Yayın kuyruğu iptal edildi",
        });
        fetchQueueStatus();
      }
    } catch {
      toast({
        title: "Hata",
        description: "Kuyruk iptal edilemedi",
        variant: "destructive",
      });
    }
  };

  // Filter topics
  const filteredTopics = topics.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.keywords.some((k) =>
        k.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    const matchesFilter =
      filterMode === "all" ||
      (filterMode === "uncovered" && !t.isCovered) ||
      (filterMode === "covered" && t.isCovered);
    return matchesSearch && matchesFilter;
  });

  // Map filtered index back to original index
  const getOriginalIndex = (filteredIdx: number): number => {
    let count = 0;
    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      const matchesSearch =
        !searchQuery ||
        t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.keywords.some((k) =>
          k.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "uncovered" && !t.isCovered) ||
        (filterMode === "covered" && t.isCovered);
      if (matchesSearch && matchesFilter) {
        if (count === filteredIdx) return i;
        count++;
      }
    }
    return filteredIdx;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push("/admin/youtube-channels")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  YouTube Konuları
                </h1>
                <p className="text-muted-foreground text-sm">
                  Kanallardan çıkarılan AI konularını inceleyin ve haber
                  oluşturun
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Taranıyor...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Kanalları Tara
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Active Queue Status */}
        {queueStatus?.isActive && (
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Timer className="h-5 w-5 animate-pulse" />
                  Yayın Kuyruğu Aktif
                </CardTitle>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelQueue}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  İptal Et
                </Button>
              </div>
              <CardDescription>
                {queueStatus.completedItems + queueStatus.failedItems} /{" "}
                {queueStatus.totalItems} konu işlendi
                {" • "}
                {queueStatus.intervalMinutes} dk aralık
                {queueStatus.nextPublishAt && (
                  <>
                    {" • "}Sonraki:{" "}
                    {new Date(queueStatus.nextPublishAt).toLocaleTimeString(
                      "tr-TR",
                    )}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  Bekliyor:{" "}
                  {queueStatus.totalItems -
                    queueStatus.completedItems -
                    queueStatus.failedItems}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  Tamamlandı: {queueStatus.completedItems}
                </div>
                {queueStatus.failedItems > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Başarısız: {queueStatus.failedItems}
                  </div>
                )}
                {queueStatus.currentItem && (
                  <div className="flex items-center gap-1.5 text-sm text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="truncate max-w-[300px]">
                      {queueStatus.currentItem}
                    </span>
                  </div>
                )}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${queueStatus.totalItems > 0 ? ((queueStatus.completedItems + queueStatus.failedItems) / queueStatus.totalItems) * 100 : 0}%`,
                  }}
                />
              </div>
              {/* Queue items */}
              {queueItems.length > 0 && (
                <ScrollArea className="max-h-[200px] mt-3">
                  <div className="space-y-1">
                    {queueItems.map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                          item.status === "completed"
                            ? "text-green-600 bg-green-500/5"
                            : item.status === "processing"
                              ? "text-blue-600 bg-blue-500/5"
                              : item.status === "failed"
                                ? "text-red-600 bg-red-500/5"
                                : "text-muted-foreground"
                        }`}
                      >
                        {item.status === "completed" && (
                          <CheckCircle className="h-3 w-3 shrink-0" />
                        )}
                        {item.status === "processing" && (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        )}
                        {item.status === "failed" && (
                          <XCircle className="h-3 w-3 shrink-0" />
                        )}
                        {item.status === "pending" && (
                          <Clock className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">{item.topic}</span>
                        {item.error && (
                          <span className="text-red-500 shrink-0">
                            ({item.error})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty state — before scan */}
        {!hasScanned && !queueStatus?.isActive && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Newspaper className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="text-xl font-bold mb-2">Henüz tarama yapılmadı</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                YouTube kanallarını tarayarak AI konularını çıkarın. Ardından
                istediğiniz konuları seçip haber oluşturabilirsiniz.
              </p>
              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Taranıyor...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Kanalları Tara
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scan Results */}
        {hasScanned && topics.length > 0 && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Newspaper className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{topics.length}</p>
                      <p className="text-xs text-muted-foreground">
                        Toplam Konu
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uncoveredCount}</p>
                      <p className="text-xs text-muted-foreground">Yeni Konu</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{coveredCount}</p>
                      <p className="text-xs text-muted-foreground">
                        Haber Yapılmış
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters + Actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Konu, kaynak veya anahtar kelime ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filterMode}
                  onValueChange={(v) => setFilterMode(v as FilterMode)}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü ({topics.length})</SelectItem>
                    <SelectItem value="uncovered">
                      Yeni Konular ({uncoveredCount})
                    </SelectItem>
                    <SelectItem value="covered">
                      Yapılmış ({coveredCount})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllUncovered}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Yenileri Seç
                </Button>
                {selectedTopics.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      <Square className="h-4 w-4 mr-1" />
                      Temizle
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      onClick={() => setIsPublishDialogOpen(true)}
                    >
                      <Newspaper className="h-4 w-4 mr-1" />
                      Haber Oluştur ({selectedTopics.size})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Topics List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Konular ({filteredTopics.length})
                </CardTitle>
                <CardDescription>
                  {selectedTopics.size > 0 && (
                    <span className="text-blue-600 font-medium">
                      {selectedTopics.size} konu seçili •{" "}
                    </span>
                  )}
                  Haber oluşturmak istediğiniz konuları seçin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredTopics.map((topic, filteredIdx) => {
                    const realIdx = getOriginalIndex(filteredIdx);
                    const isSelected = selectedTopics.has(realIdx);
                    return (
                      <div
                        key={realIdx}
                        className={`p-4 rounded-lg border transition-all ${
                          topic.isCovered
                            ? "bg-green-500/5 border-green-500/20 opacity-60"
                            : isSelected
                              ? "bg-blue-500/10 border-blue-500/30 shadow-sm"
                              : "bg-card hover:bg-muted/50 border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="pt-0.5 shrink-0">
                            {topic.isCovered ? (
                              <div className="h-5 w-5 rounded flex items-center justify-center bg-green-500/20">
                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              </div>
                            ) : (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleTopic(realIdx)}
                                aria-label={`${topic.topic} seç`}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`font-semibold text-sm leading-snug ${topic.isCovered ? "line-through text-muted-foreground" : ""}`}
                                >
                                  {topic.topic}
                                </p>
                                {topic.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {topic.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" />
                                    {topic.source}
                                  </span>
                                  {topic.isCovered && (
                                    <span className="text-xs text-green-600 font-medium">
                                      ✓ Haber yapılmış
                                    </span>
                                  )}
                                  {topic.publishedAt && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        topic.publishedAt,
                                      ).toLocaleDateString("tr-TR", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                                {topic.keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {topic.keywords.slice(0, 5).map((kw, j) => (
                                      <Badge
                                        key={j}
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        <Hash className="h-2.5 w-2.5 mr-0.5" />
                                        {kw}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Confidence + Status */}
                              <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                                <Badge
                                  className={
                                    topic.confidence >= 70
                                      ? "bg-green-500/20 text-green-600 border-green-500/30"
                                      : topic.confidence >= 50
                                        ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
                                        : "bg-red-500/20 text-red-600 border-red-500/30"
                                  }
                                >
                                  %{topic.confidence}
                                </Badge>
                                {topic.isCovered ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-green-500/10 text-green-600 border-green-500/30"
                                  >
                                    Yapılmış
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30"
                                  >
                                    Yeni
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredTopics.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">
                      Filtrelerle eşleşen konu bulunamadı
                    </p>
                    <p className="text-sm mt-1">
                      Arama veya filtre kriterlerini değiştirin
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Scan completed but no topics */}
        {hasScanned && topics.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500/30" />
              <h2 className="text-xl font-bold mb-2">Yeni konu bulunamadı</h2>
              <p className="text-muted-foreground mb-6">
                Son 48 saatte kanallardan yeni AI konusu tespit edilmedi.
              </p>
              <Button
                variant="outline"
                onClick={handleScan}
                disabled={isScanning}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tekrar Tara
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Publish Dialog */}
        <Dialog
          open={isPublishDialogOpen}
          onOpenChange={setIsPublishDialogOpen}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Haber Yayın Planı</DialogTitle>
              <DialogDescription>
                {selectedTopics.size} konu seçildi. Haberler belirtilen aralıkla
                sırayla yayınlanacak.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Yayın Aralığı (dakika)</Label>
                <Select
                  value={String(publishInterval)}
                  onValueChange={(v) => setPublishInterval(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 dakika</SelectItem>
                    <SelectItem value="10">10 dakika</SelectItem>
                    <SelectItem value="15">15 dakika (Önerilen)</SelectItem>
                    <SelectItem value="20">20 dakika</SelectItem>
                    <SelectItem value="30">30 dakika</SelectItem>
                    <SelectItem value="45">45 dakika</SelectItem>
                    <SelectItem value="60">1 saat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm font-medium mb-1">Özet</p>
                <p className="text-xs text-muted-foreground">
                  {selectedTopics.size} haber × {publishInterval} dk = yaklaşık{" "}
                  {Math.round((selectedTopics.size * publishInterval) / 60)}{" "}
                  saat
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Haberler normal pipeline üzerinden işlenecek ve sırayla
                  yayınlanacak.
                </p>
              </div>
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-1">
                  {Array.from(selectedTopics).map((idx) => (
                    <div
                      key={idx}
                      className="text-xs px-3 py-2 rounded bg-card border flex items-center gap-2"
                    >
                      <Badge className="shrink-0 text-[10px] bg-primary/10 text-primary border-primary/20">
                        %{topics[idx]?.confidence}
                      </Badge>
                      <span className="truncate">{topics[idx]?.topic}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPublishDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleQueuePublish}
                disabled={isQueueing}
                className="bg-gradient-to-r from-orange-500 to-red-600"
              >
                {isQueueing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Başlat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
