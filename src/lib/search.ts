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

export async function searchMusicBrainz(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${MUSICBRAINZ_URL}/release/?query=${encodeURIComponent(query)}&fmt=json&limit=12`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.releases || []).map((release: any) => {
      const artist = (release["artist-credit"] || [])
        .map((ac: any) => ac.name || ac.artist?.name || "")
        .filter(Boolean)
        .join(", ");
      const hasArt = release["cover-art-archive"]?.front === true;
      return {
        id: release.id,
        type: "music" as const,
        title: release.title,
        subtitle: artist || "Unknown artist",
        coverUrl: hasArt ? `${COVERART_URL}/release/${release.id}/front-250` : undefined,
        externalUrl: `https://musicbrainz.org/release/${release.id}`,
        year: release.date ? parseInt(release.date.slice(0, 4), 10) : undefined,
        details: { source: "musicbrainz", releaseDate: release.date },
      };
    });
  } catch {
    return [];
  }
}

export async function unifiedSearch(query: string) {
  const [books, music] = await Promise.all([
    searchOpenLibrary(query).then(async (open) => {
      if (open.length > 0) return open;
      return searchGoogleBooks(query);
    }),
    searchMusicBrainz(query),
  ]);
  return { books, music };
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