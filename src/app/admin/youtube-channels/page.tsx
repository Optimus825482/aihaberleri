"use client";

import { useState, useEffect, useCallback } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Youtube,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Play,
  Loader2,
  Search,
  Globe,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Hash,
  Newspaper,
  Timer,
  StopCircle,
  CircleDot,
  Square,
  CheckSquare,
} from "lucide-react";

// Types
interface YouTubeChannel {
  id: string;
  channelId: string;
  name: string;
  language: string;
  category: string;
  priority: number;
  isActive: boolean;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  lastFetchedAt: string | null;
  lastVideoId: string | null;
  totalVideos: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ScanResult {
  topicsFound: number;
  coveredCount: number;
  uncoveredCount: number;
  topics: Array<{
    topic: string;
    originalTitle: string;
    description: string;
    source: string;
    sourceUrl: string;
    confidence: number;
    keywords: string[];
    isCovered: boolean;
    publishedAt?: string;
  }>;
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

interface ChannelStats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
}

const CATEGORIES = [
  { value: "ai_news", label: "AI Haberleri" },
  { value: "ai_research", label: "AI Araştırma" },
  { value: "ai_tools", label: "AI Araçları" },
  { value: "ai_business", label: "AI İş Dünyası" },
  { value: "ai_turkish", label: "Türkçe AI" },
];

const LANGUAGES = [
  { value: "en", label: "🇬🇧 İngilizce" },
  { value: "tr", label: "🇹🇷 Türkçe" },
  { value: "de", label: "🇩🇪 Almanca" },
  { value: "fr", label: "🇫🇷 Fransızca" },
  { value: "ja", label: "🇯🇵 Japonca" },
  { value: "ko", label: "🇰🇷 Korece" },
  { value: "zh", label: "🇨🇳 Çince" },
];

function getCategoryBadge(category: string) {
  const map: Record<string, { label: string; className: string }> = {
    ai_news: {
      label: "Haberler",
      className: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    },
    ai_research: {
      label: "Araştırma",
      className: "bg-purple-500/20 text-purple-500 border-purple-500/30",
    },
    ai_tools: {
      label: "Araçlar",
      className: "bg-green-500/20 text-green-500 border-green-500/30",
    },
    ai_business: {
      label: "İş Dünyası",
      className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    },
    ai_turkish: {
      label: "Türkçe",
      className: "bg-red-500/20 text-red-500 border-red-500/30",
    },
  };
  const info = map[category] || {
    label: category,
    className: "bg-gray-500/20 text-gray-500",
  };
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  );
}

