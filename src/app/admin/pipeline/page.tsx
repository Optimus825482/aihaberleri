"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Pipeline page redirect
 * This page has been merged with Agent Settings page
 * Redirecting to /admin/agent-settings
 */
export default function PipelineRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/agent-settings");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          Pipeline sayfası Agent Ayarları ile birleştirildi. Yönlendiriliyor...
        </p>
      </div>
    </div>
  );
}
