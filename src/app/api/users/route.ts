import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest) => {
  const session = await (await import("next-auth")).getServerSession(
    (await import("@/lib/auth")).authOptions
  );
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  return NextResponse.json(users);
});