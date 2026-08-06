import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get("type") || undefined;
  const query = req.nextUrl.searchParams.get("q") || undefined;
  const source = req.nextUrl.searchParams.get("source") || undefined;

  const items = await prisma.libraryItem.findMany({
    where: {
      type,
      source,
      ...(query
        ? { OR: [{ title: { contains: query } }, { artist: { contains: query } }] }
        : {}),
    },
    orderBy: { addedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(items);
});