import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "songseerr", time: new Date().toISOString() });
}