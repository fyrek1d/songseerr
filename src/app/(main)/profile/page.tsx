import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session?.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const [requests, collections, libraryCount] = await Promise.all([
    prisma.request.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.collection.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
    }),
    prisma.libraryItem.count(),
  ]);

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    available: requests.filter((r) => r.status === "available").length,
    total: requests.length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {user.username[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{user.username}</CardTitle>
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total requests</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Pending</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.pending}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Approved</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.approved}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Available</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.available}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Request history</h2>
          <ProfileClient requests={requests as any} />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My collections ({collections.length})</h2>
          <div className="space-y-2">
            {collections.map((c) => (
              <a
                key={c.id}
                href={`/collections/${c.id}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/50"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c._count.items} items · {c.isPublic ? "public" : "private"}
                  </p>
                </div>
              </a>
            ))}
            {collections.length === 0 && (
              <p className="text-sm text-muted-foreground">No collections yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}