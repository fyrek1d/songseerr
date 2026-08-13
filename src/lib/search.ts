import { SearchResult } from "./types";

const OPEN_LIBRARY_URL = "https://openlibrary.org";
const MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2";
const COVERART_URL = "https://coverartarchive.org";
const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1";

const UA = "MediaSeer/1.0 (https://mediaseer.local)";

export async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${OPEN_LIBRARY_URL}/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || []).map((doc: any) => ({
      id: doc.key.replace("/works/", ""),
      type: "book" as const,
      title: doc.title,
      subtitle: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : "Unknown author",
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : undefined,
      externalUrl: `${OPEN_LIBRARY_URL}${doc.key}`,
      year: doc.first_publish_year,
      details: { source: "openlibrary" },
    }));
  } catch {
    return [];
  }
}

export async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${GOOGLE_BOOKS_URL}/volumes?q=${encodeURIComponent(query)}&maxResults=12&country=US`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: any) => {
      const info = item.volumeInfo || {};
      const img = info.imageLinks;
      return {
        id: item.id,
        type: "book" as const,
        title: info.title,
        subtitle: info.authors?.join(", ") || "Unknown author",
        coverUrl: img?.thumbnail || img?.smallThumbnail,
        externalUrl: info.canonicalVolumeLink || item.selfLink,
        year: info.publishedDate ? parseInt(info.publishedDate, 10) : undefined,
        details: { source: "googlebooks" },
      };
    });
  } catch {
    return [];
  }
}

export async function searchMusicBrainz(query: string, limit = 12, offset = 0): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${MUSICBRAINZ_URL}/release/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}&offset=${offset}`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.releases || []).map((release: any) => {
      const artist = (release["artist-credit"] || [])
        .map((ac: any) => ac.name || ac.artist?.name || "")
        .filter(Boolean)
        .join(", ");
      return {
        id: release.id,
        type: "music" as const,
        title: release.title,
        subtitle: artist || "Unknown artist",
        coverUrl: `${COVERART_URL}/release/${release.id}/front-250`,
        externalUrl: `https://musicbrainz.org/release/${release.id}`,
        year: release.date ? parseInt(release.date.slice(0, 4), 10) : undefined,
        details: { source: "musicbrainz", releaseDate: release.date },
      };
    });
  } catch {
    return [];
  }
}

export async function searchMusicBrainzArtists(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${MUSICBRAINZ_URL}/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=12`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.artists || []).map((artist: any) => ({
      id: artist.id,
      type: "artist" as const,
      title: artist.name,
      subtitle: artist.country ? `Artist from ${artist.country}` : "Artist",
      coverUrl: undefined,
      externalUrl: `https://musicbrainz.org/artist/${artist.id}`,
      year: artist["life-span"]?.begin ? parseInt(artist["life-span"].begin.slice(0, 4), 10) : undefined,
      details: { source: "musicbrainz", type: artist.type, country: artist.country, lifeSpan: artist["life-span"] },
    }));
  } catch {
    return [];
  }
}

export async function searchMusicBrainzTracks(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${MUSICBRAINZ_URL}/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=12`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.recordings || []).map((recording: any) => {
      const artist = (recording["artist-credit"] || [])
        .map((ac: any) => ac.name || ac.artist?.name || "")
        .filter(Boolean)
        .join(", ");
      const release = recording.releases?.[0];
      return {
        id: recording.id,
        type: "track" as const,
        title: recording.title,
        subtitle: artist || "Unknown artist",
        coverUrl: release ? `${COVERART_URL}/release/${release.id}/front-250` : undefined,
        externalUrl: `https://musicbrainz.org/recording/${recording.id}`,
        year: release?.date ? parseInt(release.date.slice(0, 4), 10) : undefined,
        details: { source: "musicbrainz", releaseId: release?.id, releaseTitle: release?.title },
      };
    });
  } catch {
    return [];
  }
}

export async function unifiedSearch(query: string) {
  const [books, music, artists, tracks] = await Promise.all([
    searchOpenLibrary(query).then(async (open) => {
      if (open.length > 0) return open;
      return searchGoogleBooks(query);
    }),
    searchMusicBrainz(query),
    searchMusicBrainzArtists(query),
    searchMusicBrainzTracks(query),
  ]);
  return { books, music, artists, tracks };
}

export async function searchBooksWithFallback(query: string): Promise<SearchResult[]> {
  const books = await searchOpenLibrary(query);
  if (books.length > 0) return books;
  return searchGoogleBooks(query);
}

export async function getBookDetails(workId: string): Promise<Record<string, any>> {
  const res = await fetch(`${OPEN_LIBRARY_URL}/works/${workId}.json`);
  if (!res.ok) return {};
  return res.json();
}

export async function getBookCover(coverId?: number): Promise<string | undefined> {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;
}

export async function getReleaseDetails(releaseId: string): Promise<Record<string, any>> {
  const res = await fetch(
    `${MUSICBRAINZ_URL}/release/${releaseId}?inc=artists+recordings+labels+release-groups&fmt=json`,
    { headers: { "User-Agent": UA } }
  );
  if (!res.ok) return {};
  return res.json();
}

export async function getReleaseTracks(releaseId: string): Promise<any[]> {
  const data = await getReleaseDetails(releaseId);
  return data.media?.[0]?.tracks || [];
}

export async function getReleaseCover(releaseId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${COVERART_URL}/release/${releaseId}/front-500`);
    return res.ok ? res.url : undefined;
  } catch {
    return undefined;
  }
}

export async function getArtistDetails(artistId: string): Promise<Record<string, any>> {
  try {
    const res = await fetch(
      `${MUSICBRAINZ_URL}/artist/${artistId}?inc=url-rels+tags+genres&fmt=json`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export async function getArtistReleases(artistId: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${MUSICBRAINZ_URL}/release-group?artist=${artistId}&type=album|ep&limit=12&fmt=json`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data["release-groups"] || [];
  } catch {
    return [];
  }
}

export async function getRecordingDetails(recordingId: string): Promise<Record<string, any>> {
  try {
    const res = await fetch(
      `${MUSICBRAINZ_URL}/recording/${recordingId}?inc=artists+releases+release-groups&fmt=json`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}