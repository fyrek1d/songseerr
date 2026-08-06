"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoverImage } from "@/components/media-card";
import { useToast } from "@/components/ui/use-toast";
import { Check, X, PackageCheck, Trash2 } from "lucide-react";
import { format } from "date-fns";

type Request = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  status: string;
  createdAt: string;
  note?: string;
  user: { username: string; role: string };
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  declined: "bg-destructive/10 text-destructive",
};

export function RequestsClient({
  requests,
  myRequests,
  counts,
  canModerate,
}: {
  requests: Request[];
  myRequests: Request[];
  counts: Record<string, number>;
  canModerate: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState("queue");

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast({ title: `Request ${status}`, variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  }

  async function deleteRequest(id: string) {
    const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Request removed" });
      router.refresh();
    }
  }

  function RequestRow({ r }: { r: Request }) {
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-card p-3">
        <div className="w-12 shrink-0">
          <CoverImage
            coverUrl={r.coverUrl}
            title={r.title}
            type={r.type as "book" | "music"}
            className="aspect-[2/3] rounded-sm"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{r.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {r.subtitle} · {r.type} · {format(new Date(r.createdAt), "MMM d, yyyy")}
          </p>
          {r.note && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{r.note}</p>}
        </div>
        <Badge className={statusStyles[r.status]}>{r.status}</Badge>
        {canModerate && (
          <div className="flex items-center gap-1">
            {r.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(r.id, "approved")}
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(r.id, "declined")}
                >
                  <X className="h-4 w-4" /> Decline
                </Button>
              </>
            )}
            {r.status === "approved" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "available")}>
                <PackageCheck className="h-4 w-4" /> Mark available
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => deleteRequest(r.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  const queue = requests.filter((r) => r.status === "pending" || r.status === "approved");
  const history = requests.filter((r) => r.status === "available" || r.status === "declined");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Requests</h1>
        <div className="flex gap-2">
          <Badge variant="outline">{counts.pending} pending</Badge>
          <Badge variant="outline">{counts.approved} approved</Badge>
          <Badge variant="outline">{counts.available} available</Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="queue">
            Queue {canModerate && `(${queue.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="mine">My requests ({myRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4 space-y-3">
          {queue.length === 0 && (
            <p className="text-muted-foreground">No pending requests.</p>
          )}
          {queue.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {history.length === 0 && (
            <p className="text-muted-foreground">No fulfilled or declined requests.</p>
          )}
          {history.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </TabsContent>

        <TabsContent value="mine" className="mt-4 space-y-3">
          {myRequests.length === 0 && (
            <p className="text-muted-foreground">
              You haven't made any requests yet. Search for something to get started.
            </p>
          )}
          {myRequests.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}