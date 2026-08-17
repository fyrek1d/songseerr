"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </Button>
  );
}