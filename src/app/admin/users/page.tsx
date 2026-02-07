"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Activity,
  Search,
  Filter,
  KeyRound,
} from "lucide-react";
import toast from "react-hot-toast";
import UserListTable from "@/components/admin/users/UserListTable";
import CreateUserModal from "@/components/admin/users/CreateUserModal";
import UserSearchBar from "@/components/admin/users/UserSearchBar";
import BulkRoleAssignment from "@/components/admin/users/BulkRoleAssignment";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function UsersPage() {
  const { toast: shadcnToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  // Password reset dialog state
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState<{ id: string; email: string } | null>(null);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error("Kullanıcılar yüklenemedi");

      const data = await response.json();
      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast.error("Kullanıcılar yüklenirken hata oluştu");
      console.error("Fetch users error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchQuery, roleFilter, statusFilter]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error("Rol güncellenemedi");

      toast.success("Kullanıcı rolü güncellendi");
      fetchUsers();
    } catch (error) {
      toast.error("Rol güncellenirken hata oluştu");
      console.error("Role change error:", error);
    }
  };

  // Handle user delete - show confirmation dialog
  const handleDeleteUser = (userId: string, userName: string) => {
    setDeleteConfirm({ id: userId, name: userName });
  };

  // Confirm delete user
  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch(`/api/admin/users/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Kullanıcı silinemedi");

      toast.success("Kullanıcı silindi");
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      toast.error("Kullanıcı silinirken hata oluştu");
      console.error("Delete user error:", error);
    }
  };

  // Handle password reset - show confirmation dialog
  const handlePasswordReset = (userId: string, email: string) => {
    setResetPasswordConfirm({ id: userId, email });
  };

  // Confirm password reset
  const confirmPasswordReset = async () => {
    if (!resetPasswordConfirm) return;

    try {
      const response = await fetch(`/api/admin/users/${resetPasswordConfirm.id}/reset-password`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Şifre sıfırlama başarısız");

      const data = await response.json();
      shadcnToast({
        title: "Şifre Sıfırlandı",
        description: `${resetPasswordConfirm.email} için yeni şifre: ${data.tempPassword}`,
      });
      setResetPasswordConfirm(null);
    } catch (error) {
      shadcnToast({
        variant: "destructive",
        title: "Hata",
        description: "Şifre sıfırlanırken hata oluştu",
      });
      console.error("Password reset error:", error);
    }
  };

  // Handle bulk role assignment
  const handleBulkRoleAssignment = async (role: string) => {
    if (selectedUsers.length === 0) {
      toast.error("Lütfen en az bir kullanıcı seçin");
      return;
    }

    try {
      const response = await fetch("/api/admin/users/bulk-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUsers, role }),
      });

      if (!response.ok) throw new Error("Toplu rol ataması başarısız");

      toast.success(`${selectedUsers.length} kullanıcının rolü güncellendi`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error("Toplu rol ataması sırasında hata oluştu");
      console.error("Bulk role assignment error:", error);
    }
  };

  // Handle user creation
  const handleCreateUser = async (userData: any) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error("Kullanıcı oluşturulamadı");

      toast.success("Kullanıcı başarıyla oluşturuldu");
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error("Kullanıcı oluşturulurken hata oluştu");
      console.error("Create user error:", error);
    }
  };

  // Stats
  const stats = {
    total: pagination.total,
    admins: users.filter((u) => u.role === "admin").length,
    editors: users.filter((u) => u.role === "editor").length,
    viewers: users.filter((u) => u.role === "viewer").length,
    active: users.filter((u) => u.status === "active").length,
  };

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.name} kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Confirmation Dialog */}
      <AlertDialog open={!!resetPasswordConfirm} onOpenChange={(open) => !open && setResetPasswordConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Şifre Sıfırla</AlertDialogTitle>
            <AlertDialogDescription>
              {resetPasswordConfirm?.email} kullanıcısının şifresini sıfırlamak istediğinizden emin misiniz? Geçici bir şifre oluşturulacak ve kullanıcıya gönderilecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPasswordReset}>
              Evet, Sıfırla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-10 h-10" />
              Kullanıcı Yönetimi
            </h1>
            <p className="text-slate-300">
              Kullanıcıları yönetin, roller atayın ve aktiviteleri takip edin
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-purple-500/50"
          >
            <UserPlus className="w-5 h-5" />
            Yeni Kullanıcı
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Toplam</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Admin</p>
                <p className="text-2xl font-bold text-white">{stats.admins}</p>
              </div>
              <Shield className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Editor</p>
                <p className="text-2xl font-bold text-white">{stats.editors}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Viewer</p>
                <p className="text-2xl font-bold text-white">{stats.viewers}</p>
              </div>
              <Shield className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Aktif</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <UserSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Kullanıcı ara (isim, email)..."
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tüm Roller</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="suspended">Askıya Alınmış</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <BulkRoleAssignment
            selectedCount={selectedUsers.length}
            onAssignRole={handleBulkRoleAssignment}
            onClear={() => setSelectedUsers([])}
          />
        )}
      </div>

      {/* User Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <UserListTable
          users={users}
          loading={loading}
          selectedUsers={selectedUsers}
          onSelectUsers={setSelectedUsers}
          onRoleChange={handleRoleChange}
          onDeleteUser={handleDeleteUser}
          onPasswordReset={handlePasswordReset}
          pagination={pagination}
          onPageChange={(page) => setPagination({ ...pagination, page })}
        />
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />
    </div>
    </>
  );
}
