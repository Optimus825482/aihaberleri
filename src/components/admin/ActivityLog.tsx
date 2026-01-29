"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
    FileText,
    Settings,
    User,
    Trash2,
    Edit,
    Plus,
    LogIn,
    LogOut,
    MessageSquare,
    Mail,
    Bell,
    Bot,
} from "lucide-react";

interface AuditLog {
    id: string;
    action: string;
    resource: string;
    resourceId?: string | null;
    details?: any;
    createdAt: Date;
    user: {
        name: string | null;
        email: string;
        role: string;
    };
}

interface ActivityLogProps {
    logs: AuditLog[];
    maxHeight?: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
    CREATE: Plus,
    UPDATE: Edit,
    DELETE: Trash2,
    LOGIN: LogIn,
    LOGOUT: LogOut,
    SETTINGS_CHANGE: Settings,
    BULK_UPDATE: Edit,
    BULK_DELETE: Trash2,
    PUBLISH: FileText,
    UNPUBLISH: FileText,
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
    ARTICLE: FileText,
    CATEGORY: FileText,
    USER: User,
    SETTING: Settings,
    MESSAGE: MessageSquare,
    NEWSLETTER: Mail,
    NOTIFICATION: Bell,
    AGENT: Bot,
};

const ACTION_COLORS: Record<string, string> = {
    CREATE: "bg-green-500/10 text-green-500 border-green-500/20",
    UPDATE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
    LOGIN: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    LOGOUT: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    SETTINGS_CHANGE: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    BULK_UPDATE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    BULK_DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
    PUBLISH: "bg-green-500/10 text-green-500 border-green-500/20",
    UNPUBLISH: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

const ACTION_LABELS: Record<string, string> = {
    CREATE: "Oluşturdu",
    UPDATE: "Güncelledi",
    DELETE: "Sildi",
    LOGIN: "Giriş Yaptı",
    LOGOUT: "Çıkış Yaptı",
    SETTINGS_CHANGE: "Ayarları Değiştirdi",
    BULK_UPDATE: "Toplu Güncelleme",
    BULK_DELETE: "Toplu Silme",
    PUBLISH: "Yayınladı",
    UNPUBLISH: "Yayından Kaldırdı",
};

const RESOURCE_LABELS: Record<string, string> = {
    ARTICLE: "Makale",
    CATEGORY: "Kategori",
    USER: "Kullanıcı",
    SETTING: "Ayar",
    MESSAGE: "Mesaj",
    NEWSLETTER: "Bülten",
    NOTIFICATION: "Bildirim",
    AGENT: "Agent",
};

/**
 * Activity Log Component
 * Displays audit logs with icons and colors
 */
export function ActivityLog({ logs, maxHeight = "600px" }: ActivityLogProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Aktivite Geçmişi
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea style={{ maxHeight }}>
                    <div className="space-y-3">
                        {logs.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                Henüz aktivite kaydı yok
                            </p>
                        ) : (
                            logs.map((log) => {
                                const ActionIcon = ACTION_ICONS[log.action] || FileText;
                                const ResourceIcon = RESOURCE_ICONS[log.resource] || FileText;
                                const actionColor = ACTION_COLORS[log.action] || "bg-gray-500/10";

                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                    >
                                        {/* Icon */}
                                        <div
                                            className={`p-2 rounded-lg ${actionColor} flex-shrink-0`}
                                        >
                                            <ActionIcon className="h-4 w-4" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        <span className="text-foreground">
                                                            {log.user.name || log.user.email}
                                                        </span>{" "}
                                                        <span className="text-muted-foreground">
                                                            {ACTION_LABELS[log.action] || log.action}
                                                        </span>
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-xs">
                                                            <ResourceIcon className="h-3 w-3 mr-1" />
                                                            {RESOURCE_LABELS[log.resource] || log.resource}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {log.user.role}
                                                        </Badge>
                                                    </div>
                                                    {log.details && Object.keys(log.details).length > 0 && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {JSON.stringify(log.details, null, 2).slice(0, 100)}
                                                            {JSON.stringify(log.details).length > 100 && "..."}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(log.createdAt), {
                                                        addSuffix: true,
                                                        locale: tr,
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
