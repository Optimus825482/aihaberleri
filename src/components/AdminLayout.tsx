"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  Users,
  Keyboard,
  BarChart,
  Activity,
  Shield,
  Bell,
  Monitor,
  Search,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Rocket,
  Mail,
} from "lucide-react";
import { usePWA } from "@/context/PWAContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminShortcuts } from "@/hooks/use-admin-shortcuts";
import { Toaster } from "@/components/ui/toaster";
import { canAccessResource } from "@/lib/permissions";
import { ThemeToggle } from "@/components/theme-toggle";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { NotificationBell } from "@/components/admin/notification-bell";
import { AdminNotificationProvider } from "@/context/AdminNotificationContext";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    requiredResource: null,
  },
  {
    title: "Sistem İzleme",
    href: "/admin/monitoring",
    icon: Monitor,
    requiredResource: null,
  },
  {
    title: "Haberler",
    href: "/admin/articles",
    icon: FileText,
    requiredResource: "articles" as const,
  },
  {
    title: "Kategoriler",
    href: "/admin/categories",
    icon: Tags,
    requiredResource: "categories" as const,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart,
    requiredResource: null,
  },
  {
    title: "Pipeline",
    href: "/admin/pipeline",
    icon: GitBranch,
    requiredResource: null,
  },
  {
    title: "İyileştirmeler",
    href: "/admin/improvements",
    icon: Rocket,
    requiredResource: null,
  },
  {
    title: "Agent Ayarları",
    href: "/admin/agent-settings",
    icon: Bot,
    requiredResource: "settings" as const,
  },
  {
    title: "Newsletter",
    href: "/admin/newsletter",
    icon: Mail,
    requiredResource: "settings" as const,
  },
  {
    title: "Bildirimler",
    href: "/admin/notifications",
    icon: Bell,
    requiredResource: "settings" as const,
  },
  {
    title: "Kullanıcılar",
    href: "/admin/users",
    icon: Users,
    requiredResource: "users" as const,
  },
  {
    title: "İletişim",
    href: "/admin/messages",
    icon: MessageSquare,
    requiredResource: "messages" as const,
  },
  {
    title: "Ayarlar",
    href: "/admin/settings",
    icon: Settings,
    requiredResource: "settings" as const,
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    {},
  );
  const { isInstallable, installApp } = usePWA();
  const router = useRouter();

  // Default to VIEWER role - actual auth is handled by middleware
  const userRole = "ADMIN"; // You can fetch this from an API if needed

  // Toggle submenu expansion
  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Auto-expand monitoring submenu if on monitoring page
  useEffect(() => {
    if (pathname?.startsWith("/admin/monitoring")) {
      setExpandedMenus((prev) => ({ ...prev, Monitoring: true }));
    }
  }, [pathname]);

  // 🚀 PHASE 1: Keyboard shortcuts activated
  useAdminShortcuts({
    onEscape: () => {
      setIsMobileMenuOpen(false);
    },
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.requiredResource) return true;
    return canAccessResource(userRole, item.requiredResource);
  });

  // Role badge colors
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      case "ADMIN":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "EDITOR":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "MODERATOR":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      case "VIEWER":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Süper Admin";
      case "ADMIN":
        return "Admin";
      case "EDITOR":
        return "Editör";
      case "MODERATOR":
        return "Moderatör";
      case "VIEWER":
        return "İzleyici";
      default:
        return role;
    }
  };

  return (
    <AdminNotificationProvider>
      <div className="min-h-[100dvh] bg-background flex">
        {/* Mobile Header - Enhanced for PWA */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/95 border-b border-primary/10 px-4 py-3 flex items-center justify-between shadow-lg safe-area-top">
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
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              aria-label="Menüyü aç"
              className="hover:bg-primary/10 h-12 w-12 touch-manipulation"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
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
              <div className="hidden lg:flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-card/50 border border-primary/10">
              <p className="text-xs text-muted-foreground truncate font-medium mb-2">
                Admin User
              </p>
              <Badge
                variant="outline"
                className={`text-xs ${getRoleBadgeColor(userRole)}`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {getRoleLabel(userRole)}
              </Badge>
            </div>
          </div>

          {/* Navigation - Touch Optimized */}
          <nav className="px-3 py-4 space-y-1 pb-24 overflow-y-auto max-h-[calc(100vh-280px)] overscroll-contain">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isExpanded = expandedMenus[item.title];
              const isSubmenuActive =
                hasSubmenu && item.submenu?.some((sub) => pathname === sub.href);

              return (
                <div key={item.href}>
                  {/* Main Menu Item */}
                  {hasSubmenu ? (
                    <button
                      onClick={() => toggleSubmenu(item.title)}
                      className={`
                      group flex items-center gap-3 px-4 py-4 lg:py-3 rounded-xl
                      transition-all duration-200 relative overflow-hidden w-full
                      touch-manipulation active:scale-[0.98]
                      ${isSubmenuActive
                          ? "bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary shadow-lg shadow-primary/10"
                          : "hover:bg-primary/5 hover:translate-x-1"
                        }
                    `}
                    >
                      {/* Active Indicator */}
                      {isSubmenuActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                      )}

                      <div
                        className={`
                      p-2 rounded-lg transition-all
                      ${isSubmenuActive ? "bg-primary/20" : "bg-primary/10 group-hover:bg-primary/20"}
                    `}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                      </div>
                      <span className="truncate font-bold text-sm flex-1 text-left">
                        {item.title}
                      </span>

                      {/* Chevron Icon */}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 transition-transform" />
                      )}

                      {/* Hover Effect */}
                      {!isSubmenuActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`
                      group flex items-center gap-3 px-4 py-4 lg:py-3 rounded-xl
                      transition-all duration-200 relative overflow-hidden
                      touch-manipulation active:scale-[0.98]
                      ${isActive
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
                      <span className="truncate font-bold text-sm">
                        {item.title}
                      </span>

                      {/* Hover Effect */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  )}

                  {/* Submenu Items */}
                  {hasSubmenu && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/10 pl-2">
                      {item.submenu?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname === subItem.href;

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={closeMobileMenu}
                            className={`
                            group flex items-center gap-2 px-3 py-2.5 rounded-lg
                            transition-all duration-200 relative
                            touch-manipulation active:scale-[0.98]
                            ${isSubActive
                                ? "bg-primary text-white shadow-md"
                                : "hover:bg-primary/10 hover:translate-x-1"
                              }
                          `}
                          >
                            <div
                              className={`
                            p-1.5 rounded-md transition-all
                            ${isSubActive ? "bg-white/20" : "bg-primary/10 group-hover:bg-primary/20"}
                          `}
                            >
                              <SubIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            </div>
                            <span className="truncate font-semibold text-xs">
                              {subItem.title}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom Actions - Enhanced for PWA */}
          <div className="absolute bottom-0 w-72 p-3 border-t border-primary/10 bg-gradient-to-t from-card to-transparent backdrop-blur-xl safe-area-bottom">
            {/* PWA Install Button - Always visible on mobile */}
            <div className="lg:hidden mb-2">
              {isInstallable ? (
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 text-primary font-bold shadow-lg shadow-primary/10 group h-12 touch-manipulation"
                  onClick={() => {
                    installApp();
                    closeMobileMenu();
                  }}
                >
                  <div className="p-1.5 bg-primary/20 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                    <Download className="h-4 w-4 flex-shrink-0" />
                  </div>
                  <span className="truncate">📲 Uygulamayı Yükle</span>
                </Button>
              ) : (
                <div className="w-full px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-sm font-medium flex items-center gap-2">
                  <span>✅</span>
                  <span>PWA olarak yüklendi veya tarayıcıdan kullanılıyor</span>
                </div>
              )}
            </div>

            {/* Desktop PWA Install */}
            {isInstallable && (
              <Button
                variant="outline"
                className="hidden lg:flex w-full justify-start mb-2 border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 text-primary font-bold shadow-lg shadow-primary/10 group h-12 touch-manipulation"
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
              className="w-full justify-start hover:bg-destructive/10 hover:text-destructive font-bold group h-12 touch-manipulation"
              onClick={() => {
                closeMobileMenu();
                // Custom logout - clear cookie and redirect
                document.cookie =
                  "admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                router.push("/admin/login");
              }}
            >
              <div className="p-1.5 bg-destructive/10 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <LogOut className="h-4 w-4 flex-shrink-0" />
              </div>
              <span className="truncate">Çıkış Yap</span>
            </Button>
          </div>
        </aside>

        {/* Main Content - PWA Optimized */}
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pt-[60px] lg:pt-0 pb-safe">
          <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>

        {/* Toast Notifications */}
        <Toaster />

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog />
      </div>
    </AdminNotificationProvider>
  );
}
