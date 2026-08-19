import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyWebhook } from "@/lib/requests";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-songseerr-token");
  if (signature !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { event, externalId, type, title } = body;

  if (event === "library.scanned" && externalId) {
await prisma.libraryItem.create({
       data: { title: title || externalId, externalId, type: type || "music", source: "external" },
     });
  }

  await notifyWebhook(event, body);
  return NextResponse.json({ ok: true });
}