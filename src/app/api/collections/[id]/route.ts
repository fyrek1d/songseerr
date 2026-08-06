import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest, { params }: any) => {
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { items: true, user: { select: { username: true } } },
  });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(collection);
});

export const POST = withAuth(async (req: NextRequest, { params }: any) => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const body = await req.json();

  if (body.item) {
    const { title, artist, coverUrl, externalId, externalUrl, type } = body.item;
    const exists = await prisma.collectionItem.findFirst({
      where: { collectionId: params.id, externalId, type },
    });
    if (exists) return NextResponse.json({ error: "Already in collection" }, { status: 409 });

    const item = await prisma.collectionItem.create({
      data: {
        collectionId: params.id,
        title,
        artist,
        coverUrl,
        externalId,
        externalUrl,
        type,
      },
    });
    return NextResponse.json(item, { status: 201 });
  }

  if (body.action === "update") {
    const collection = await prisma.collection.findUnique({ where: { id: params.id } });
    if (!collection || collection.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.collection.update({
      where: { id: params.id },
      data: { name: body.name, description: body.description, isPublic: body.isPublic },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
});

export const DELETE = withAuth(async (req: NextRequest, { params }: any) => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.userId !== userId && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.collection.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});

export const PATCH = withAuth(async (req: NextRequest, { params }: any) => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const body = await req.json();

  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.userId !== userId && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, itemId } = body;

  if (action === "removeItem" && itemId) {
    await prisma.collectionItem.delete({
      where: { id: itemId, collectionId: params.id },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
});