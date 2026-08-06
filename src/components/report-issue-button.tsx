"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Flag } from "lucide-react";

export function ReportIssueButton({
  itemTitle,
  itemType,
  itemId,
}: {
  itemTitle: string;
  itemType: string;
  itemId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setLoading(true);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        itemTitle,
        itemType,
        itemId,
      }),
    });
    setLoading(false);
    setOpen(false);
    if (res.ok) {
      toast({ title: "Issue reported", variant: "success" });
      setTitle("");
      setDescription("");
      router.refresh();
    } else {
      toast({ title: "Failed to report", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Flag className="h-4 w-4" /> Report issue
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>
            Is something wrong with <strong>{itemTitle}</strong> in the library?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Issue type</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken download, wrong metadata, corrupt file"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail about the problem..."
            />
          </div>
          <Button onClick={submit} disabled={loading || !title.trim()} className="w-full">
            {loading ? "Submitting..." : "Submit report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}