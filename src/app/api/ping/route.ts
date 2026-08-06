import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "mediaseer", time: new Date().toISOString() });
}