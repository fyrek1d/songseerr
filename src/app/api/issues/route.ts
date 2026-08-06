import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const status = req.nextUrl.searchParams.get("status");

  const issues = await prisma.issue.findMany({
    where: {
      status: status || undefined,
      ...(role !== "admin" ? { reportedById: userId } : {}),
    },
    include: {
      reporter: { select: { username: true } },
      resolver: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(issues);
});

export const POST = withAuth(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const body = await req.json();
  const { title, description, itemTitle, itemType, itemId } = body;

  if (!title || !itemTitle) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const issue = await prisma.issue.create({
    data: { title, description, itemTitle, itemType, itemId, reportedById: userId },
  });

  return NextResponse.json(issue, { status: 201 });
});