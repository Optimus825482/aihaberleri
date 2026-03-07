"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import {
    Send,
    Mail,
    Eye,
    Calendar,
    RefreshCw,
    Loader2,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    FileText,
    Image as ImageIcon,
    Trash2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { usePageVisibility } from "@/hooks/usePageVisibility";

// =====================================================
// INTERFACES
// =====================================================

interface NewsletterPreview {
    subject: string;
    articleCount: number;
    articles: Array<{
        id: string;
        title: string;
        excerpt: string;
        category: string;
        publishedAt: string;
        imageUrl: string | null;
    }>;
    subscriberCount: number;
    scheduledTime: string;
}

interface NewsletterLog {
    id: string;
    sentAt: string;
    subject: string;
    recipientCount: number;
    successCount: number;
    failedCount: number;
    status: "success" | "partial" | "failed";
    articleCount: number;
}

interface Subscriber {
    id: string;
    email: string;
    subscribedAt: string;
    status: "active" | "unsubscribed";
    source: string;
}

// =====================================================
// NEWSLETTER PREVIEW COMPONENT
// =====================================================

function NewsletterPreviewSection() {
    const [preview, setPreview] = useState<NewsletterPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const isPageVisible = usePageVisibility();

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/newsletter/preview");
            const data = await res.json();
            if (data.success) {
                setPreview(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch preview:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isPageVisible) {
            return undefined;
        }

        fetchPreview();
        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                fetchPreview();
            }
        }, 300000);
        return () => clearInterval(interval);
    }, [isPageVisible]);

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (!preview || preview.articleCount === 0) {
        return (
            <Card className="border-amber-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-amber-500" />
                        Bugünkü Bülten Önizlemesi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Bugün henüz yayınlanan haber yok.</p>
                        <p className="text-sm mt-2">Haberler yayınlandıkça burada görünecek.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Eye className="h-5 w-5" />
                            Bugünkü Bülten Önizlemesi
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Saat 19:00'da {preview.subscriberCount} aboneye gönderilecek
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchPreview}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Email Subject */}
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <div className="text-xs text-muted-foreground mb-1">Konu Satırı</div>
                    <div className="font-medium">{preview.subject}</div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {preview.articleCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Haber</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {preview.subscriberCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Abone</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <div className="text-lg font-bold text-green-600">19:00</div>
                        <div className="text-xs text-muted-foreground">Gönderim</div>
                    </div>
                </div>

                {/* Articles List with Thumbnails */}
                <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                        Dahil Edilecek Haberler (Thumbnail'lı)
                    </div>
                    {preview.articles.map((article, idx) => (
                        <div
                            key={article.id}
                            className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                {/* Thumbnail */}
                                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                    {article.imageUrl ? (
                                        <img
                                            src={article.imageUrl}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2">
                                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium line-clamp-2 text-sm">
                                                {article.title}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {article.category}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(article.publishedAt).toLocaleTimeString(
                                                        "tr-TR",
                                                        { hour: "2-digit", minute: "2-digit" }
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// =====================================================
// NEWSLETTER LOGS COMPONENT
// =====================================================

function NewsletterLogsSection() {
    const [logs, setLogs] = useState<NewsletterLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/newsletter/logs");
            const data = await res.json();
            if (data.success) {
                setLogs(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz gönderim logu yok</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Tarih</TableHead>
                        <TableHead className="font-bold">Konu</TableHead>
                        <TableHead className="font-bold w-[100px]">Haber</TableHead>
                        <TableHead className="font-bold w-[100px]">Alıcı</TableHead>
                        <TableHead className="font-bold w-[100px]">Başarılı</TableHead>
                        <TableHead className="font-bold w-[100px]">Durum</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30">
                            <TableCell>
                                <span className="text-sm">
                                    {formatDistanceToNow(new Date(log.sentAt), {
                                        addSuffix: true,
                                        locale: tr,
                                    })}
                                </span>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm font-medium line-clamp-1">
                                    {log.subject}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{log.articleCount}</Badge>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm">{log.recipientCount}</span>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm text-green-600">{log.successCount}</span>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={
                                        log.status === "success"
                                            ? "default"
                                            : log.status === "partial"
                                                ? "secondary"
                                                : "destructive"
                                    }
                                >
                                    {log.status === "success" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                    {log.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                                    {log.status === "success"
                                        ? "Başarılı"
                                        : log.status === "partial"
                                            ? "Kısmi"
                                            : "Başarısız"}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// =====================================================
// SUBSCRIBERS LIST COMPONENT
// =====================================================

function SubscribersSection() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; email: string } | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/newsletter/subscribers");
            const data = await res.json();
            if (data.success) {
                setSubscribers(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch subscribers:", error);
        } finally {
            setLoading(false);
        }
    };

    const removeSubscriber = async (id: string, email: string) => {
        // Show confirm dialog
        setDeleteConfirm({ id, email });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        const { id } = deleteConfirm;
        setDeleteConfirm(null);

        try {
            const res = await fetch(`/api/admin/newsletter/subscribers?id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                toast({ title: "Başarılı", description: "Abone silindi" });
                fetchSubscribers();
            } else {
                toast({
                    title: "Hata",
                    description: data.error || "Silinemedi",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Hata",
                description: "Bir hata oluştu",
                variant: "destructive",
            });
        }
    };

    const cancelDelete = () => {
        setDeleteConfirm(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && cancelDelete()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aboneyi Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteConfirm?.email} adresli aboneyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelDelete}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Evet, Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-500" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {subscribers.filter((s) => s.status === "active").length}
                                </div>
                                <div className="text-xs text-muted-foreground">Aktif Abone</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-500/10 border-orange-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-orange-500" />
                            <div>
                                <div className="text-2xl font-bold">{subscribers.length}</div>
                                <div className="text-xs text-muted-foreground">Toplam</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            {subscribers.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">E-posta</TableHead>
                                <TableHead className="font-bold w-[150px]">Kayıt Tarihi</TableHead>
                                <TableHead className="font-bold w-[100px]">Kaynak</TableHead>
                                <TableHead className="font-bold w-[100px]">Durum</TableHead>
                                <TableHead className="font-bold w-[80px]">İşlem</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscribers.map((subscriber) => (
                                <TableRow key={subscriber.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <span className="font-medium">{subscriber.email}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(subscriber.subscribedAt), {
                                                addSuffix: true,
                                                locale: tr,
                                            })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {subscriber.source || "Web"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={subscriber.status === "active" ? "default" : "secondary"}
                                        >
                                            {subscriber.status === "active" ? "Aktif" : "Pasif"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSubscriber(subscriber.id, subscriber.email)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz abone yok</p>
                </div>
            )}
        </div>
        </>
    );
}

// =====================================================
// SEND CONTROLS COMPONENT
// =====================================================

function SendControlsSection() {
    const [status, setStatus] = useState<{
        lastSent: string | null;
        subscriberCount: number;
        todayArticleCount: number;
    } | null>(null);
    const [sending, setSending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch("/api/admin/newsletter/send-daily");
            const data = await res.json();
            if (data.success) {
                setStatus(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch newsletter status:", error);
        }
    };

    const triggerNewsletter = async () => {
        setSending(true);
        try {
            const res = await fetch("/api/admin/newsletter/send-daily", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ useQueue: true }),
            });
            const data = await res.json();

            if (data.success) {
                toast({
                    title: "Başarılı",
                    description: "Newsletter kuyruğa eklendi",
                });
                fetchStatus();
            } else {
                toast({
                    title: "Hata",
                    description: data.error || "Newsletter gönderilemedi",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Hata",
                description: "Bir hata oluştu",
                variant: "destructive",
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Send className="h-5 w-5" />
                    Gönderim Kontrolü
                </CardTitle>
                <CardDescription>
                    Her gün saat 19:00'da otomatik günlük bülten
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div className="text-lg font-bold">{status?.subscriberCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Abone</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <div className="text-lg font-bold">{status?.todayArticleCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Bugünkü Haber</div>
                    </div>
                </div>

                <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="text-sm text-muted-foreground">Planlanan Gönderim</div>
                    <div className="font-medium">Her gün 19:00 (Türkiye)</div>
                    {status?.lastSent && (
                        <div className="text-xs text-muted-foreground mt-1">
                            Son: {new Date(status.lastSent).toLocaleString("tr-TR")}
                        </div>
                    )}
                </div>

                <Button
                    onClick={triggerNewsletter}
                    disabled={sending}
                    className="w-full"
                    variant="default"
                >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? "Gönderiliyor..." : "Şimdi Gönder"}
                </Button>
            </CardContent>
        </Card>
    );
}

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================

export default function NewsletterPage() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight">
                        <span className="text-primary italic">Newsletter</span> Yönetimi
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        E-posta bülteni önizleme, gönderim logları ve abone listesi
                    </p>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="preview" className="space-y-6">
                    <TabsList className="grid w-full max-w-[500px] grid-cols-3">
                        <TabsTrigger value="preview" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Önizleme
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Loglar
                        </TabsTrigger>
                        <TabsTrigger value="subscribers" className="gap-2">
                            <Users className="h-4 w-4" />
                            Aboneler
                        </TabsTrigger>
                    </TabsList>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <NewsletterPreviewSection />
                            <SendControlsSection />
                        </div>

                        {/* Info Card */}
                        <Card className="border-blue-500/20 bg-blue-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    📧 Newsletter Sistemi Hakkında
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>• Her gün saat 19:00'da (Türkiye) otomatik gönderim yapılır</p>
                                <p>• Sadece o gün yayınlanan haberler dahil edilir</p>
                                <p>• Haber görselleri thumbnail olarak e-postaya eklenir</p>
                                <p>• Manuel gönderim butonu acil durumlar içindir</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Logs Tab */}
                    <TabsContent value="logs" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    Gönderim Logları
                                </CardTitle>
                                <CardDescription>
                                    Tüm newsletter gönderim geçmişi
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <NewsletterLogsSection />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Subscribers Tab */}
                    <TabsContent value="subscribers" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    Abone Listesi
                                </CardTitle>
                                <CardDescription>
                                    Newsletter abonelerini yönetin
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SubscribersSection />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
