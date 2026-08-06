import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const PATCH = withAuth(async (req: NextRequest, { params }: any) => {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { role: newRole } = body;
  if (!["admin", "trusted", "user"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role: newRole },
    select: { id: true, email: true, username: true, role: true },
  });

  return NextResponse.json(user);
});