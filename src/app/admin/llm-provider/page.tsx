"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Bot,
    Save,
    Trash2,
    Plus,
    CheckCircle2,
    XCircle,
    Link2,
    Key,
    Cpu,
    Loader2,
    RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LlmProvider {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
}

interface ProviderForm {
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    isActive: boolean;
}

const EMPTY_FORM: ProviderForm = {
    name: "",
    baseUrl: "",
    apiKey: "",
    model: "",
    isActive: false,
};

export default function LlmProviderPage() {
    const { toast } = useToast();
    const [providers, setProviders] = useState<LlmProvider[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const fetchProviders = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/llm-provider");
            const data = await res.json();
            setProviders(data.providers || []);
            setActiveId(data.active?.id || null);
        } catch (err) {
            console.error("Failed to fetch providers:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast({ title: "Hata", description: "Provider adı zorunludur", variant: "destructive" });
            return;
        }
        if (!form.baseUrl.trim()) {
            toast({ title: "Hata", description: "Base URL zorunludur", variant: "destructive" });
            return;
        }
        if (!form.apiKey.trim()) {
            toast({ title: "Hata", description: "API Key zorunludur", variant: "destructive" });
            return;
        }
        if (!form.model.trim()) {
            toast({ title: "Hata", description: "Model adı zorunludur", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/llm-provider", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                toast({
                    title: "Hata",
                    description: data.error || "Kaydedilemedi",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Başarılı",
                description: `${form.name} kaydedildi`,
            });

            setForm(EMPTY_FORM);
            setEditingId(null);
            setShowForm(false);
            setTestResult(null);
            await fetchProviders();
        } catch {
            toast({ title: "Hata", description: "Sunucu hatası", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (provider: LlmProvider) => {
        setForm({
            name: provider.name,
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: provider.model,
            isActive: activeId === provider.id,
        });
        setEditingId(provider.id);
        setShowForm(true);
        setTestResult(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu provider'ı silmek istediğine emin misin?")) return;

        try {
            const res = await fetch("/api/admin/llm-provider", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) {
                toast({ title: "Hata", description: "Silinemedi", variant: "destructive" });
                return;
            }

            toast({ title: "Silindi", description: "Provider kaldırıldı" });
            await fetchProviders();
        } catch {
            toast({ title: "Hata", description: "Sunucu hatası", variant: "destructive" });
        }
    };

    const handleActivate = async (id: string) => {
        const provider = providers.find((p) => p.id === id);
        if (!provider) return;

        setForm({
            name: provider.name,
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: provider.model,
            isActive: true,
        });
        setEditingId(id);
        setSaving(true);

        try {
            const res = await fetch("/api/admin/llm-provider", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: provider.name,
                    baseUrl: provider.baseUrl,
                    apiKey: provider.apiKey,
                    model: provider.model,
                    isActive: true,
                }),
            });

            if (res.ok) {
                toast({ title: "Aktif", description: `${provider.name} aktif edildi` });
                await fetchProviders();
            }
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const res = await fetch("/api/admin/llm-provider", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "test-connection" }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setTestResult({ success: true, message: "Bağlantı başarılı!" });
                toast({ title: "Başarılı", description: "API bağlantısı çalışıyor" });
            } else {
                setTestResult({ success: false, message: data.error || "Bağlantı hatası" });
                toast({
                    title: "Hata",
                    description: data.error || "Bağlantı testi başarısız",
                    variant: "destructive",
                });
            }
        } catch {
            setTestResult({ success: false, message: "Sunucuya bağlanılamadı" });
            toast({ title: "Hata", description: "Sunucu hatası", variant: "destructive" });
        } finally {
            setTesting(false);
        }
    };

    const activeProvider = providers.find((p) => p.id === activeId);

    return (
        <AdminLayout>
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Bot className="h-6 w-6 text-ai-primary" />
                            LLM Provider
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tüm haber oluşturma ve AI işlemlerinde kullanılacak model buradan yönetilir
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setForm(EMPTY_FORM);
                            setEditingId(null);
                            setShowForm(true);
                            setTestResult(null);
                        }}
                        disabled={showForm}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Provider Ekle
                    </Button>
                </div>

                {/* Active Provider Badge */}
                {activeProvider && !showForm && (
                    <Card className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20">
                        <CardContent className="flex items-center justify-between py-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Aktif Provider: {activeProvider.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {activeProvider.baseUrl} &middot; Model: {activeProvider.model}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestConnection}
                                    disabled={testing}
                                >
                                    {testing ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                    )}
                                    Test
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(activeProvider)}
                                >
                                    Düzenle
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Test Result */}
                {testResult && (
                    <div
                        className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                            }`}
                    >
                        {testResult.success ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : (
                            <XCircle className="h-4 w-4 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                    </div>
                )}

                {/* Form */}
                {showForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {editingId ? "Provider Düzenle" : "Yeni Provider Ekle"}
                            </CardTitle>
                            <CardDescription>
                                OpenAI uyumlu API (OpenAI, DeepSeek, Anthropic, özel endpoint vb.)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Provider Adı</Label>
                                <Input
                                    id="name"
                                    placeholder="örn: DeepSeek, OpenAI, HaberCombo"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            {/* Base URL */}
                            <div className="space-y-2">
                                <Label htmlFor="baseUrl">Base URL</Label>
                                <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="baseUrl"
                                        className="pl-9"
                                        placeholder="https://api.deepseek.com/v1"
                                        value={form.baseUrl}
                                        onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    OpenAI uyumlu API base URL (örnek: https://api.deepseek.com/v1)
                                </p>
                            </div>

                            {/* API Key */}
                            <div className="space-y-2">
                                <Label htmlFor="apiKey">API Key</Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="apiKey"
                                        className="pl-9"
                                        type="password"
                                        placeholder="sk-..."
                                        value={form.apiKey}
                                        onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Model */}
                            <div className="space-y-2">
                                <Label htmlFor="model">Model Adı</Label>
                                <div className="relative">
                                    <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="model"
                                        className="pl-9"
                                        placeholder="deepseek-chat, gpt-4o, claude-3-opus-20240229"
                                        value={form.model}
                                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="isActive"
                                    checked={form.isActive}
                                    onCheckedChange={(checked) =>
                                        setForm({ ...form, isActive: checked })
                                    }
                                />
                                <Label htmlFor="isActive">Kaydedildiğinde aktif yap</Label>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Kaydet
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowForm(false);
                                        setForm(EMPTY_FORM);
                                        setEditingId(null);
                                        setTestResult(null);
                                    }}
                                >
                                    İptal
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Provider List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Kayıtlı Providerlar</CardTitle>
                        <CardDescription>
                            {providers.length === 0
                                ? "Henüz provider eklenmemiş"
                                : `${providers.length} provider kayıtlı`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : providers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">
                                    Henüz bir LLM provider eklenmemiş. Yukarıdan &quot;Yeni Provider Ekle&quot; butonuna tıklayarak ekleyebilirsin.
                                </p>
                                <p className="text-xs mt-2 text-muted-foreground/60">
                                    Not: Eski .env ayarları (HABERCOMBO_API_KEY vb.) veritabanında kayıt yoksa otomatik olarak kullanılır.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {providers.map((provider) => (
                                    <div
                                        key={provider.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${activeId === provider.id
                                                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                                                : "border-border bg-card"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`w-2 h-2 rounded-full shrink-0 ${activeId === provider.id
                                                        ? "bg-emerald-500"
                                                        : "bg-gray-300 dark:bg-gray-600"
                                                    }`}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">
                                                    {provider.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[300px] sm:max-w-[400px]">
                                                    {provider.baseUrl} &middot; {provider.model}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {activeId === provider.id ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-emerald-300 text-emerald-600 dark:text-emerald-400 text-xs"
                                                >
                                                    Aktif
                                                </Badge>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs h-7"
                                                    onClick={() => handleActivate(provider.id)}
                                                >
                                                    Aktifleştir
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7"
                                                onClick={() => handleEdit(provider)}
                                            >
                                                <Cpu className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                                onClick={() => handleDelete(provider.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
