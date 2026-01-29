"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface SchedulePublishProps {
    articleId: string;
    currentSchedule?: Date | null;
    onScheduled?: () => void;
}

/**
 * Schedule Publishing Component
 * Set future publish date/time for articles
 */
export function SchedulePublish({
    articleId,
    currentSchedule,
    onScheduled,
}: SchedulePublishProps) {
    const [scheduledDate, setScheduledDate] = useState(
        currentSchedule ? format(new Date(currentSchedule), "yyyy-MM-dd") : ""
    );
    const [scheduledTime, setScheduledTime] = useState(
        currentSchedule ? format(new Date(currentSchedule), "HH:mm") : "12:00"
    );
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSchedule = async () => {
        if (!scheduledDate || !scheduledTime) {
            toast({
                title: "Hata ❌",
                description: "Tarih ve saat seçmelisiniz",
                variant: "destructive",
            });
            return;
        }

        const publishAt = new Date(`${scheduledDate}T${scheduledTime}`);

        if (publishAt <= new Date()) {
            toast({
                title: "Hata ❌",
                description: "Gelecek bir tarih seçmelisiniz",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`/api/admin/articles/${articleId}/schedule`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publishAt: publishAt.toISOString() }),
            });

            if (!response.ok) {
                throw new Error("Schedule failed");
            }

            toast({
                title: "Başarılı ✅",
                description: `Makale ${format(publishAt, "PPp", { locale: tr })} tarihinde yayınlanacak`,
            });

            onScheduled?.();
        } catch (error) {
            toast({
                title: "Hata ❌",
                description: "Zamanlama başarısız oldu",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSchedule = async () => {
        setLoading(true);

        try {
            const response = await fetch(`/api/admin/articles/${articleId}/schedule`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Cancel failed");
            }

            toast({
                title: "Başarılı ✅",
                description: "Zamanlama iptal edildi",
            });

            setScheduledDate("");
            setScheduledTime("12:00");
            onScheduled?.();
        } catch (error) {
            toast({
                title: "Hata ❌",
                description: "İptal işlemi başarısız oldu",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Zamanlanmış Yayın
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {currentSchedule && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    Zamanlanmış
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(currentSchedule), "PPp", { locale: tr })}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelSchedule}
                                disabled={loading}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="scheduled-date">Yayın Tarihi</Label>
                        <Input
                            id="scheduled-date"
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={format(new Date(), "yyyy-MM-dd")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="scheduled-time">Yayın Saati</Label>
                        <Input
                            id="scheduled-time"
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                        />
                    </div>
                </div>

                <Button
                    onClick={handleSchedule}
                    disabled={loading || !scheduledDate}
                    className="w-full"
                >
                    <Calendar className="h-4 w-4 mr-2" />
                    {loading ? "İşleniyor..." : "Yayını Zamanla"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                    Makale belirtilen tarih ve saatte otomatik olarak yayınlanacak
                </p>
            </CardContent>
        </Card>
    );
}
