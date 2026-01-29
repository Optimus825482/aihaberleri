"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bot,
  Download,
  MessageSquare,
  Tags,
  Mail,
  Bell,
  Users,
} from "lucide-react";
import { usePWA } from "@/context/PWAContext";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Haberler",
    href: "/admin/articles",
    icon: FileText,
  },
  {
    title: "Kategoriler",
    href: "/admin/categories",
    icon: Tags,
  },
  {
    title: "Mesajlar",
    href: "/admin/messages",
    icon: MessageSquare,
  },
  {
    title: "Newsletter Aboneleri",
    href: "/admin/newsletter",
    icon: Mail,
  },
  {
    title: "Push Mesajları",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Anlık Ziyaretçiler",
    href: "/admin/visitors",
    icon: Users,
  },
  {
    title: "Ayarlar",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Agent Ayarları",
    href: "/admin/agent-settings",
    icon: Bot,
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isInstallable, installApp } = usePWA();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Prevent flash of content before redirect
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };


  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header - Enhanced */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/95 border-b border-primary/10 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Admin Panel</h2>
            <p className="text-[8px] font-bold uppercase tracking-wider text-primary">
              Command Center
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          aria-label="Menüyü aç"
          className="hover:bg-primary/10"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar - Enhanced with Glassmorphism */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 border-r border-primary/10
          backdrop-blur-xl bg-gradient-to-b from-card/95 to-card/80
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          shadow-2xl lg:shadow-none
        `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobileMenu}
            aria-label="Menüyü kapat"
            className="hover:bg-primary/10"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Logo & User Section */}
        <div className="p-6 border-b border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Admin</h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Command Center
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-card/50 border border-primary/10">
            <p className="text-xs text-muted-foreground truncate font-medium">
              {session?.user?.email}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1 pb-20 overflow-y-auto max-h-[calc(100vh-280px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200 relative overflow-hidden
                  ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/20"
                      : "hover:bg-primary/5 hover:translate-x-1"
                  }
                `}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full" />
                )}

                <div
                  className={`
                  p-2 rounded-lg transition-all
                  ${isActive ? "bg-white/20" : "bg-primary/10 group-hover:bg-primary/20"}
                `}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                </div>
                <span className="truncate font-bold text-sm">{item.title}</span>

                {/* Hover Effect */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions - Enhanced */}
        <div className="absolute bottom-0 w-72 p-3 border-t border-primary/10 bg-gradient-to-t from-card to-transparent backdrop-blur-xl">
          {isInstallable && (
            <Button
              variant="outline"
              className="w-full justify-start mb-2 border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 text-primary font-bold shadow-lg shadow-primary/10 group"
              onClick={() => {
                installApp();
                closeMobileMenu();
              }}
            >
              <div className="p-1.5 bg-primary/20 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <Download className="h-4 w-4 flex-shrink-0" />
              </div>
              <span className="truncate">Uygulamayı Yükle</span>
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-destructive/10 hover:text-destructive font-bold group"
            onClick={() => {
              closeMobileMenu();
              signOut({ callbackUrl: "/admin/login" });
            }}
          >
            <div className="p-1.5 bg-destructive/10 rounded-lg mr-3 group-hover:scale-110 transition-transform">
              <LogOut className="h-4 w-4 flex-shrink-0" />
            </div>
            <span className="truncate">Çıkış Yap</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pt-16 lg:pt-0">
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
