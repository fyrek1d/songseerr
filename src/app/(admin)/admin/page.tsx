import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Users, ListMusic, AlertCircle, Database, ArrowUpRight } from "lucide-react";

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

  const statCards = [
    { title: "Users", value: users, icon: Users, description: "Registered users" },
    { title: "Requests", value: requests, icon: ListMusic, description: "Total requests" },
    { title: "Open Issues", value: issues, icon: AlertCircle, description: "Need attention" },
    { title: "Library Items", value: libraryCount, icon: Database, description: "Tracks in Navidrome" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your Songseerr instance</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-border bg-card hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold">Pending Requests</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/admin/requests" />}>
              View all
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            )}
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.user.username} · {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {r.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold">Open Issues</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/admin/issues" />}>
              Triage
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {openIssues.length === 0 && (
              <p className="text-sm text-muted-foreground">No open issues.</p>
            )}
            {openIssues.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{i.itemTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.title} · reported by {i.reporter.username}
                  </p>
                </div>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">open</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}