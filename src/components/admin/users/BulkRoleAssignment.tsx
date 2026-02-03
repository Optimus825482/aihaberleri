"use client";

import { Shield, X, Users } from "lucide-react";

interface Props {
  selectedCount: number;
  onAssignRole: (role: string) => void;
  onClear: () => void;
}

const roles = [
  {
    value: "admin",
    label: "Admin",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    hoverColor: "hover:bg-red-500/30",
    borderColor: "border-red-500/30",
  },
  {
    value: "editor",
    label: "Editor",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    hoverColor: "hover:bg-blue-500/30",
    borderColor: "border-blue-500/30",
  },
  {
    value: "viewer",
    label: "Viewer",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    hoverColor: "hover:bg-green-500/30",
    borderColor: "border-green-500/30",
  },
];

export default function BulkRoleAssignment({
  selectedCount,
  onAssignRole,
  onClear,
}: Props) {
  return (
    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-4 border border-purple-500/30 mb-6 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side - Info */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/30 rounded-lg">
            <Users className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <p className="text-white font-semibold">
              {selectedCount} kullanıcı seçildi
            </p>
            <p className="text-purple-200 text-sm">
              Toplu rol ataması yapabilirsiniz
            </p>
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2">
          {/* Role Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-purple-200 font-medium mr-2">
              Rol Ata:
            </span>
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => onAssignRole(role.value)}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm
                  ${role.bgColor} ${role.color} ${role.borderColor} ${role.hoverColor}
                  border transition-all duration-200
                  flex items-center gap-2
                  hover:scale-105 active:scale-95
                `}
              >
                <Shield className="w-4 h-4" />
                {role.label}
              </button>
            ))}
          </div>

          {/* Clear Button */}
          <button
            onClick={onClear}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Seçimi temizle"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Warning Message */}
      <div className="mt-3 pt-3 border-t border-purple-500/30">
        <p className="text-xs text-purple-200 flex items-start gap-2">
          <span className="text-yellow-400 font-bold">⚠️</span>
          <span>
            <strong>Dikkat:</strong> Toplu rol ataması seçili tüm kullanıcıların
            yetkilerini değiştirecektir. Bu işlem geri alınamaz.
          </span>
        </p>
      </div>
    </div>
  );
}
