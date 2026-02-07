"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Play } from "lucide-react";

// Platform icons and colors
const platformConfig: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  FACEBOOK: { icon: "📘", color: "bg-blue-600", label: "Facebook TR" },
  FACEBOOK_EN: { icon: "📘", color: "bg-blue-500", label: "Facebook EN" },
  BLUESKY: { icon: "🦋", color: "bg-sky-500", label: "Bluesky TR" },
  BLUESKY_EN: { icon: "🦋", color: "bg-sky-400", label: "Bluesky EN" },
  MASTODON: { icon: "🐘", color: "bg-purple-600", label: "Mastodon TR" },
  MASTODON_EN: { icon: "🐘", color: "bg-purple-500", label: "Mastodon EN" },
  TUMBLR: { icon: "📝", color: "bg-indigo-600", label: "Tumblr TR" },
  TUMBLR_EN: { icon: "📝", color: "bg-indigo-500", label: "Tumblr EN" },
};

interface SocialShareBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    platforms: string[];
    batchSize: number;
    intervalSeconds: number;
  }) => Promise<void>;
  loading?: boolean;
  articleCount?: number;
}

export function SocialShareBatchModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  articleCount = 0,
}: SocialShareBatchModalProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "FACEBOOK",
    "FACEBOOK_EN",
    "BLUESKY",
    "BLUESKY_EN",
    "MASTODON",
    "MASTODON_EN",
    "TUMBLR",
    "TUMBLR_EN",
  ]);
  const [batchSize, setBatchSize] = useState(50);
  const [intervalSeconds, setIntervalSeconds] = useState(10);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleConfirm = () => {
    onConfirm({
      platforms: selectedPlatforms,
      batchSize: articleCount > 0 ? articleCount : batchSize, // If specific articles selected, likely process all of them
      intervalSeconds,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Toplu Paylaşım Başlat
          </DialogTitle>
          <DialogDescription>
            {articleCount > 0
              ? `${articleCount} adet seçili haber için paylaşım başlatılıyor.`
              : "Paylaşılmamış haberler için toplu işlem başlatılıyor."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platformlar</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(platformConfig).map(([key, config]) => (
                <div
                  key={key}
                  className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors ${
                    selectedPlatforms.includes(key)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => togglePlatform(key)}
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(key)}
                    onCheckedChange={() => togglePlatform(key)}
                    id={`platform-${key}`}
                  />
                  <div className="flex items-center gap-2 text-sm select-none">
                    <span className="text-lg">{config.icon}</span>
                    <span>{config.label}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Seçili: {selectedPlatforms.length} platform
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Batch Size (Only show if not forcing article count, or show as info) */}
            <div className="space-y-2">
              <Label htmlFor="batch-size">
                {articleCount > 0 ? "İşlenecek Haber" : "Batch Boyutu"}
              </Label>
              <Input
                id="batch-size"
                type="number"
                value={articleCount > 0 ? articleCount : batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                disabled={articleCount > 0} // Disable if specific count is set by selection
                min={1}
                max={100}
              />
            </div>

            {/* Interval */}
            <div className="space-y-2">
              <Label htmlFor="interval">Aralık (Saniye)</Label>
              <Select
                value={intervalSeconds.toString()}
                onValueChange={(val) => setIntervalSeconds(parseInt(val))}
              >
                <SelectTrigger id="interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 saniye</SelectItem>
                  <SelectItem value="10">10 saniye</SelectItem>
                  <SelectItem value="15">15 saniye</SelectItem>
                  <SelectItem value="30">30 saniye</SelectItem>
                  <SelectItem value="60">1 dakika</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-600 dark:text-blue-300">
            <p>
              <strong>Paralel Paylaşım:</strong> Her haber için seçili tüm
              platformlara aynı anda paylaşım yapılır. İşlem arka planda devam
              eder.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            İptal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || selectedPlatforms.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Başlatılıyor...
              </>
            ) : (
              "Batch Başlat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
