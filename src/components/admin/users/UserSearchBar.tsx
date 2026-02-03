"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function UserSearchBar({
  value,
  onChange,
  placeholder = "Kullanıcı ara...",
}: Props) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className="relative">
      {/* Search Icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <Search className="w-5 h-5 text-slate-400" />
      </div>

      {/* Input */}
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-12 pr-12 py-3 
          bg-white/10 border border-white/20 rounded-xl
          text-white placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
          transition-all duration-200
        "
      />

      {/* Clear Button */}
      {localValue && (
        <button
          onClick={handleClear}
          className="
            absolute right-4 top-1/2 -translate-y-1/2
            p-1 hover:bg-white/10 rounded-lg
            transition-colors duration-200
          "
          title="Temizle"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-white" />
        </button>
      )}

      {/* Search Hint */}
      {localValue && (
        <div className="absolute left-0 right-0 top-full mt-2 text-xs text-slate-400">
          <span className="bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 inline-block">
            "{localValue}" için arama yapılıyor...
          </span>
        </div>
      )}
    </div>
  );
}
