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
