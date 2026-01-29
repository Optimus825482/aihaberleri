import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

/**
 * Admin Panel Keyboard Shortcuts Hook
 *
 * Shortcuts:
 * - Ctrl+K: Focus search
 * - Ctrl+N: New article
 * - Ctrl+B: Toggle sidebar (mobile)
 * - Ctrl+S: Save (prevent default)
 * - Esc: Close modals/clear selection
 * - G then D: Go to Dashboard
 * - G then A: Go to Articles
 * - G then C: Go to Categories
 * - G then S: Go to Settings
 */
export function useAdminShortcuts(options?: {
  onSearch?: () => void;
  onEscape?: () => void;
  onSave?: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    let keySequence = "";
    let sequenceTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl+K: Search (works everywhere)
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        if (options?.onSearch) {
          options.onSearch();
        } else {
          const searchInput = document.getElementById(
            "search-input",
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
        return;
      }

      // Ctrl+N: New article
      if (e.ctrlKey && e.key === "n" && !isInput) {
        e.preventDefault();
        router.push("/admin/create");
        return;
      }

      // Ctrl+S: Save (prevent default browser save)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (options?.onSave) {
          options.onSave();
        }
        return;
      }

      // Esc: Close modals/clear selection
      if (e.key === "Escape") {
        if (options?.onEscape) {
          options.onEscape();
        }
        // Close any open dialogs
        const closeButtons = document.querySelectorAll(
          "[data-radix-dialog-close]",
        );
        if (closeButtons.length > 0) {
          (closeButtons[0] as HTMLButtonElement).click();
        }
        return;
      }

      // Don't process other shortcuts while typing
      if (isInput) return;

      // Vim-style navigation (G then X)
      if (e.key === "g" || e.key === "G") {
        keySequence = "g";
        clearTimeout(sequenceTimeout);
        sequenceTimeout = setTimeout(() => {
          keySequence = "";
        }, 1000);
        return;
      }

      if (keySequence === "g") {
        switch (e.key) {
          case "d":
            router.push("/admin");
            break;
          case "a":
            router.push("/admin/articles");
            break;
          case "c":
            router.push("/admin/categories");
            break;
          case "s":
            router.push("/admin/settings");
            break;
          case "m":
            router.push("/admin/messages");
            break;
          case "n":
            router.push("/admin/newsletter");
            break;
          case "v":
            router.push("/admin/visitors");
            break;
        }
        keySequence = "";
      }

      // Number keys (1-9) for quick navigation
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          e.preventDefault();
          const navLinks = [
            "/admin", // 1: Dashboard
            "/admin/articles", // 2: Articles
            "/admin/categories", // 3: Categories
            "/admin/messages", // 4: Messages
            "/admin/newsletter", // 5: Newsletter
            "/admin/notifications", // 6: Notifications
            "/admin/visitors", // 7: Visitors
            "/admin/settings", // 8: Settings
            "/admin/agent-settings", // 9: Agent
          ];
          if (navLinks[num - 1]) {
            router.push(navLinks[num - 1]);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(sequenceTimeout);
    };
  }, [router, options]);
}

/**
 * Keyboard Shortcuts Help Dialog Component
 */
export function KeyboardShortcutsHelp() {
  const shortcuts: ShortcutConfig[] = [
    {
      key: "Ctrl+K",
      action: () => {},
      description: "Focus search input",
    },
    {
      key: "Ctrl+N",
      action: () => {},
      description: "Create new article",
    },
    {
      key: "Ctrl+S",
      action: () => {},
      description: "Save current form",
    },
    {
      key: "Esc",
      action: () => {},
      description: "Close modal/clear selection",
    },
    {
      key: "Ctrl+1-9",
      action: () => {},
      description: "Quick navigation (1=Dashboard, 2=Articles, etc.)",
    },
    {
      key: "G then D",
      action: () => {},
      description: "Go to Dashboard",
    },
    {
      key: "G then A",
      action: () => {},
      description: "Go to Articles",
    },
    {
      key: "G then C",
      action: () => {},
      description: "Go to Categories",
    },
    {
      key: "G then S",
      action: () => {},
      description: "Go to Settings",
    },
  ];

  return { shortcuts };
}
