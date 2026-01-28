"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Mail,
  MailOpen,
  Reply,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Inbox,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  isReplied: boolean;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(
    null,
  );
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        filter,
        search: searchQuery,
      });

      const response = await fetch(`/api/admin/messages?${params}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [pagination.page, filter]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)),
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;

    try {
      await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const openMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markAsRead(message.id);
    }
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Inbox className="w-7 h-7 text-blue-600" />
              İletişim Mesajları
            </h1>
            <p className="text-gray-500 mt-1">
              {pagination.total} mesaj • {unreadCount} okunmamış
            </p>
          </div>

          <button
            onClick={fetchMessages}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              filter === "unread"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Okunmamış
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              filter === "read"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Okunmuş
          </button>
        </div>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Mesajlarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMessages()}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Messages Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Message List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
          <div className="divide-y dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                Yükleniyor...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                Hiç mesaj bulunamadı
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => openMessage(message)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                    selectedMessage?.id === message.id
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  } ${!message.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.isRead
                          ? "bg-gray-100 dark:bg-gray-700"
                          : "bg-blue-100 dark:bg-blue-900/30"
                      }`}
                    >
                      {message.isRead ? (
                        <MailOpen className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Mail className="w-5 h-5 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-medium truncate ${
                            !message.isRead ? "text-blue-600" : ""
                          }`}
                        >
                          {message.name}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {format(new Date(message.createdAt), "dd MMM", {
                            locale: tr,
                          })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {message.subject}
                      </div>
                      <div className="text-sm text-gray-500 truncate mt-0.5">
                        {message.message.slice(0, 60)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
              <span className="text-sm text-gray-500">
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
          {selectedMessage ? (
            <div className="h-full flex flex-col">
              {/* Detail Header */}
              <div className="p-4 border-b dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-medium rounded">
                    {selectedMessage.subject}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600"
                      title="Yanıtla"
                    >
                      <Reply className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                      title="Sil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <h2 className="text-xl font-bold">{selectedMessage.name}</h2>
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  {selectedMessage.email}
                </a>
                <p className="text-sm text-gray-500 mt-1">
                  {format(
                    new Date(selectedMessage.createdAt),
                    "d MMMM yyyy, HH:mm",
                    { locale: tr },
                  )}
                </p>
              </div>

              {/* Message Body */}
              <div className="p-4 flex-1 overflow-auto">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition"
                >
                  <Reply className="w-5 h-5" />
                  E-posta ile Yanıtla
                </a>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Görüntülemek için bir mesaj seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
