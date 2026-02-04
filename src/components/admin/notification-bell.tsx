"use client";

import { useState } from "react";
import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    useAdminNotifications,
    getNotificationIcon,
    type AdminNotification
} from "@/context/AdminNotificationContext";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

export function NotificationBell() {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        isConnected
    } = useAdminNotifications();
    const [open, setOpen] = useState(false);

    const handleNotificationClick = (notification: AdminNotification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                    title="Bildirimler"
                >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                    {/* Connection indicator */}
                    <span
                        className={cn(
                            "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background",
                            isConnected ? "bg-green-500" : "bg-gray-400"
                        )}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Bildirimler</span>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => markAllAsRead()}
                            >
                                <Check className="h-3 w-3 mr-1" />
                                Tümünü Oku
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => clearAll()}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Henüz bildirim yok
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "p-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50",
                                    !notification.read && "bg-primary/5"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">
                                                {notification.title}
                                            </p>
                                            {!notification.read && (
                                                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(notification.timestamp, {
                                                    addSuffix: true,
                                                    locale: tr,
                                                })}
                                            </span>
                                            {notification.action && (
                                                <Link
                                                    href={notification.action.href}
                                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpen(false);
                                                    }}
                                                >
                                                    {notification.action.label}
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
