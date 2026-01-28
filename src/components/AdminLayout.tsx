"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
    href: "/admin/settings",
    icon: Tags,
  },
  {
    title: "Agent Ayarları",
    href: "/admin/agent-settings",
    icon: Bot,
  },
  {
    title: "Mesajlar",
    href: "/admin/messages",
    icon: MessageSquare,
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isInstallable, installApp } = usePWA();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">Yönetim Paneli</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          aria-label="Menüyü aç"
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

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 border-r bg-card
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobileMenu}
            aria-label="Menüyü kapat"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold">Yönetim Paneli</h2>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {session?.user?.email}
          </p>
        </div>

        <nav className="px-3 space-y-1 pb-20">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-3 border-t bg-card">
          {isInstallable && (
            <Button
              variant="outline"
              className="w-full justify-start mb-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
              onClick={() => {
                installApp();
                closeMobileMenu();
              }}
            >
              <Download className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="truncate">Uygulamayı Yükle</span>
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              closeMobileMenu();
              signOut({ callbackUrl: "/admin/login" });
            }}
          >
            <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
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
