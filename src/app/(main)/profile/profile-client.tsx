"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Request = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  status: string;
  createdAt: string;
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  declined: "bg-destructive/10 text-destructive",
};

export function ProfileClient({ requests }: { requests: Request[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No requests yet.</p>;
  }
  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.subtitle} · {r.type} · {format(new Date(r.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <Badge className={statusStyles[r.status]}>{r.status}</Badge>
        </div>
      ))}
    </div>
  );
}