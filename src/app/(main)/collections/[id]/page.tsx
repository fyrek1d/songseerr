import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { CollectionDetailClient } from "./collection-detail-client";

export default async function CollectionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === "admin";

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { username: true } },
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!collection) notFound();
  if (!collection.isPublic && collection.userId !== userId && !isAdmin) notFound();

  return (
    <CollectionDetailClient
      collection={collection as any}
      isOwner={collection.userId === userId}
    />
  );
}