"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, ChevronDown, Check } from "lucide-react";

interface Props {
  currentRole: "admin" | "editor" | "viewer";
  onRoleChange: (newRole: string) => void;
  disabled?: boolean;
}

const roles = [
  {
    value: "admin",
    label: "Admin",
    description: "Tam yetki - Tüm işlemler",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/30",
  },
  {
    value: "editor",
    label: "Editor",
    description: "İçerik yönetimi",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Sadece görüntüleme",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
  },
];

export default function RoleAssignmentDropdown({
  currentRole,
  onRoleChange,
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRoleData =
    roles.find((r) => r.value === currentRole) || roles[2];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleRoleSelect = (roleValue: string) => {
    if (roleValue !== currentRole) {
      onRoleChange(roleValue);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Current Role Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border
          ${currentRoleData.bgColor} ${currentRoleData.color} ${currentRoleData.borderColor}
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:opacity-80 cursor-pointer"
          }
          transition-all duration-200
        `}
      >
        <Shield className="w-4 h-4" />
        <span>{currentRoleData.label}</span>
        {!disabled && (
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden">
          <div className="p-2">
            <div className="text-xs font-semibold text-slate-400 px-3 py-2">
              ROL SEÇİN
            </div>
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                className={`
                  w-full px-3 py-2.5 rounded-lg text-left transition-all duration-200
                  hover:bg-white/10 flex items-start gap-3
                  ${role.value === currentRole ? "bg-white/5" : ""}
                `}
              >
                <div
                  className={`
                  flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                  ${role.bgColor} ${role.borderColor} border
                `}
                >
                  <Shield className={`w-4 h-4 ${role.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium ${role.color}`}>
                      {role.label}
                    </span>
                    {role.value === currentRole && (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {role.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Role Permissions Info */}
          <div className="border-t border-white/10 p-3 bg-white/5">
            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300 mb-2">
                Yetki Seviyeleri:
              </p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>
                    <strong className="text-red-400">Admin:</strong> Tüm
                    kullanıcıları yönetebilir, sistem ayarlarını değiştirebilir
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>
                    <strong className="text-blue-400">Editor:</strong> İçerik
                    oluşturabilir, düzenleyebilir ve yayınlayabilir
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>
                    <strong className="text-green-400">Viewer:</strong> Sadece
                    içerikleri görüntüleyebilir
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
