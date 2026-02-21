"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rawNext = searchParams?.get("next") || "/admin";
  const nextTarget = rawNext.startsWith("/admin") ? rawNext : "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("[SIMPLE_LOGIN_PAGE] Attempting login for:", email);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      console.log("[SIMPLE_LOGIN_PAGE] Response:", data);

      if (!response.ok) {
        setError(data.error || "Giriş başarısız");
        return;
      }

      if (data.success) {
        console.log("[SIMPLE_LOGIN_PAGE] Success! Redirecting...");
        // Hard redirect to clear any cached state
        window.location.href = nextTarget;
      }
    } catch (error) {
      console.error("[SIMPLE_LOGIN_PAGE] Exception:", error);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 p-4 safe-area-top safe-area-bottom">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Yönetici Girişi
          </CardTitle>
          <CardDescription className="text-center">
            Yönetim paneline erişmek için giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base touch-manipulation"
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base touch-manipulation"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base touch-manipulation"
              disabled={loading}
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <div className="mb-2">
              <Link
                href="/admin/login?next=%2Fadmin%2Fadsense-readiness"
                className="hover:text-primary transition-colors"
              >
                AdSense Hazırlık sayfasına giriş sonrası git
              </Link>
            </div>
            <a href="/" className="hover:text-primary transition-colors">
              ← Web sitesine dön
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
