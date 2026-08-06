import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { updateRequestStatus } from "@/lib/requests";
import { REQUEST_STATUS } from "@/lib/requests";

export const PATCH = withAuth(async (req: NextRequest, { params }: any) => {
  const session = await (await import("next-auth")).getServerSession(
    (await import("@/lib/auth")).authOptions
  );
  const role = (session?.user as any)?.role;
  if (role !== "admin" && role !== "trusted") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status } = body;
  if (!Object.values(REQUEST_STATUS).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await updateRequestStatus(
    params.id,
    status,
    (session?.user as any).id
  );

  return NextResponse.json(result, { status: result.status });
});

export const DELETE = withAuth(async (req: NextRequest, { params }: any) => {
  const session = await (await import("next-auth")).getServerSession(
    (await import("@/lib/auth")).authOptions
  );
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const prisma = (await import("@/lib/prisma")).prisma;
  const existing = await prisma.request.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "admin" && existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.request.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});