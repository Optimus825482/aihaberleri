import { toast } from "@/hooks/use-toast";

/**
 * Admin Panel Toast Helpers
 * Provides consistent toast notifications across the admin panel
 */

export const adminToast = {
  success: (title: string, description?: string) => {
    toast({
      title: `✅ ${title}`,
      description,
      duration: 3000,
    });
  },

  error: (title: string, description?: string) => {
    toast({
      variant: "destructive",
      title: `❌ ${title}`,
      description,
      duration: 5000,
    });
  },

  warning: (title: string, description?: string) => {
    toast({
      title: `⚠️ ${title}`,
      description,
      duration: 4000,
    });
  },

  info: (title: string, description?: string) => {
    toast({
      title: `ℹ️ ${title}`,
      description,
      duration: 3000,
    });
  },

  loading: (title: string, description?: string) => {
    return toast({
      title: `⏳ ${title}`,
      description,
      duration: Infinity, // Will be dismissed manually
    });
  },

  // Common admin actions
  saved: (item?: string) => {
    adminToast.success(
      "Kaydedildi",
      item ? `${item} başarıyla kaydedildi.` : undefined,
    );
  },

  deleted: (item?: string) => {
    adminToast.success(
      "Silindi",
      item ? `${item} başarıyla silindi.` : undefined,
    );
  },

  updated: (item?: string) => {
    adminToast.success(
      "Güncellendi",
      item ? `${item} başarıyla güncellendi.` : undefined,
    );
  },

  created: (item?: string) => {
    adminToast.success(
      "Oluşturuldu",
      item ? `${item} başarıyla oluşturuldu.` : undefined,
    );
  },

  copied: () => {
    adminToast.success("Kopyalandı", "Panoya kopyalandı.");
  },

  apiError: (error?: string) => {
    adminToast.error(
      "API Hatası",
      error || "Bir hata oluştu. Lütfen tekrar deneyin.",
    );
  },

  networkError: () => {
    adminToast.error(
      "Bağlantı Hatası",
      "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.",
    );
  },

  unauthorized: () => {
    adminToast.error("Yetkisiz", "Bu işlem için yetkiniz bulunmuyor.");
  },

  agentTriggered: () => {
    adminToast.success(
      "Agent Tetiklendi",
      "Otonom haber sistemi çalışmaya başladı.",
    );
  },

  agentError: () => {
    adminToast.error(
      "Agent Hatası",
      "Agent başlatılamadı. Lütfen tekrar deneyin.",
    );
  },
};
