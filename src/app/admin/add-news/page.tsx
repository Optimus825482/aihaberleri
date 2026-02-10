"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardPaste, Search, RefreshCw, Plus, ExternalLink, CheckCircle, AlertCircle, Sparkles, Globe, Newspaper, BookOpen, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ExistingArticle {
    id: string;
    title: string;
    slug: string;
    publishedAt: string;
    sourceUrl: string;
    categoryName: string;
    viewCount: number;
}

interface TopicAnalysis {
    topic: string;
    summary: string;
    language: string;
    sourceTitle: string;
    sourceDescription: string;
}

interface CheckResult {
    hasSimilar: boolean;
    topic: TopicAnalysis;
    similarArticles: ExistingArticle[];
}

interface DeepAnalysisSource {
    title: string;
    url: string;
    snippet: string;
    source: string;
}

interface DeepAnalysisProgress {
    step: string;
    message: string;
    sources?: DeepAnalysisSource[];
}

export default function AddNewsPage() {
    const [url, setUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<DeepAnalysisProgress[]>([]);
    const [createdArticle, setCreatedArticle] = useState<{ title: string; slug: string } | null>(null);
    const { toast } = useToast();

    // Paste from clipboard
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setUrl(text.trim());
                toast({
                    title: "Yapıştırıldı",
                    description: "URL panodan alındı",
                });
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Pano erişimi reddedildi",
            });
        }
    };

    // Analyze URL and check for similar articles
    const handleAnalyze = async () => {
        if (!url) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Lütfen bir URL girin",
            });
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            toast({
                variant: "destructive",
                title: "Geçersiz URL",
                description: "Lütfen geçerli bir URL girin (https://...)",
            });
            return;
        }

        setIsAnalyzing(true);
        setCheckResult(null);
        setCreatedArticle(null);
        setAnalysisProgress([]);

        try {
            // Step 1: Extract topic from URL
            setAnalysisProgress([{ step: "extract", message: "🔍 URL analiz ediliyor ve konu çıkarılıyor..." }]);

            const extractRes = await fetch("/api/admin/news/extract-topic", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            if (!extractRes.ok) {
                const error = await extractRes.json();
                throw new Error(error.error || "Konu çıkarma başarısız");
            }

            const topicData: TopicAnalysis = await extractRes.json();

            setAnalysisProgress((prev) => [
                ...prev,
                { step: "topic", message: `✅ Konu belirlendi: "${topicData.topic}"` },
            ]);

            // Step 2: Check database for similar articles
            setAnalysisProgress((prev) => [
                ...prev,
                { step: "check", message: "📚 Veritabanı kontrol ediliyor..." },
            ]);

            const checkRes = await fetch("/api/admin/news/check-topic", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: topicData.topic, sourceUrl: url }),
            });

            if (!checkRes.ok) {
                const error = await checkRes.json();
                throw new Error(error.error || "Veritabanı kontrolü başarısız");
            }

            const checkData = await checkRes.json();

            setCheckResult({
                hasSimilar: checkData.hasSimilar,
                topic: topicData,
                similarArticles: checkData.similarArticles || [],
            });

            if (checkData.hasSimilar) {
                setAnalysisProgress((prev) => [
                    ...prev,
                    { step: "found", message: `⚠️ Bu konuda ${checkData.similarArticles.length} benzer haber bulundu` },
                ]);
            } else {
                setAnalysisProgress((prev) => [
                    ...prev,
                    { step: "notfound", message: "✨ Bu konuda henüz haber yapılmamış!" },
                ]);
            }
        } catch (error) {
            console.error("Analysis error:", error);
            toast({
                variant: "destructive",
                title: "Analiz Hatası",
                description: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Create article with deep analysis
    const handleCreateArticle = async (forceNew: boolean = false) => {
        if (!checkResult?.topic) return;

        setIsCreating(true);
        setCreatedArticle(null);
        setAnalysisProgress([]);

        try {
            // Deep Analysis Progress Updates
            setAnalysisProgress([{ step: "start", message: "🚀 Deep Analysis başlatılıyor..." }]);

            const response = await fetch("/api/admin/news/deep-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url,
                    topic: checkResult.topic,
                    forceNew,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Haber oluşturma başarısız");
            }

            // Handle streaming response for progress
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let buffer = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.type === "progress") {
                                    setAnalysisProgress((prev) => [...prev, { step: data.step, message: data.message, sources: data.sources }]);
                                } else if (data.type === "complete") {
                                    setCreatedArticle({ title: data.title, slug: data.slug });
                                    toast({
                                        title: "Başarılı!",
                                        description: "Haber oluşturuldu ve yayınlandı",
                                    });
                                } else if (data.type === "error") {
                                    throw new Error(data.message);
                                }
                            } catch (e) {
                                // Skip invalid JSON lines
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Create error:", error);
            toast({
                variant: "destructive",
                title: "Oluşturma Hatası",
                description: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const resetState = () => {
        setUrl("");
        setCheckResult(null);
        setCreatedArticle(null);
        setAnalysisProgress([]);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">🚀 Yeni Haber Ekle</h1>
                        <p className="text-muted-foreground mt-1">
                            Herhangi bir haber linkini yapıştırın, AI deep analysis ile zenginleştirip yayınlayalım
                        </p>
                    </div>
                    {(checkResult || createdArticle) && (
                        <Button variant="outline" onClick={resetState}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Yeni Analiz
                        </Button>
                    )}
                </div>

                {/* URL Input Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            Haber URL'si
                        </CardTitle>
                        <CardDescription>
                            Türkçe veya İngilizce herhangi bir haber linkini yapıştırın
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://techcrunch.com/2024/01/15/openai-announces..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex-1"
                                disabled={isAnalyzing || isCreating}
                            />
                            <Button
                                variant="outline"
                                onClick={handlePaste}
                                disabled={isAnalyzing || isCreating}
                            >
                                <ClipboardPaste className="w-4 h-4 mr-2" />
                                Yapıştır
                            </Button>
                            <Button
                                onClick={handleAnalyze}
                                disabled={!url || isAnalyzing || isCreating}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analiz...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4 mr-2" />
                                        Analiz Et
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Progress Display */}
                {analysisProgress.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                İşlem Durumu
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {analysisProgress.map((progress, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                        {(isAnalyzing || isCreating) && index === analysisProgress.length - 1 ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-primary mt-0.5" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium">{progress.message}</p>
                                            {progress.sources && progress.sources.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {progress.sources.map((source, i) => (
                                                        <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <ExternalLink className="w-3 h-3" />
                                                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-md">
                                                                {source.title}
                                                            </a>
                                                            <Badge variant="outline" className="text-xs">{source.source}</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Topic Analysis Result */}
                {checkResult && !createdArticle && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Konu Analizi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Belirlenen Konu</label>
                                    <p className="text-lg font-semibold">{checkResult.topic.topic}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Dil</label>
                                    <Badge variant="secondary">
                                        {checkResult.topic.language === "tr" ? "🇹🇷 Türkçe" : "🇺🇸 İngilizce"}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Kaynak Başlık</label>
                                <p className="text-sm">{checkResult.topic.sourceTitle}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Özet</label>
                                <p className="text-sm text-muted-foreground">{checkResult.topic.summary}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Similar Articles Found */}
                {checkResult?.hasSimilar && checkResult.similarArticles.length > 0 && !createdArticle && (
                    <Card className="border-yellow-500/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-600">
                                <AlertCircle className="w-5 h-5" />
                                Bu Konuda Mevcut Haberler
                            </CardTitle>
                            <CardDescription>
                                Bu konuyla ilgili daha önce yayınlanan haberler bulundu
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Recreate Button */}
                            <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                                <div>
                                    <p className="font-medium">Yeniden Haber Yap</p>
                                    <p className="text-sm text-muted-foreground">
                                        Deep Analysis ile güncel kaynaklardan yeni bir haber oluştur
                                    </p>
                                </div>
                                <Button
                                    onClick={() => handleCreateArticle(true)}
                                    disabled={isCreating}
                                    className="bg-yellow-600 hover:bg-yellow-700"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Oluşturuluyor...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Yeniden Yap
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Existing Articles List */}
                            <div className="space-y-3">
                                {checkResult.similarArticles.map((article) => (
                                    <div
                                        key={article.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{article.title}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                <span>
                                                    📅 {format(new Date(article.publishedAt), "d MMMM yyyy", { locale: tr })}
                                                </span>
                                                <Badge variant="outline">{article.categoryName}</Badge>
                                                <span>👁️ {article.viewCount} görüntülenme</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                                title="Haberi görüntüle"
                                            >
                                                <a href={`/news/${article.slug}`} target="_blank" rel="noopener noreferrer" title="Haberi görüntüle">
                                                    <ExternalLink className="w-4 h-4" />
                                                    <span className="sr-only">Haberi görüntüle</span>
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* No Similar Articles - Create New */}
                {checkResult && !checkResult.hasSimilar && !createdArticle && (
                    <Card className="border-green-500/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600">
                                <Sparkles className="w-5 h-5" />
                                Yeni Haber Fırsatı!
                            </CardTitle>
                            <CardDescription>
                                Bu konuda henüz haber yapılmamış. Deep Analysis ile kapsamlı bir haber oluşturalım mı?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                                <div>
                                    <p className="font-medium">Deep Analysis ile Haber Oluştur</p>
                                    <p className="text-sm text-muted-foreground">
                                        Global kaynaklardan ek bilgi toplayarak zenginleştirilmiş haber
                                    </p>
                                </div>
                                <Button
                                    onClick={() => handleCreateArticle(false)}
                                    disabled={isCreating}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Oluşturuluyor...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Evet, Oluştur
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Success - Article Created */}
                {createdArticle && (
                    <Card className="border-green-500">
                        <CardContent className="pt-6">
                            <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-green-700">Haber başarıyla oluşturuldu ve yayınlandı!</p>
                                            <p className="text-sm mt-1">{createdArticle.title}</p>
                                        </div>
                                        <Button asChild variant="outline" className="border-green-500 text-green-700">
                                            <a href={`/news/${createdArticle.slug}`} target="_blank" rel="noopener noreferrer" title="Haberi görüntüle">
                                                <Newspaper className="w-4 h-4 mr-2" />
                                                Haberi Görüntüle
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Help Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">💡 Nasıl Çalışır?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary">1</span>
                                </div>
                                <h4 className="font-medium">URL Yapıştır</h4>
                                <p className="text-sm text-muted-foreground">
                                    Herhangi bir haber sitesinden link kopyalayıp yapıştırın
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary">2</span>
                                </div>
                                <h4 className="font-medium">AI Analizi</h4>
                                <p className="text-sm text-muted-foreground">
                                    Konu çıkarılır ve veritabanında benzer haberler aranır
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary">3</span>
                                </div>
                                <h4 className="font-medium">Deep Analysis</h4>
                                <p className="text-sm text-muted-foreground">
                                    Global kaynaklardan bilgi toplanır ve zengin haber oluşturulur
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
