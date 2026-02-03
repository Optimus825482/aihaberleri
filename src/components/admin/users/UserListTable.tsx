"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import RoleAssignmentDropdown from "./RoleAssignmentDropdown";
import UserActivityTimeline from "./UserActivityTimeline";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "inactive" | "suspended";
  lastActive: string;
  createdAt: string;
  articlesCount?: number;
  activityLog?: Array<{
    action: string;
    timestamp: string;
    details?: string;
  }>;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  users: User[];
  loading: boolean;
  selectedUsers: string[];
  onSelectUsers: (ids: string[]) => void;
  onRoleChange: (userId: string, newRole: string) => void;
  onDeleteUser: (userId: string) => void;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export default function UserListTable({
  users,
  loading,
  selectedUsers,
  onSelectUsers,
  onRoleChange,
  onDeleteUser,
  pagination,
  onPageChange,
}: Props) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Select all handler
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      onSelectUsers([]);
    } else {
      onSelectUsers(users.map((u) => u.id));
    }
  };

  // Select single user
  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      onSelectUsers([...selectedUsers, userId]);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      active: {
        icon: CheckCircle,
        text: "Aktif",
        className: "bg-green-500/20 text-green-300 border-green-500/30",
      },
      inactive: {
        icon: XCircle,
        text: "Pasif",
        className: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      },
      suspended: {
        icon: AlertCircle,
        text: "Askıda",
        className: "bg-red-500/20 text-red-300 border-red-500/30",
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.inactive;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${badge.className}`}
      >
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const badges = {
      admin: "bg-red-500/20 text-red-300 border-red-500/30",
      editor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      viewer: "bg-green-500/20 text-green-300 border-green-500/30",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${
          badges[role as keyof typeof badges] || badges.viewer
        }`}
      >
        {role.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-lg">Kullanıcı bulunamadı</p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Kullanıcı
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Rol
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Durum
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Makale Sayısı
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Son Aktivite
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Kayıt Tarihi
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((user) => (
              <>
                <tr
                  key={user.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedUser(expandedUser === user.id ? null : user.id)
                  }
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectUser(user.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div onClick={(e) => e.stopPropagation()}>
                      <RoleAssignmentDropdown
                        currentRole={user.role}
                        onRoleChange={(newRole) =>
                          onRoleChange(user.id, newRole)
                        }
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">
                      {user.articlesCount || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Clock className="w-4 h-4" />
                      {formatDate(user.lastActive)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300 text-sm">
                      {formatDate(user.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuOpen(
                            actionMenuOpen === user.id ? null : user.id,
                          );
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-300" />
                      </button>

                      {actionMenuOpen === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-white/10 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedUser(user.id);
                              setActionMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2 rounded-t-lg"
                          >
                            <Eye className="w-4 h-4" />
                            Detayları Gör
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit functionality
                              setActionMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Düzenle
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUser(user.id);
                              setActionMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 rounded-b-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded Row - Activity Timeline */}
                {expandedUser === user.id && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 bg-white/5">
                      <UserActivityTimeline
                        activities={user.activityLog || []}
                        userName={user.name}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
        <div className="text-sm text-slate-300">
          Toplam{" "}
          <span className="font-semibold text-white">{pagination.total}</span>{" "}
          kullanıcıdan{" "}
          <span className="font-semibold text-white">
            {(pagination.page - 1) * pagination.limit + 1}
          </span>
          -
          <span className="font-semibold text-white">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{" "}
          arası gösteriliyor
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Önceki
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 2,
              )
              .map((page, index, array) => (
                <>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span
                      key={`ellipsis-${page}`}
                      className="px-2 text-slate-400"
                    >
                      ...
                    </span>
                  )}
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      pagination.page === page
                        ? "bg-purple-600 text-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {page}
                  </button>
                </>
              ))}
          </div>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Sonraki
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
