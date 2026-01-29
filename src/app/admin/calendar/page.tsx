"use client";

import { useEffect, useState } from "react";
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
import { Calendar, Clock, Edit, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

interface ArticleEvent {
    id: string;
    title: string;
    status: string;
    publishedAt: string | null;
    scheduledPublishAt: string | null;
    category: {
        name: string;
        slug: string;
    };
}

export default function ContentCalendarPage() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [articles, setArticles] = useState<ArticleEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchArticles();
    }, [currentDate]);

    const fetchArticles = async () => {
        try {
            const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
            const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

            const res = await fetch(
                `/api/admin/articles?startDate=${start}&endDate=${end}`
            );
            const data = await res.json();

            if (data.success) {
                setArticles(data.articles);
            }
        } catch (error) {
            console.error("Failed to fetch articles:", error);
        } finally {
            setLoading(false);
        }
    };

    const getArticlesForDate = (date: Date) => {
        return articles.filter((article) => {
            const articleDate = article.scheduledPublishAt
                ? new Date(article.scheduledPublishAt)
                : article.publishedAt
                    ? new Date(article.publishedAt)
                    : null;

            return articleDate && isSameDay(articleDate, date);
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PUBLISHED":
                return "bg-green-500";
            case "DRAFT":
                return "bg-gray-500";
            case "SCHEDULED":
                return "bg-blue-500";
            default:
                return "bg-gray-500";
        }
    };

    const getStatusLabel = (article: ArticleEvent) => {
        if (article.scheduledPublishAt) return "Zamanlanmış";
        if (article.status === "PUBLISHED") return "Yayında";
        return "Taslak";
    };

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const handlePrevMonth = () => {
        setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">İçerik Takvimi</h1>
                        <p className="text-muted-foreground mt-2">
                            Yayınlanmış ve zamanlanmış makaleleri takvim görünümünde inceleyin
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrevMonth}>
                            ← Önceki Ay
                        </Button>
                        <Button variant="outline" onClick={handleToday}>
                            Bugün
                        </Button>
                        <Button variant="outline" onClick={handleNextMonth}>
                            Sonraki Ay →
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Toplam Makale
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{articles.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Yayında</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {articles.filter((a) => a.status === "PUBLISHED").length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Zamanlanmış</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {articles.filter((a) => a.scheduledPublishAt).length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Taslak</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-600">
                                {articles.filter((a) => a.status === "DRAFT").length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Calendar */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {format(currentDate, "MMMM yyyy", { locale: tr })}
                        </CardTitle>
                        <CardDescription>
                            Makalelere tıklayarak detaylarını görüntüleyin
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-2">
                            {/* Weekday headers */}
                            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-sm font-medium text-muted-foreground p-2"
                                >
                                    {day}
                                </div>
                            ))}

                            {/* Calendar days */}
                            {monthDays.map((day, index) => {
                                const dayArticles = getArticlesForDate(day);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={index}
                                        className={`
                      min-h-24 border rounded-lg p-2 
                      ${isToday ? "bg-primary/5 border-primary" : ""}
                      ${!isSameMonth(day, currentDate) ? "opacity-50" : ""}
                    `}
                                    >
                                        <div className="text-sm font-medium mb-1">
                                            {format(day, "d")}
                                        </div>

                                        <div className="space-y-1">
                                            {dayArticles.slice(0, 3).map((article) => (
                                                <div
                                                    key={article.id}
                                                    className={`
                            text-xs p-1 rounded cursor-pointer
                            hover:opacity-80 transition-opacity
                            ${getStatusColor(article.status)} text-white
                          `}
                                                    onClick={() =>
                                                        router.push(`/admin/articles/${article.id}/edit`)
                                                    }
                                                    title={article.title}
                                                >
                                                    <div className="truncate">{article.title}</div>
                                                </div>
                                            ))}

                                            {dayArticles.length > 3 && (
                                                <div className="text-xs text-muted-foreground">
                                                    +{dayArticles.length - 3} daha
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Legend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Renk Açıklamaları</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                <span className="text-sm">Yayında</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-blue-500"></div>
                                <span className="text-sm">Zamanlanmış</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-gray-500"></div>
                                <span className="text-sm">Taslak</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Scheduled Articles */}
                <Card>
                    <CardHeader>
                        <CardTitle>Yaklaşan Yayınlar</CardTitle>
                        <CardDescription>
                            Önümüzdeki günlerde yayınlanacak makaleler
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {articles
                                .filter((a) => a.scheduledPublishAt)
                                .sort(
                                    (a, b) =>
                                        new Date(a.scheduledPublishAt!).getTime() -
                                        new Date(b.scheduledPublishAt!).getTime()
                                )
                                .slice(0, 5)
                                .map((article) => (
                                    <div
                                        key={article.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                                        onClick={() =>
                                            router.push(`/admin/articles/${article.id}/edit`)
                                        }
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-medium">{article.title}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(
                                                        new Date(article.scheduledPublishAt!),
                                                        "d MMMM yyyy, HH:mm",
                                                        { locale: tr }
                                                    )}
                                                </span>
                                                <Badge variant="secondary">
                                                    {article.category.name}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                            {articles.filter((a) => a.scheduledPublishAt).length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="mx-auto h-12 w-12 opacity-50" />
                                    <p className="mt-2">Zamanlanmış makale bulunmuyor</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
