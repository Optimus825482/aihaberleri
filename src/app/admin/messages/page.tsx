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
import {
  MessageSquare,
  Mail,
  MailOpen,
  Trash2,
  CheckCheck,
  Clock,
} from "lucide-react";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  isReplied: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MessagesData {
  messages: Message[];
  stats: {
    total: number;
    unread: number;
    read: number;
  };
}

export default function MessagesPage() {
  const [data, setData] = useState<MessagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/messages?filter=${filter}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string, isRead: boolean) => {
    try {
      const response = await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead }),
      });

      if (response.ok) {
        fetchMessages();
        if (selectedMessage?.id === id) {
          setSelectedMessage({ ...selectedMessage, isRead });
        }
      }
    } catch (error) {
      console.error("Failed to update message:", error);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;

    try {
      const response = await fetch(`/api/admin/messages?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchMessages();
        if (selectedMessage?.id === id) {
          setSelectedMessage(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            İletişim <span className="text-primary italic">Mesajları</span>
          </h1>
          <p className="text-muted-foreground">
            Kullanıcılardan gelen mesajları yönetin
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Toplam Mesaj",
              value: data?.stats.total || 0,
              icon: MessageSquare,
              color: "text-blue-500",
            },
            {
              label: "Okunmamış",
              value: data?.stats.unread || 0,
              icon: Mail,
              color: "text-orange-500",
            },
            {
              label: "Okunmuş",
              value: data?.stats.read || 0,
              icon: MailOpen,
              color: "text-green-500",
            },
          ].map((stat, i) => (
            <Card key={i} className="bg-card/40 border-primary/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-black">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "Tümü" },
            { key: "unread", label: "Okunmamış" },
            { key: "read", label: "Okunmuş" },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.key as typeof filter)}
              className="font-bold"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Messages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black">Mesajlar</CardTitle>
              <CardDescription>
                {data?.messages.length || 0} mesaj bulundu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {data?.messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (!message.isRead) {
                      markAsRead(message.id, true);
                    }
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
                    selectedMessage?.id === message.id
                      ? "border-primary bg-primary/5"
                      : message.isRead
                        ? "border-border bg-card"
                        : "border-orange-500/30 bg-orange-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{message.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {message.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {!message.isRead && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-2"
                        >
                          YENİ
                        </Badge>
                      )}
                      {message.isReplied && (
                        <CheckCheck className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-semibold mb-1 truncate">
                    {message.subject}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {message.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(message.createdAt).toLocaleString("tr-TR")}
                  </div>
                </div>
              ))}

              {data?.messages.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Mesaj bulunamadı</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Detail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black">Mesaj Detayı</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMessage ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Gönderen
                    </label>
                    <p className="font-bold">{selectedMessage.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMessage.email}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Konu
                    </label>
                    <p className="font-bold">{selectedMessage.subject}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Mesaj
                    </label>
                    <p className="text-sm whitespace-pre-wrap mt-2 p-4 bg-muted/50 rounded-lg">
                      {selectedMessage.message}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Tarih
                    </label>
                    <p className="text-sm">
                      {new Date(selectedMessage.createdAt).toLocaleString(
                        "tr-TR",
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant={selectedMessage.isRead ? "outline" : "default"}
                      size="sm"
                      onClick={() =>
                        markAsRead(selectedMessage.id, !selectedMessage.isRead)
                      }
                      className="flex-1"
                    >
                      {selectedMessage.isRead ? (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Okunmadı İşaretle
                        </>
                      ) : (
                        <>
                          <MailOpen className="h-4 w-4 mr-2" />
                          Okundu İşaretle
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMessage(selectedMessage.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Detayları görmek için bir mesaj seçin
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
