"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CoverImage } from "./media-card";
import { useToast } from "@/components/ui/use-toast";

interface RequestButtonProps {
  item: {
    type: "music" | "artist" | "track";
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
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoApproveTrusted, setAutoApproveTrusted] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/request-policy")
      .then((r) => r.json())
      .then((d) => {
        if (active) setAutoApproveTrusted(!!d.autoApproveTrusted);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const role = (session?.user as any)?.role;
  const willAutoApprove = autoApproveTrusted && (role === "trusted" || role === "admin");

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
            ? "Request approved."
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
            {willAutoApprove && (
              <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                You&apos;re a trusted user — this request will be auto-approved.
              </p>
            )}
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