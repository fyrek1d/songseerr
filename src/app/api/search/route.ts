import { NextRequest, NextResponse } from "next/server";
import { unifiedSearch, searchMusicBrainz, searchMusicBrainzArtists, searchMusicBrainzTracks, sleep } from "@/lib/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const category = request.nextUrl.searchParams.get("category") as "music" | null;
  const field = request.nextUrl.searchParams.get("field");

  if (!query || query.length < 2) {
    return NextResponse.json({ music: [], artists: [], tracks: [] });
  }

  try {
    if (category === "music") {
      let music: any[] = [];
      let artists: any[] = [];
      let tracks: any[] = [];
      if (field === "artist") {
        artists = await searchMusicBrainzArtists(query);
      } else if (field === "album") {
        music = await searchMusicBrainz(query);
      } else if (field === "track") {
        tracks = await searchMusicBrainzTracks(query);
      } else {
        // MusicBrainz rate-limits to ~1 req/sec: serialize the three lookups
        music = await searchMusicBrainz(query);
        await sleep(400);
        artists = await searchMusicBrainzArtists(query);
        await sleep(400);
        tracks = await searchMusicBrainzTracks(query);
      }
      return NextResponse.json({ music, artists, tracks });
    }

    const results = await unifiedSearch(query);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}