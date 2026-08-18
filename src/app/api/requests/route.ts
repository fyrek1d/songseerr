import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createRequest, getRequests } from "@/lib/requests";
import { canRequest } from "@/lib/requests";

export const GET = withAuth(async (req: NextRequest) => {
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const userId = req.nextUrl.searchParams.get("userId") || undefined;
  const type = req.nextUrl.searchParams.get("type") || undefined;

  const requests = await getRequests({ status, userId, type });
  return NextResponse.json(requests);
});

export const POST = withAuth(async (req: NextRequest) => {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json(
      { error: "Demo mode is read-only — requests are disabled." },
      { status: 403 }
    );
  }

  const session = await (await import("next-auth")).getServerSession(
    (await import("@/lib/auth")).authOptions
  );
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, title, subtitle, coverUrl, externalId, externalUrl, note } = body;

  if (!type || !title || !externalId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const can = await canRequest((session.user as any).id);
  if (!can) {
    return NextResponse.json({ error: "Request limit reached" }, { status: 429 });
  }

  const result = await createRequest({
    type,
    title,
    subtitle,
    coverUrl,
    externalId,
    externalUrl,
    userId: (session.user as any).id,
    note,
  });

  return NextResponse.json(
    { request: result.request, autoApproved: result.autoApproved, error: result.error },
    { status: result.status }
  );
});