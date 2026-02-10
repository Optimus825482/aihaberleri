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
    bluesky: `https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`,
    mastodon: `https://mastodonshare.com/?text=${encodedTitle}%20${encodedUrl}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
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

        {/* Bluesky */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("bluesky")}
          className="gap-2 hover:bg-[#0085FF] hover:text-white hover:border-[#0085FF] transition-colors"
          title="Bluesky'da Paylaş"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 568 501"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 57.9464C568 75.2916 558.055 203.659 552.222 224.501C531.947 296.954 458.067 315.434 392.347 304.249C507.222 323.8 536.444 388.56 473.333 453.32C353.473 576.312 301.061 422.461 287.631 383.039C285.169 375.812 284.017 372.431 284 375.306C283.983 372.431 282.831 375.812 280.369 383.039C266.939 422.461 214.527 576.312 94.6667 453.32C31.5556 388.56 60.7778 323.8 175.653 304.249C109.933 315.434 36.0533 296.954 15.7778 224.501C9.94525 203.659 0 75.2916 0 57.9464C0 -28.9064 76.1345 -1.61183 123.121 33.6637Z" />
          </svg>
          <span className="hidden sm:inline">Bluesky</span>
        </Button>

        {/* Mastodon */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("mastodon")}
          className="gap-2 hover:bg-[#6364FF] hover:text-white hover:border-[#6364FF] transition-colors"
          title="Mastodon'da Paylaş"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054 19.648 19.648 0 0 0 4.636.536c.374 0 .748 0 1.125-.01 1.83-.042 3.755-.162 5.528-.56.047-.011.09-.023.132-.038 2.4-.558 4.682-2.307 4.912-6.587.009-.166.019-1.724.019-1.895.001-.593.197-4.203-.031-6.428zM19.955 13.7h-2.64V8.312c0-1.137-.478-1.714-1.435-1.714-1.057 0-1.587.685-1.587 2.04v2.95h-2.626v-2.95c0-1.355-.53-2.04-1.586-2.04-.957 0-1.436.577-1.436 1.714V13.7H6.005V8.094c0-1.137.29-2.04.873-2.71.6-.67 1.386-1.013 2.362-1.013 1.13 0 1.986.434 2.556 1.302l.551.924.551-.924c.57-.868 1.426-1.302 2.556-1.302.976 0 1.763.344 2.362 1.013.583.67.873 1.573.873 2.71V13.7z" />
          </svg>
          <span className="hidden sm:inline">Mastodon</span>
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
