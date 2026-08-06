import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LibraryClient } from "./library-client";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === "admin";

  const type = searchParams.type || undefined;
  const items = await prisma.libraryItem.findMany({
    where: type ? { type } : undefined,
    orderBy: { addedAt: "desc" },
    take: 200,
  });

  const counts = {
    book: await prisma.libraryItem.count({ where: { type: "book" } }),
    music: await prisma.libraryItem.count({ where: { type: "music" } }),
  };

  return (
    <LibraryClient items={items as any} counts={counts} isAdmin={isAdmin} />
  );
}