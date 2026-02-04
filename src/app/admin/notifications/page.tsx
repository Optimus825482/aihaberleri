"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Bell, Loader2, Smartphone } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";

export default function NotificationsPage() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        url: "https://aihaberleri.org",
    });
    const { toast } = useToast();

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/notifications/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Başarılı",
                    description: `${data.sent || 0} aboneye bildirim gönderildi`,
                });
                setFormData({ ...formData, message: "", title: "" });
            } else {
                toast({
                    title: "Hata",
                    description: data.error || "Gönderim başarısız",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Hata",
                description: "Bir hata oluştu: " + (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight">
                        Push <span className="text-primary italic">Bildirimler</span>
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Tüm kayıtlı cihazlara anlık bildirim gönderin
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Push Form Card */}
                    <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                <Bell className="h-5 w-5" />
                                Push Bildirim Gönder
                            </CardTitle>
                            <CardDescription>
                                Tüm kayıtlı cihazlara anlık bildirim gönderin
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSend} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="push-title">Bildirim Başlığı</Label>
                                    <Input
                                        id="push-title"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        placeholder="Örn: 🚨 Son Dakika: GPT-5 Duyuruldu!"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="push-message">Mesaj İçeriği</Label>
                                    <Textarea
                                        id="push-message"
                                        value={formData.message}
                                        onChange={(e) =>
                                            setFormData({ ...formData, message: e.target.value })
                                        }
                                        placeholder="Kullanıcıların göreceği kısa özet..."
                                        required
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="push-url">Yönlendirilecek URL</Label>
                                    <Input
                                        id="push-url"
                                        value={formData.url}
                                        onChange={(e) =>
                                            setFormData({ ...formData, url: e.target.value })
                                        }
                                        placeholder="https://aihaberleri.org/news/..."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Bildirime tıklayan kullanıcı bu adrese gidecek.
                                    </p>
                                </div>

                                <Button disabled={loading} type="submit" className="w-full">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Tüm Cihazlara Gönder
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Preview Card */}
                    <Card className="bg-muted/50 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Smartphone className="w-5 h-5" />
                                Önizleme
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center items-center">
                            <div className="w-[280px] bg-background border rounded-2xl shadow-2xl overflow-hidden">
                                <div className="h-6 bg-muted border-b flex items-center justify-center text-[10px] text-muted-foreground">
                                    Phone Screen
                                </div>
                                <div className="p-4 h-[350px] relative">
                                    {/* Mock Notification */}
                                    <div className="absolute top-4 left-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-xl p-3 shadow-lg border animate-in slide-in-from-top duration-700">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                                                <Bell className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-sm truncate pr-2">
                                                        {formData.title || "Bildirim Başlığı"}
                                                    </h4>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        Şimdi
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                    {formData.message ||
                                                        "Mesaj içeriği burada görünecek..."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Info Card */}
                <Card className="border-orange-500/20 bg-orange-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            🔔 Push Bildirim Sistemi Hakkında
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>• Kullanıcılar site üzerinden abone olabilir</p>
                        <p>• Yeni haberler yayınlandığında otomatik bildirim gider</p>
                        <p>• Manuel bildirim önemli duyurular için kullanılabilir</p>
                        <p>• Firebase Cloud Messaging (FCM) kullanılır</p>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
