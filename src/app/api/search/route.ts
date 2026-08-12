import { NextRequest, NextResponse } from "next/server";
import { unifiedSearch } from "@/lib/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ books: [], music: [], artists: [], tracks: [] });
  }
  try {
    const results = await unifiedSearch(query);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}