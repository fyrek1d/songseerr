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
  const { status } = body;
  if (!["open", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const issue = await prisma.issue.update({
    where: { id: params.id },
    data: {
      status,
      resolvedById: status === "resolved" ? (session?.user as any)?.id : null,
      resolvedAt: status === "resolved" ? new Date() : null,
    },
  });

  return NextResponse.json(issue);
});