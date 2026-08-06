import { prisma } from "@/lib/prisma";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
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

  return <UsersClient users={users as any} />;
}