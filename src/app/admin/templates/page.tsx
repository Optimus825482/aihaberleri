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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText, Copy } from "lucide-react";
import { toast } from "sonner";

interface Template {
    id: string;
    name: string;
    description: string | null;
    content: string;
    category: string | null;
    isActive: boolean;
    usageCount: number;
    createdAt: string;
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        content: "",
        category: "",
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/admin/templates");
            const data = await res.json();

            if (data.success) {
                setTemplates(data.templates);
            } else {
                toast.error(data.error || "Şablonlar yüklenemedi");
            }
        } catch (error) {
            toast.error("Şablonlar yüklenirken hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.content) {
            toast.error("Lütfen tüm zorunlu alanları doldurun");
            return;
        }

        try {
            const res = await fetch("/api/admin/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Şablon başarıyla oluşturuldu");
                setDialogOpen(false);
                setFormData({ name: "", description: "", content: "", category: "" });
                fetchTemplates();
            } else {
                toast.error(data.error || "Şablon oluşturulamadı");
            }
        } catch (error) {
            toast.error("Şablon oluşturulurken hata oluştu");
        }
    };

    const handleCopyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success("İçerik panoya kopyalandı");
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
                        <h1 className="text-3xl font-bold">Makale Şablonları</h1>
                        <p className="text-muted-foreground mt-2">
                            Hızlı makale oluşturmak için önceden tanımlanmış şablonlar
                        </p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Yeni Şablon
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Yeni Şablon Oluştur</DialogTitle>
                                <DialogDescription>
                                    Yeni makale şablonu oluşturmak için aşağıdaki formu doldurun
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleCreateTemplate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Şablon Adı *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="Örn: AI Haber Şablonu"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Açıklama</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        placeholder="Şablonun ne için kullanıldığını açıklayın"
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Kategori</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, category: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Kategori seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="news">Haber</SelectItem>
                                            <SelectItem value="analysis">Analiz</SelectItem>
                                            <SelectItem value="tutorial">Eğitim</SelectItem>
                                            <SelectItem value="review">İnceleme</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="content">İçerik *</Label>
                                    <Textarea
                                        id="content"
                                        value={formData.content}
                                        onChange={(e) =>
                                            setFormData({ ...formData, content: e.target.value })
                                        }
                                        placeholder="Şablon içeriğini yazın (Markdown desteklenir)"
                                        rows={10}
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        İptal
                                    </Button>
                                    <Button type="submit">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Oluştur
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Toplam Şablon
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{templates.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Aktif Şablon
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {templates.filter((t) => t.isActive).length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Toplam Kullanım
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {templates.reduce((sum, t) => sum + t.usageCount, 0)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Templates Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Şablonlar</CardTitle>
                        <CardDescription>
                            Tüm makale şablonlarını görüntüleyin ve yönetin
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {templates.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">
                                    Henüz şablon oluşturulmamış
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Şablon Adı</TableHead>
                                        <TableHead>Kategori</TableHead>
                                        <TableHead>Kullanım</TableHead>
                                        <TableHead>Durum</TableHead>
                                        <TableHead>Oluşturulma</TableHead>
                                        <TableHead className="text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {templates.map((template) => (
                                        <TableRow key={template.id}>
                                            <TableCell className="font-medium">
                                                {template.name}
                                            </TableCell>
                                            <TableCell>
                                                {template.category ? (
                                                    <Badge variant="secondary">
                                                        {template.category}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{template.usageCount}x</TableCell>
                                            <TableCell>
                                                {template.isActive ? (
                                                    <Badge variant="default">Aktif</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Pasif</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(template.createdAt).toLocaleDateString(
                                                    "tr-TR"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            handleCopyToClipboard(template.content)
                                                        }
                                                        title="İçeriği kopyala"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" title="Düzenle">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        title="Sil"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
