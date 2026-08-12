"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CoverImage } from "./media-card";
import { useToast } from "@/components/ui/use-toast";

interface RequestButtonProps {
  item: {
    type: "book" | "music" | "artist" | "track";
    title: string;
    subtitle?: string;
    coverUrl?: string;
    externalId: string;
    externalUrl?: string;
  };
  disabled?: boolean;
  className?: string;
}

export function RequestButton({ item, disabled, className }: RequestButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        coverUrl: item.coverUrl,
        externalId: item.externalId,
        externalUrl: item.externalUrl,
        note,
      }),
    });

    const data = await res.json();
    setLoading(false);
    setOpen(false);

    if (res.status === 409) {
      toast({ title: "Already exists", description: data.error, variant: "destructive" });
    } else if (res.ok) {
      toast({
        title: "Request submitted",
        description:
          data.request?.status === "approved"
            ? "Auto-approved!"
            : "Waiting for approval.",
      });
      router.refresh();
    } else {
      toast({ title: "Error", description: data.error || "Failed to submit request", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className={className} disabled={disabled} />}>
        {disabled ? "Already requested" : "Request"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request: {item.title}</DialogTitle>
          <DialogDescription>
            {item.subtitle || "Add this item to your media library."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-4">
          <div className="w-24 shrink-0">
            <CoverImage coverUrl={item.coverUrl} title={item.title} type={item.type} />
          </div>
          <div className="flex-1 space-y-4">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (edition, format, reason...)"
              rows={4}
            />
            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? "Submitting..." : "Submit request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}