import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getSettings, saveSettings } from "@/lib/settings";

export const GET = withAuth(async () => {
  const settings = await getSettings();
  return NextResponse.json(settings);
});

export const POST = withAuth(async (req: NextRequest) => {
  const session = await (await import("next-auth")).getServerSession(
    (await import("@/lib/auth")).authOptions
  );
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  await saveSettings(body);
  return NextResponse.json({ ok: true });
});