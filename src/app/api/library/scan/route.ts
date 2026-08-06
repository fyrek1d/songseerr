import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { runLibraryScan } from "@/lib/integrations";

export const POST = withAuth(async () => {
  const results = await runLibraryScan();
  return NextResponse.json({ results });
});