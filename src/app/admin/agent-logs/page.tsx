"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page has been merged into Agent Settings
// Redirecting for backward compatibility
export default function AgentLogsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin/agent-settings");
    }, [router]);

    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">
                    Agent Ayarları sayfasına yönlendiriliyorsunuz...
                </p>
            </div>
        </div>
    );
}
variant = "outline"
size = "sm"
onClick = { clearLogs }
className = "gap-2"
    >
    <Trash2 className="h-4 w-4" />
Temizle
                                </Button >

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadLogs}
                                    className="gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    İndir
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={connect}
                                    className="gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Yeniden Bağlan
                                </Button>
                            </div >

    <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
            <Switch
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
            />
            <Label htmlFor="auto-scroll" className="text-sm text-gray-400">
                Otomatik Kaydır
            </Label>
        </div>

        <div className="flex items-center gap-2">
            <Switch
                id="show-debug"
                checked={showDebug}
                onCheckedChange={setShowDebug}
            />
            <Label htmlFor="show-debug" className="text-sm text-gray-400">
                Debug Göster
            </Label>
        </div>

        <input
            type="text"
            placeholder="Filtrele..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
    </div>
                        </div >
                    </CardContent >
                </Card >

    {/* Log Viewer */ }
    < Card className = "bg-gray-900/50 border-gray-800" >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span
                                    className={cn(
                                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                        isConnected && !isPaused ? "bg-green-400" : "bg-gray-400"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "relative inline-flex rounded-full h-2 w-2",
                                        isConnected && !isPaused ? "bg-green-500" : "bg-gray-500"
                                    )}
                                />
                            </span>
                            Log Akışı
                        </CardTitle>
                        <CardDescription>
                            {filteredLogs.length} log gösteriliyor
                            {isPaused && " (duraklatıldı)"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={scrollRef}
                            className="h-[600px] overflow-y-auto bg-black/50 rounded-lg border border-gray-800 font-mono text-sm"
                        >
                            {filteredLogs.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <div className="text-center">
                                        <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Henüz log yok</p>
                                        <p className="text-xs mt-1">
                                            Agent çalıştığında loglar burada görünecek
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {filteredLogs.map((log, index) => {
                                        const config = levelConfig[log.level];
                                        const Icon = config.icon;

                                        return (
                                            <div
                                                key={index}
                                                className={cn(
                                                    "flex items-start gap-2 px-2 py-1.5 rounded border",
                                                    config.bg,
                                                    config.border
                                                )}
                                            >
                                                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                                                <span className="text-gray-500 shrink-0">
                                                    {formatTime(log.timestamp)}
                                                </span>
                                                {log.module && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs px-1.5 py-0 shrink-0"
                                                    >
                                                        {log.module}
                                                    </Badge>
                                                )}
                                                <span className={cn("text-gray-300 break-all", config.color)}>
                                                    {log.message}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>

                        {!autoScroll && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="fixed bottom-8 right-8 gap-2 shadow-lg"
                            >
                                <ArrowDown className="h-4 w-4" />
                                En Alta Git
                            </Button>
                        )}
                    </CardContent>
                </Card >
            </div >
        </AdminLayout >
    );
}
