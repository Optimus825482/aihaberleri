"use client";

import {
  Activity,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  LogIn,
  LogOut,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface ActivityItem {
  action: string;
  timestamp: string;
  details?: string;
}

interface Props {
  activities: ActivityItem[];
  userName: string;
}

export default function UserActivityTimeline({ activities, userName }: Props) {
  // Get icon based on action type
  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes("login") || actionLower.includes("giriş")) {
      return {
        icon: LogIn,
        color: "text-green-400",
        bgColor: "bg-green-500/20",
      };
    }
    if (actionLower.includes("logout") || actionLower.includes("çıkış")) {
      return {
        icon: LogOut,
        color: "text-orange-400",
        bgColor: "bg-orange-500/20",
      };
    }
    if (actionLower.includes("create") || actionLower.includes("oluştur")) {
      return {
        icon: UserPlus,
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
      };
    }
    if (actionLower.includes("edit") || actionLower.includes("düzenle")) {
      return {
        icon: Edit,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
      };
    }
    if (actionLower.includes("delete") || actionLower.includes("sil")) {
      return { icon: Trash2, color: "text-red-400", bgColor: "bg-red-500/20" };
    }
    if (actionLower.includes("role") || actionLower.includes("rol")) {
      return {
        icon: Shield,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
      };
    }
    if (actionLower.includes("article") || actionLower.includes("makale")) {
      return {
        icon: FileText,
        color: "text-cyan-400",
        bgColor: "bg-cyan-500/20",
      };
    }
    if (actionLower.includes("settings") || actionLower.includes("ayar")) {
      return {
        icon: Settings,
        color: "text-slate-400",
        bgColor: "bg-slate-500/20",
      };
    }
    if (actionLower.includes("error") || actionLower.includes("hata")) {
      return {
        icon: AlertCircle,
        color: "text-red-400",
        bgColor: "bg-red-500/20",
      };
    }
    if (actionLower.includes("success") || actionLower.includes("başarı")) {
      return {
        icon: CheckCircle,
        color: "text-green-400",
        bgColor: "bg-green-500/20",
      };
    }

    return {
      icon: Activity,
      color: "text-slate-400",
      bgColor: "bg-slate-500/20",
    };
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Henüz aktivite kaydı bulunmuyor</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Aktivite Geçmişi</h3>
          <p className="text-sm text-slate-400">
            {userName} kullanıcısının son aktiviteleri
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-blue-500/50 to-transparent"></div>

        {/* Activity Items */}
        <div className="space-y-4">
          {sortedActivities.slice(0, 10).map((activity, index) => {
            const {
              icon: Icon,
              color,
              bgColor,
            } = getActivityIcon(activity.action);

            return (
              <div
                key={index}
                className="relative flex items-start gap-4 group"
              >
                {/* Icon */}
                <div
                  className={`
                  relative z-10 flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                  ${bgColor} border border-white/10
                  group-hover:scale-110 transition-transform duration-200
                `}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="text-white font-medium">
                        {activity.action}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(activity.timestamp)}
                      </div>
                    </div>
                    {activity.details && (
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {activity.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More Indicator */}
        {sortedActivities.length > 10 && (
          <div className="mt-6 text-center">
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
              Daha fazla göster ({sortedActivities.length - 10} aktivite)
            </button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{activities.length}</p>
            <p className="text-xs text-slate-400 mt-1">Toplam Aktivite</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {
                activities.filter((a) =>
                  a.action.toLowerCase().includes("login"),
                ).length
              }
            </p>
            <p className="text-xs text-slate-400 mt-1">Giriş Sayısı</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {
                activities.filter(
                  (a) =>
                    a.action.toLowerCase().includes("create") ||
                    a.action.toLowerCase().includes("edit"),
                ).length
              }
            </p>
            <p className="text-xs text-slate-400 mt-1">İçerik İşlemi</p>
          </div>
        </div>
      </div>
    </div>
  );
}
