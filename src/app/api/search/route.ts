import { NextRequest, NextResponse } from "next/server";
import { unifiedSearch, searchOpenLibrary, searchGoogleBooks, searchMusicBrainz, searchMusicBrainzArtists, searchMusicBrainzTracks } from "@/lib/search";

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
      } else if (field === "title") {
        books = await searchOpenLibrary(`title:"${query}"`);
      } else if (field === "series") {
        books = await searchOpenLibrary(query);
      } else {
        books = await searchOpenLibrary(query);
        if (books.length === 0) books = await searchGoogleBooks(query);
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
        [music, artists, tracks] = await Promise.all([
          searchMusicBrainz(query),
          searchMusicBrainzArtists(query),
          searchMusicBrainzTracks(query),
        ]);
      }
      return NextResponse.json({ books: [], music, artists, tracks });
    }

    const results = await unifiedSearch(query);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}