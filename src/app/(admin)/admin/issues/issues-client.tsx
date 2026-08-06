"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

type Issue = {
  id: string;
  title: string;
  description?: string;
  itemTitle: string;
  itemType: string;
  status: string;
  createdAt: string;
  reporter: { username: string };
  resolver?: { username: string } | null;
};

export function IssuesClient({ issues }: { issues: Issue[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  async function resolve(id: string) {
    const res = await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    if (res.ok) {
      toast({ title: "Issue resolved", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Failed to resolve", variant: "destructive" });
    }
  }

  const open = issues.filter((i) => i.status === "open");
  const resolved = issues.filter((i) => i.status === "resolved");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Issue Triage</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Open ({open.length})</h2>
        {open.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            expanded={expanded === issue.id}
            onToggle={() => setExpanded(expanded === issue.id ? null : issue.id)}
            onResolve={() => resolve(issue.id)}
          />
        ))}
        {open.length === 0 && (
          <p className="text-sm text-muted-foreground">No open issues.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Resolved ({resolved.length})</h2>
        {resolved.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            expanded={expanded === issue.id}
            onToggle={() => setExpanded(expanded === issue.id ? null : issue.id)}
            onResolve={() => {}}
          />
        ))}
        {resolved.length === 0 && (
          <p className="text-sm text-muted-foreground">No resolved issues.</p>
        )}
      </section>
    </div>
  );
}

function IssueCard({
  issue,
  expanded,
  onToggle,
  onResolve,
}: {
  issue: Issue;
  expanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{issue.itemTitle}</p>
            <Badge variant="secondary">{issue.itemType}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {issue.title} · reported by {issue.reporter.username} ·{" "}
            {format(new Date(issue.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        <Badge
          className={
            issue.status === "open"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }
        >
          {issue.status}
        </Badge>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="border-t px-4 py-3">
          {issue.description ? (
            <p className="text-sm text-muted-foreground">{issue.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No description provided.</p>
          )}
          {issue.status === "open" && (
            <Button size="sm" className="mt-3" onClick={onResolve}>
              <CheckCircle2 className="h-4 w-4" /> Mark resolved
            </Button>
          )}
          {issue.status === "resolved" && issue.resolver && (
            <p className="mt-2 text-xs text-muted-foreground">
              Resolved by {issue.resolver.username}
            </p>
          )}
        </div>
      )}
    </div>
  );
}