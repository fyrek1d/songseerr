import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default async function AdminDashboard() {
  const [users, requests, issues, libraryCount, pendingRequests, openIssues] =
    await Promise.all([
      prisma.user.count(),
      prisma.request.count(),
      prisma.issue.count(),
      prisma.libraryItem.count(),
      prisma.request.findMany({
        where: { status: "pending" },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
      prisma.issue.findMany({
        where: { status: "open" },
        include: { reporter: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{users}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Requests</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{requests}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Open issues</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{issues}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Library items</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{libraryCount}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pending requests</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/admin/requests" />}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            )}
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.user.username} · {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge variant="secondary">{r.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Open issues</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/admin/issues" />}>
              Triage
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {openIssues.length === 0 && (
              <p className="text-sm text-muted-foreground">No open issues.</p>
            )}
            {openIssues.map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{i.itemTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.title} · reported by {i.reporter.username}
                  </p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">open</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}