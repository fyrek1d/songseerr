"use client";

import { toast as toastManager } from "@/components/ui/toast";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastOptions) => {
      toastManager.add({
        title: title || "",
        description: description || "",
        type: variant === "destructive" ? "error" : variant === "success" ? "success" : undefined,
      });
    },
  };
}