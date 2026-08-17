import { NextRequest, NextResponse } from "next/server";
import { unifiedSearch, searchOpenLibrary, searchMusicBrainz, searchMusicBrainzArtists, searchMusicBrainzTracks, searchBooks, sleep } from "@/lib/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const category = request.nextUrl.searchParams.get("category") as "books" | "music" | null;
  const field = request.nextUrl.searchParams.get("field");

  if (!query || query.length < 2) {
    return NextResponse.json({ books: [], music: [], artists: [], tracks: [] });
  }

  try {
    if (category === "books") {
      let books: any[] = [];
      if (field === "author") {
        books = await searchOpenLibrary(`author:"${query}"`);
        if (books.length === 0) books = await searchBooks(query);
      } else if (field === "title") {
        books = await searchOpenLibrary(`title:"${query}"`);
        if (books.length === 0) books = await searchBooks(query);
      } else if (field === "series") {
        books = await searchBooks(query);
      } else {
        books = await searchBooks(query);
      }
      return NextResponse.json({ books, music: [], artists: [], tracks: [] });
    }

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
      return NextResponse.json({ books: [], music, artists, tracks });
    }

    const results = await unifiedSearch(query);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}