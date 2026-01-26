"use client";

import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Terminal } from "lucide-react";

interface LogMessage {
  message: string;
  type: "info" | "success" | "error" | "progress";
  timestamp: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    fetchCategories();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);

        // autoStart parametresi varsa taramayı başlat
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("autoStart") === "true") {
          // fetch bittikten hemen sonra başlat
          startScan();
        }
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const startScan = async () => {
    setScanning(true);
    setLogs([]);

    try {
      // Kategori parametresi ile stream URL'i oluştur
      const url =
        selectedCategory === "all"
          ? "/api/agent/stream"
          : `/api/agent/stream?category=${selectedCategory}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "complete") {
          setScanning(false);
          eventSource.close();
        } else {
          setLogs((prev) => [...prev, data as LogMessage]);
        }
      };

      eventSource.onerror = () => {
        setScanning(false);
        setLogs((prev) => [
          ...prev,
          {
            message: "❌ Bağlantı hatası",
            type: "error",
            timestamp: new Date().toISOString(),
          },
        ]);
        eventSource.close();
      };
    } catch (error) {
      setScanning(false);
      setLogs((prev) => [
        ...prev,
        {
          message: `❌ Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
          type: "error",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Haber Tarama</h1>
            <p className="text-muted-foreground mt-2">
              Yapay zeka haberlerini tara ve yayınla
            </p>
          </div>
        </div>

        {/* Scan Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Tarama Ayarları</CardTitle>
            <CardDescription>
              Hangi kategorilerden haber taranacağını seçin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori Seçimi</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                disabled={scanning}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    🌐 Tüm Kategoriler (Otomatik Dağıtım)
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === "all"
                  ? "Agent tüm kategorilerden haber toplayıp otomatik olarak uygun kategorilere dağıtacak"
                  : `Sadece "${categories.find((c) => c.slug === selectedCategory)?.name}" kategorisinden haberler taranacak`}
              </p>
            </div>

            <Button
              onClick={startScan}
              disabled={scanning}
              size="lg"
              className="w-full"
            >
              <Search className="mr-2 h-5 w-5" />
              {scanning ? "Taranıyor..." : "Taramayı Başlat"}
            </Button>
          </CardContent>
        </Card>

        {/* Real-time Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              <CardTitle>Tarama Logları</CardTitle>
            </div>
            <CardDescription>Gerçek zamanlı işlem logları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 text-slate-50 p-4 rounded-lg min-h-[400px] max-h-[600px] overflow-y-auto font-mono text-sm">
              {logs.length === 0 && !scanning && (
                <div className="text-slate-500 text-center py-20">
                  Tarama başlatmak için yukarıdaki butona tıklayın
                </div>
              )}

              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-2 ${
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "success"
                        ? "text-green-400"
                        : log.type === "progress"
                          ? "text-blue-400"
                          : "text-slate-300"
                  }`}
                >
                  <span className="text-slate-500 mr-2">
                    [{new Date(log.timestamp).toLocaleTimeString("tr-TR")}]
                  </span>
                  {log.message}
                </div>
              ))}

              {scanning && (
                <div className="flex items-center gap-2 text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span>Taranıyor...</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
