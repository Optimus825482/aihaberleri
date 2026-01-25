"use client";

import { Facebook, Twitter, Instagram, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonsProps {
  title: string;
  url: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    // Instagram doesn't support direct sharing via URL, so we'll copy to clipboard
  };

  const handleShare = (platform: "facebook" | "twitter" | "instagram") => {
    if (platform === "instagram") {
      // Copy to clipboard for Instagram
      navigator.clipboard.writeText(`${title}\n\n${url}`);
      alert("Link kopyalandı! Instagram'da paylaşabilirsiniz.");
    } else {
      window.open(shareLinks[platform], "_blank", "width=600,height=400");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: url,
        });
      } catch (error) {
        console.log("Paylaşım iptal edildi");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert("Link kopyalandı!");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-muted-foreground">
        Paylaş:
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("facebook")}
        className="gap-2"
      >
        <Facebook className="h-4 w-4" />
        <span className="hidden sm:inline">Facebook</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("twitter")}
        className="gap-2"
      >
        <Twitter className="h-4 w-4" />
        <span className="hidden sm:inline">Twitter</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("instagram")}
        className="gap-2"
      >
        <Instagram className="h-4 w-4" />
        <span className="hidden sm:inline">Instagram</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNativeShare}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Diğer</span>
      </Button>
    </div>
  );
}
