import { NextRequest, NextResponse } from "next/server";
import { runLibraryScan } from "@/lib/integrations";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("token") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runLibraryScan();
  return NextResponse.json({ ok: true, results });
}

export const dynamic = "force-dynamic";