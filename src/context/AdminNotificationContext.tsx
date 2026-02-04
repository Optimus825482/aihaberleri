"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { Bell, Check, AlertTriangle, Info, Zap, Users, FileText, Bot } from "lucide-react";

// Notification Types
export type NotificationType = "info" | "success" | "warning" | "error" | "agent" | "visitor" | "article";

export interface AdminNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    action?: {
        label: string;
        href: string;
    };
}

interface NotificationContextType {
    notifications: AdminNotification[];
    unreadCount: number;
    isConnected: boolean;
    addNotification: (notification: Omit<AdminNotification, "id" | "timestamp" | "read">) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useAdminNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useAdminNotifications must be used within AdminNotificationProvider");
    }
    return context;
}

// Notification Icon Helper
export function getNotificationIcon(type: NotificationType) {
    switch (type) {
        case "success":
            return <Check className="h-4 w-4 text-green-500" />;
        case "warning":
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case "error":
            return <AlertTriangle className="h-4 w-4 text-red-500" />;
        case "agent":
            return <Bot className="h-4 w-4 text-purple-500" />;
        case "visitor":
            return <Users className="h-4 w-4 text-blue-500" />;
        case "article":
            return <FileText className="h-4 w-4 text-cyan-500" />;
        default:
            return <Info className="h-4 w-4 text-blue-500" />;
    }
}

interface AdminNotificationProviderProps {
    children: ReactNode;
    enableSSE?: boolean;
    sseEndpoint?: string;
}

export function AdminNotificationProvider({
    children,
    enableSSE = true,
    sseEndpoint = "/api/admin/notifications/stream",
}: AdminNotificationProviderProps) {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    // Generate unique ID
    const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add notification
    const addNotification = useCallback((notification: Omit<AdminNotification, "id" | "timestamp" | "read">) => {
        const newNotification: AdminNotification = {
            ...notification,
            id: generateId(),
            timestamp: new Date(),
            read: false,
        };

        setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50

        // Show toast for important notifications
        if (notification.type === "error" || notification.type === "warning") {
            toast({
                variant: notification.type === "error" ? "destructive" : "default",
                title: notification.title,
                description: notification.message,
            });
        }
    }, []);

    // Mark as read
    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    // Clear all
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Unread count
    const unreadCount = notifications.filter((n) => !n.read).length;

    // SSE Connection
    const connectSSE = useCallback(() => {
        if (!enableSSE) return;

        // Clean up existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const eventSource = new EventSource(sseEndpoint);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === "ping") {
                        // Heartbeat - ignore
                        return;
                    }

                    if (data.notification) {
                        addNotification(data.notification);
                    }
                } catch (e) {
                    console.error("Failed to parse SSE message:", e);
                }
            };

            eventSource.onerror = () => {
                setIsConnected(false);
                eventSource.close();

                // Reconnect with backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connectSSE();
                    }, delay);
                }
            };
        } catch (error) {
            console.error("Failed to create EventSource:", error);
        }
    }, [enableSSE, sseEndpoint, addNotification]);

    // Initialize SSE on mount
    useEffect(() => {
        // Don't connect SSE in development if endpoint doesn't exist
        // connectSSE();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // Simulate some initial notifications for demo
    useEffect(() => {
        // Add some demo notifications
        const demoNotifications: AdminNotification[] = [
            {
                id: "demo-1",
                type: "agent",
                title: "Otonom Sistem",
                message: "Agent son çalışmasını tamamladı. 5 yeni haber oluşturuldu.",
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                read: false,
                action: { label: "Detaylar", href: "/admin/agent-settings" },
            },
            {
                id: "demo-2",
                type: "visitor",
                title: "Ziyaretçi Artışı",
                message: "Son 1 saatte 150+ benzersiz ziyaretçi.",
                timestamp: new Date(Date.now() - 60 * 60 * 1000),
                read: true,
            },
        ];

        setNotifications(demoNotifications);
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                isConnected,
                addNotification,
                markAsRead,
                markAllAsRead,
                clearAll,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}
