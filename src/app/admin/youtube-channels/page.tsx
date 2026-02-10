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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Youtube,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Loader2,
  Search,
  Globe,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Newspaper,
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
  const router = useRouter();
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [stats, setStats] = useState<ChannelStats>({
    total: 0,
    active: 0,
    byCategory: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

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

  // Scan channels — redirects to topics page
  const handleScan = () => {
    router.push("/admin/youtube-topics");
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
              className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800"
            >
              <Newspaper className="h-4 w-4 mr-2" />
              Konuları Tara
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
