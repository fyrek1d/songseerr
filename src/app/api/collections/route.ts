import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest) => {
  const mine = req.nextUrl.searchParams.get("mine") === "true";
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  const collections = await prisma.collection.findMany({
    where: mine ? { userId } : { isPublic: true },
    include: {
      user: { select: { username: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(collections);
});

export const POST = withAuth(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const body = await req.json();
  const { name, description, isPublic } = body;

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const collection = await prisma.collection.create({
    data: { name, description, isPublic: isPublic ?? true, userId },
  });

  return NextResponse.json(collection, { status: 201 });
});