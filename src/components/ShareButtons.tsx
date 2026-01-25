"use client";

import {
  Facebook,
  Twitter,
  Linkedin,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
}

export function ShareButtons({ title, url, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = description ? encodeURIComponent(description) : "";

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
  };

  const handleShare = (
    platform: "facebook" | "twitter" | "linkedin" | "whatsapp" | "telegram",
  ) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Kopyalama hatası:", error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: url,
        });
      } catch (error) {
        console.log("Paylaşım iptal edildi");
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-3">
      <span className="text-sm font-semibold text-muted-foreground">
        Paylaş:
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {/* Facebook */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("facebook")}
          className="gap-2 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors"
          title="Facebook'ta Paylaş"
        >
          <Facebook className="h-4 w-4" />
          <span className="hidden sm:inline">Facebook</span>
        </Button>

        {/* Twitter/X */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("twitter")}
          className="gap-2 hover:bg-black hover:text-white hover:border-black transition-colors"
          title="X'te Paylaş"
        >
          <Twitter className="h-4 w-4" />
          <span className="hidden sm:inline">X</span>
        </Button>

        {/* LinkedIn */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("linkedin")}
          className="gap-2 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-colors"
          title="LinkedIn'de Paylaş"
        >
          <Linkedin className="h-4 w-4" />
          <span className="hidden sm:inline">LinkedIn</span>
        </Button>

        {/* WhatsApp */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("whatsapp")}
          className="gap-2 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-colors"
          title="WhatsApp'ta Paylaş"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </Button>

        {/* Telegram */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("telegram")}
          className="gap-2 hover:bg-[#0088cc] hover:text-white hover:border-[#0088cc] transition-colors"
          title="Telegram'da Paylaş"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Telegram</span>
        </Button>

        {/* Copy Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-2"
          title="Linki Kopyala"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="hidden sm:inline text-green-500">
                Kopyalandı!
              </span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Kopyala</span>
            </>
          )}
        </Button>

        {/* Native Share (Mobile) */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          className="gap-2 sm:hidden"
          title="Paylaş"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
