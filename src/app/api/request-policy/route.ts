import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getSettings } from "@/lib/settings";

export const GET = withAuth(async () => {
  const settings = await getSettings();
  return NextResponse.json({ autoApproveTrusted: settings.autoApproveTrusted });
});