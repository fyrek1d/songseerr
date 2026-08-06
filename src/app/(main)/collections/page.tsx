import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { Badge } from "@/components/ui/badge";
import { Music } from "lucide-react";

export default async function CollectionsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  const collections = await prisma.collection.findMany({
    include: {
      user: { select: { username: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mine = collections.filter((c) => c.userId === userId);
  const public_ = collections.filter((c) => c.userId !== userId && c.isPublic);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <CreateCollectionDialog />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My collections ({mine.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <Music className="h-5 w-5 text-muted-foreground" />
                <Badge variant={c.isPublic ? "secondary" : "outline"}>
                  {c.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
              <h3 className="mt-2 font-semibold">{c.name}</h3>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{c._count.items} items</p>
            </Link>
          ))}
          {mine.length === 0 && (
            <p className="text-muted-foreground">You haven't created any collections.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Public collections ({public_.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {public_.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <h3 className="font-semibold">{c.name}</h3>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                by {c.user.username} · {c._count.items} items
              </p>
            </Link>
          ))}
          {public_.length === 0 && (
            <p className="text-muted-foreground">No public collections yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}