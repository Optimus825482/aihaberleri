"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Shortcut {
    keys: string[];
    description: string;
    category: string;
}

const shortcuts: Shortcut[] = [
    // Navigation
    { keys: ["Ctrl", "1-9"], description: "Hızlı sayfa navigasyonu", category: "Navigasyon" },
    { keys: ["G", "D"], description: "Dashboard'a git", category: "Navigasyon" },
    { keys: ["G", "A"], description: "Makalelere git", category: "Navigasyon" },
    { keys: ["G", "C"], description: "Kategorilere git", category: "Navigasyon" },
    { keys: ["G", "S"], description: "Ayarlara git", category: "Navigasyon" },
    { keys: ["G", "N"], description: "Newsletter'a git", category: "Navigasyon" },

    // Actions
    { keys: ["Ctrl", "K"], description: "Arama alanına odaklan", category: "Eylemler" },
    { keys: ["Ctrl", "N"], description: "Yeni makale oluştur", category: "Eylemler" },
    { keys: ["Ctrl", "S"], description: "Formu kaydet", category: "Eylemler" },
    { keys: ["Esc"], description: "Modal kapat / Seçimi iptal et", category: "Eylemler" },

    // General
    { keys: ["?"], description: "Kısayolları göster", category: "Genel" },
];

export function KeyboardShortcutsDialog() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger in input fields
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                return;
            }

            // ? key to open shortcuts dialog
            if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                setOpen(true);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, Shortcut[]>);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5 text-primary" />
                        Klavye Kısayolları
                    </DialogTitle>
                    <DialogDescription>
                        Admin panelinde hızlı navigasyon için kullanabileceğiniz kısayollar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                        <div key={category}>
                            <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {categoryShortcuts.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <span className="text-sm">{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <span key={keyIndex}>
                                                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded shadow-sm">
                                                        {key}
                                                    </kbd>
                                                    {keyIndex < shortcut.keys.length - 1 && (
                                                        <span className="mx-1 text-muted-foreground">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t text-center">
                    <p className="text-xs text-muted-foreground">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">?</kbd>
                        {" "}tuşuna basarak bu pencereyi açabilirsiniz
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