function getPriorityStars(priority: number) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < priority ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function YouTubeChannelsPage() {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [stats, setStats] = useState<ChannelStats>({
    total: 0,
    active: 0,
    byCategory: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Topic selection for publishing
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishInterval, setPublishInterval] = useState(15);
  const [isQueueing, setIsQueueing] = useState(false);

  // Queue status
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  // Add channel dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    channelId: "",
    name: "",
    language: "en",
    category: "ai_news",
    priority: 3,
  });
  const [isAdding, setIsAdding] = useState(false);

  // Edit channel dialog
  const [editChannel, setEditChannel] = useState<YouTubeChannel | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete confirmation
  const [deleteChannel, setDeleteChannel] = useState<YouTubeChannel | null>(
    null,
  );

  const { toast } = useToast();

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/youtube/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.data || []);
        setStats(data.stats || { total: 0, active: 0, byCategory: {} });
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
      toast({
        title: "Hata",
        description: "Kanallar yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

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
    fetchQueueStatus();
    // Poll queue status every 30 seconds when active
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  // Toggle topic selection
  const toggleTopicSelection = (index: number) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Select all uncovered topics
  const selectAllUncovered = () => {
    if (!scanResult) return;
    const uncoveredIndices = new Set<number>();
    scanResult.topics.forEach((topic, i) => {
      if (!topic.isCovered) uncoveredIndices.add(i);
    });
    setSelectedTopics(uncoveredIndices);
  };

  // Deselect all
  const deselectAll = () => setSelectedTopics(new Set());

  // Queue selected topics for publishing
  const handleQueuePublish = async () => {
    if (!scanResult || selectedTopics.size === 0) return;
    setIsQueueing(true);
    try {
      const topicsToQueue = Array.from(selectedTopics).map(
        (i) => scanResult.topics[i],
      );
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
        toast({
          title: "Kuyruk Oluşturuldu",
          description: data.data.message,
        });
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

  // Add channel
  const handleAddChannel = async () => {
    if (!addForm.channelId || !addForm.name) {
      toast({
        title: "Hata",
        description: "Kanal ID ve isim zorunlu",
        variant: "destructive",
      });
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Başarılı", description: `${addForm.name} eklendi` });
        setIsAddOpen(false);
        setAddForm({
          channelId: "",
          name: "",
          language: "en",
          category: "ai_news",
          priority: 3,
        });
        fetchChannels();
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
        description: "Kanal eklenemedi",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Update channel
  const handleUpdateChannel = async () => {
    if (!editChannel) return;
    setIsEditing(true);
    try {
      const res = await fetch(`/api/admin/youtube/channels/${editChannel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editChannel.name,
          language: editChannel.language,
          category: editChannel.category,
          priority: editChannel.priority,
          isActive: editChannel.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Başarılı",
          description: `${editChannel.name} güncellendi`,
        });
        setEditChannel(null);
        fetchChannels();
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
        description: "Kanal güncellenemedi",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  // Toggle active
  const handleToggleActive = async (channel: YouTubeChannel) => {
    try {
      const res = await fetch(`/api/admin/youtube/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      if (res.ok) {
        fetchChannels();
      }
    } catch {
      toast({
        title: "Hata",
        description: "Durum değiştirilemedi",
        variant: "destructive",
      });
    }
  };

  // Delete channel
  const handleDeleteChannel = async () => {
    if (!deleteChannel) return;
    try {
      const res = await fetch(
        `/api/admin/youtube/channels/${deleteChannel.id}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        toast({
          title: "Başarılı",
          description: `${deleteChannel.name} silindi`,
        });
        setDeleteChannel(null);
        fetchChannels();
      }
    } catch {
      toast({
        title: "Hata",
        description: "Kanal silinemedi",
        variant: "destructive",
      });
    }
  };

  // Scan channels
  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    setSelectedTopics(new Set());
    try {
      const res = await fetch("/api/admin/youtube/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursAgo: 48 }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(data.data);
        toast({
          title: "Tarama Tamamlandı",
          description: `${data.data.topicsFound} AI konusu bulundu (${data.data.coveredCount} haber yapılmış, ${data.data.uncoveredCount} yeni)`,
        });
        fetchChannels();
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

  // Filter channels
  const filteredChannels = channels.filter((ch) => {
    const matchesSearch =
      !searchQuery ||
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.channelId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || ch.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">
              YouTube kanalları yükleniyor...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-700 rounded-xl shadow-lg shadow-red-500/20">
                <Youtube className="h-6 w-6 text-white" />
              </div>
              YouTube Kanalları
            </h1>
            <p className="text-muted-foreground mt-1">
              AI odaklı YouTube kanallarını yönetin ve tarayın
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchChannels}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800"
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
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Kanal Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni YouTube Kanalı Ekle</DialogTitle>
                  <DialogDescription>
                    YouTube kanal ID&apos;sini ve bilgilerini girin. Kanal
                    ID&apos;si URL&apos;deki UC ile başlayan koddur.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="channelId">Kanal ID (UCxxxx...)</Label>
                    <Input
                      id="channelId"
                      placeholder="UCbfYPyITQ-7l4upoX8nvctg"
                      value={addForm.channelId}
                      onChange={(e) =>
                        setAddForm({ ...addForm, channelId: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Kanal Adı</Label>
                    <Input
                      id="name"
                      placeholder="Two Minute Papers"
                      value={addForm.name}
                      onChange={(e) =>
                        setAddForm({ ...addForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dil</Label>
                      <Select
                        value={addForm.language}
                        onValueChange={(v) =>
                          setAddForm({ ...addForm, language: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kategori</Label>
                      <Select
                        value={addForm.category}
                        onValueChange={(v) =>
                          setAddForm({ ...addForm, category: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Öncelik (1-5)</Label>
                    <Select
                      value={String(addForm.priority)}
                      onValueChange={(v) =>
                        setAddForm({ ...addForm, priority: Number(v) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            {"⭐".repeat(p)} ({p})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleAddChannel} disabled={isAdding}>
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Ekle
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Youtube className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Toplam Kanal</p>
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
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.total - stats.active}
                  </p>
                  <p className="text-xs text-muted-foreground">Pasif</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Object.keys(stats.byCategory).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Kategori</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    {" "}
                    {" • "}Sonraki:{" "}
                    {new Date(queueStatus.nextPublishAt).toLocaleTimeString(
                      "tr-TR",
                    )}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <span>
                    Bekliyor:{" "}
                    {queueStatus.totalItems -
                      queueStatus.completedItems -
                      queueStatus.failedItems}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span>Tamamlandı: {queueStatus.completedItems}</span>
                </div>
                {queueStatus.failedItems > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span>Başarısız: {queueStatus.failedItems}</span>
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
              {/* Queue items list */}
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

        {/* Scan Results */}
        {scanResult && (
          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Tarama Sonuçları — {scanResult.topicsFound} AI Konusu
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <span className="text-green-600 font-medium">
                      {scanResult.coveredCount} haber yapılmış
                    </span>
                    {" • "}
                    <span className="text-orange-600 font-medium">
                      {scanResult.uncoveredCount} yeni konu
                    </span>
                    {selectedTopics.size > 0 && (
                      <>
                        {" "}
                        {" • "}
                        <span className="text-blue-600 font-medium">
                          {selectedTopics.size} seçili
                        </span>
                      </>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllUncovered}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Tümünü Seç
                  </Button>
                  {selectedTopics.size > 0 && (
                    <>
                      <Button variant="outline" size="sm" onClick={deselectAll}>
                        <Square className="h-4 w-4 mr-1" />
                        Temizle
                      </Button>
                      <Dialog
                        open={isPublishDialogOpen}
                        onOpenChange={setIsPublishDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                          >
                            <Newspaper className="h-4 w-4 mr-1" />
                            Haber Oluştur ({selectedTopics.size})
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Haber Yayın Planı</DialogTitle>
                            <DialogDescription>
                              {selectedTopics.size} konu seçildi. Haberler
                              belirtilen aralıkla sırayla yayınlanacak.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Yayın Aralığı (dakika)</Label>
                              <Select
                                value={String(publishInterval)}
                                onValueChange={(v) =>
                                  setPublishInterval(Number(v))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">5 dakika</SelectItem>
                                  <SelectItem value="10">10 dakika</SelectItem>
                                  <SelectItem value="15">
                                    15 dakika (Önerilen)
                                  </SelectItem>
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
                                {selectedTopics.size} haber × {publishInterval}{" "}
                                dk = yaklaşık{" "}
                                {Math.round(
                                  (selectedTopics.size * publishInterval) / 60,
                                )}{" "}
                                saat
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Haberler normal pipeline üzerinden işlenecek ve
                                sırayla yayınlanacak.
                              </p>
                            </div>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {Array.from(selectedTopics).map((idx) => (
                                <div
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-card border truncate"
                                >
                                  {scanResult.topics[idx]?.topic}
                                </div>
                              ))}
                            </div>
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
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {scanResult.topics.map((topic, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border transition-colors ${
                        topic.isCovered
                          ? "bg-green-500/5 border-green-500/20 opacity-70"
                          : selectedTopics.has(i)
                            ? "bg-blue-500/10 border-blue-500/30"
                            : "bg-card/50 hover:bg-muted/50 border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox — only for uncovered topics */}
                        <div className="pt-0.5 shrink-0">
                          {topic.isCovered ? (
                            <div className="h-4 w-4 rounded flex items-center justify-center bg-green-500/20">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={selectedTopics.has(i)}
                              onCheckedChange={() => toggleTopicSelection(i)}
                              aria-label={`${topic.topic} seç`}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-semibold text-sm ${topic.isCovered ? "line-through text-muted-foreground" : ""}`}
                              >
                                {topic.topic}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {topic.source}
                                {topic.isCovered && (
                                  <span className="ml-2 text-green-600 font-medium">
                                    ✓ Haber yapılmış
                                  </span>
                                )}
                              </p>
                              {topic.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {topic.keywords.slice(0, 4).map((kw, j) => (
                                    <Badge
                                      key={j}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      <Hash className="h-2.5 w-2.5 mr-0.5" />
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                              <Badge
                                className={
                                  topic.confidence >= 70
                                    ? "bg-green-500/20 text-green-600"
                                    : topic.confidence >= 50
                                      ? "bg-yellow-500/20 text-yellow-600"
                                      : "bg-red-500/20 text-red-600"
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
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kanal ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Channel List */}
        <Card>
          <CardHeader>
            <CardTitle>Kanallar ({filteredChannels.length})</CardTitle>
            <CardDescription>
              Takip edilen YouTube kanalları listesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredChannels.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Youtube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Kanal bulunamadı</p>
                <p className="text-sm mt-1">
                  Yeni kanal eklemek için yukarıdaki butonu kullanın
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      channel.isActive
                        ? "bg-card hover:bg-muted/50"
                        : "bg-muted/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                          <Youtube className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm truncate">
                              {channel.name}
                            </h3>
                            {getCategoryBadge(channel.category)}
                            <Badge variant="outline" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              {LANGUAGES.find(
                                (l) => l.value === channel.language,
                              )?.label || channel.language}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {getPriorityStars(channel.priority)}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {channel.lastFetchedAt
                                ? new Date(
                                    channel.lastFetchedAt,
                                  ).toLocaleString("tr-TR", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Henüz taranmadı"}
                            </span>
                            <span>•</span>
                            <span>{channel.totalVideos} video</span>
                            {channel.failureCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-500 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {channel.failureCount} hata
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={channel.isActive}
                          onCheckedChange={() => handleToggleActive(channel)}
                          aria-label="Aktif/Pasif"
                        />
                        <a
                          href={`https://www.youtube.com/channel/${channel.channelId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditChannel({ ...channel })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteChannel(channel)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editChannel && (
          <Dialog
            open={!!editChannel}
            onOpenChange={(open) => !open && setEditChannel(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kanalı Düzenle</DialogTitle>
                <DialogDescription>
                  {editChannel.name} kanalının bilgilerini güncelleyin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Kanal Adı</Label>
                  <Input
                    value={editChannel.name}
                    onChange={(e) =>
                      setEditChannel({ ...editChannel, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dil</Label>
                    <Select
                      value={editChannel.language}
                      onValueChange={(v) =>
                        setEditChannel({ ...editChannel, language: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select
                      value={editChannel.category}
                      onValueChange={(v) =>
                        setEditChannel({ ...editChannel, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Öncelik</Label>
                  <Select
                    value={String(editChannel.priority)}
                    onValueChange={(v) =>
                      setEditChannel({ ...editChannel, priority: Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {"⭐".repeat(p)} ({p})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Aktif</Label>
                  <Switch
                    checked={editChannel.isActive}
                    onCheckedChange={(v) =>
                      setEditChannel({ ...editChannel, isActive: v })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditChannel(null)}>
                  İptal
                </Button>
                <Button onClick={handleUpdateChannel} disabled={isEditing}>
                  {isEditing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4 mr-2" />
                  )}
                  Güncelle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteChannel}
          onOpenChange={(open) => !open && setDeleteChannel(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kanalı Sil</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{deleteChannel?.name}</strong> kanalını silmek
                istediğinize emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteChannel}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
