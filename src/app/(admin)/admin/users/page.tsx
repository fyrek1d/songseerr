import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      _count: { select: { requests: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return <UsersClient users={users as any} currentUserId={currentUserId} />;
}