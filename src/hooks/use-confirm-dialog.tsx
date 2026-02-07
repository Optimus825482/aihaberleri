"use client";

import React from "react";
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

interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

/**
 * Native confirm() yerine kullanılan modern AlertDialog hook'u
 *
 * Kullanım:
 * ```tsx
 * const confirm = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Silmek istediğinize emin misiniz?",
 *     description: "Bu işlem geri alınamaz.",
 *     confirmText: "Evet, Sil",
 *     variant: "destructive",
 *   });
 *
 *   if (confirmed) {
 *     // Silme işlemi
 *   }
 * };
 * ```
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmDialogOptions>({
    title: "",
    description: "",
    confirmText: "Onayla",
    cancelText: "İptal",
    variant: "default",
  });
  const [resolvePromise, setResolvePromise] = React.useState<
    ((value: boolean) => void) | null
  >(null);

  const confirm = React.useCallback(
    (newOptions: ConfirmDialogOptions): Promise<boolean> => {
      setOptions({
        ...newOptions,
        confirmText: newOptions.confirmText || "Onayla",
        cancelText: newOptions.cancelText || "İptal",
        variant: newOptions.variant || "default",
      });
      setIsOpen(true);

      return new Promise((resolve) => {
        setResolvePromise(() => resolve);
      });
    },
    [],
  );

  const handleConfirm = React.useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(true);
  }, [resolvePromise]);

  const handleCancel = React.useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(false);
  }, [resolvePromise]);

  const ConfirmDialog = React.useCallback(
    () =>
      isOpen ? (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>
                {options.cancelText}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className={
                  options.variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }
              >
                {options.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null,
    [isOpen, options, handleConfirm, handleCancel],
  );

  return { confirm, ConfirmDialog };
}
