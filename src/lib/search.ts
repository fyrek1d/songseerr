import { SearchResult } from "./types";

const OPEN_LIBRARY_URL = "https://openlibrary.org";
const MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2";
const COVERART_URL = "https://coverartarchive.org";
const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1";
const ITUNES_URL = "https://itunes.apple.com";

const UA = "MediaSeer/1.0 (https://mediaseer.local)";

// iTunes lookups are cached so repeat searches don't hammer the API
const coverCache = new Map<string, string | undefined>();

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, headers?: Record<string, string>, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// MusicBrainz enforces ~1 request/second and throttles bursts with 429/503.
// Retry throttled responses and fail fast instead of hanging forever.
async function mbSearch(path: string): Promise<any | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${MUSICBRAINZ_URL}${path}`, {
        headers: { "User-Agent": UA },
        signal: controller.signal,
      });
      if (res.status === 429 || res.status === 503) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt === 2) return null;
      await sleep(1000 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function artistOf(item: any): string {
  return (item["artist-credit"] || [])
    .map((ac: any) => ac.name || ac.artist?.name || "")
    .filter(Boolean)
    .join(", ");
}

// Resolve a cover via iTunes (fast, reliable, NOT archive.org-dependent).
// Falls back to nothing so the card shows the placeholder icon.
async function resolveItunesCover(title: string, artist: string, entity: "album" | "ebook"): Promise<string | undefined> {
  const key = `${entity}:${title.toLowerCase()}|${artist.toLowerCase()}`;
  if (coverCache.has(key)) return coverCache.get(key);
  try {
    const data = await fetchJson(
      `${ITUNES_URL}/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=${entity}&limit=1`
    );
    const url = data?.results?.[0]?.artworkUrl100;
    const resolved = url ? url.replace("100x100bb", "600x600bb") : undefined;
    coverCache.set(key, resolved);
    return resolved;
  } catch {
    coverCache.set(key, undefined);
    return undefined;
  }
}

export async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  try {
    const data = await fetchJson(
      `${OPEN_LIBRARY_URL}/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i,already_read_count,want_to_read_count&sort=already_read_count%20desc`
    );
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
      popularity: doc.already_read_count || doc.want_to_read_count || 0,
      details: { source: "openlibrary" },
    }));
  } catch {
    return [];
  }
}

export async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  try {
    const data = await fetchJson(
      `${GOOGLE_BOOKS_URL}/volumes?q=${encodeURIComponent(query)}&maxResults=12&country=US`
    );
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
        popularity: 0,
        details: { source: "googlebooks" },
      };
    });
  } catch {
    return [];
  }
}

export async function searchiTunesBooks(query: string): Promise<SearchResult[]> {
  try {
    const data = await fetchJson(`${ITUNES_URL}/search?term=${encodeURIComponent(query)}&entity=ebook&limit=12`);
    return (data.results || []).map((r: any) => ({
      id: String(r.trackId || r.collectionId || r.title),
      type: "book" as const,
      title: r.trackName || r.collectionName,
      subtitle: r.artistName || "Unknown author",
      coverUrl: r.artworkUrl100 ? r.artworkUrl100.replace("100x100bb", "600x600bb") : undefined,
      externalUrl: r.trackViewUrl || r.collectionViewUrl || undefined,
      year: r.releaseDate ? parseInt(r.releaseDate.slice(0, 4), 10) : undefined,
      popularity: 0,
      details: { source: "itunes" },
    }));
  } catch {
    return [];
  }
}

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const open = await searchOpenLibrary(query);
  if (open.length > 0) return open;
  const google = await searchGoogleBooks(query);
  if (google.length > 0) return google;
  return searchiTunesBooks(query);
}

export async function searchMusicBrainz(query: string, limit = 12, offset = 0): Promise<SearchResult[]> {
  const data = await mbSearch(`/release/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}&offset=${offset}`);
  if (!data?.releases) return [];

  // Rank by relevance, then prefer releases that actually have cover art
  const releases: any[] = (data.releases || [])
    .slice()
    .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
    .sort((a: any, b: any) => {
      const ac = a["cover-art-archive"]?.front ? 1 : 0;
      const bc = b["cover-art-archive"]?.front ? 1 : 0;
      return bc - ac;
    });

  const results = releases.slice(0, limit).map((release: any) => {
    const artist = artistOf(release);
    return {
      id: release.id,
      type: "music" as const,
      title: release.title,
      subtitle: artist || "Unknown artist",
      coverUrl: release["cover-art-archive"]?.front
        ? `${COVERART_URL}/release/${release.id}/front-250`
        : undefined,
      externalUrl: `https://musicbrainz.org/release/${release.id}`,
      year: release.date ? parseInt(release.date.slice(0, 4), 10) : undefined,
      popularity: release.score || 0,
      details: { source: "musicbrainz", releaseDate: release.date, hasCover: release["cover-art-archive"]?.front },
    };
  });

  // Fill missing covers from iTunes (parallel, cached)
  await Promise.all(
    results.map(async (r: any) => {
      if (!r.coverUrl) r.coverUrl = await resolveItunesCover(r.title, r.subtitle, "album");
    })
  );

  return results;
}

export async function searchMusicBrainzArtists(query: string): Promise<SearchResult[]> {
  const data = await mbSearch(`/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=12`);
  if (!data?.artists) return [];
  return (data.artists || [])
    .slice()
    .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
    .map((artist: any) => ({
      id: artist.id,
      type: "artist" as const,
      title: artist.name,
      subtitle: artist.country ? `Artist from ${artist.country}` : "Artist",
      coverUrl: undefined,
      externalUrl: `https://musicbrainz.org/artist/${artist.id}`,
      year: artist["life-span"]?.begin ? parseInt(artist["life-span"].begin.slice(0, 4), 10) : undefined,
      popularity: artist.score || 0,
      details: { source: "musicbrainz", type: artist.type, country: artist.country, lifeSpan: artist["life-span"] },
    }));
}

export async function searchMusicBrainzTracks(query: string): Promise<SearchResult[]> {
  const data = await mbSearch(`/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=12`);
  if (!data?.recordings) return [];
  return (data.recordings || [])
    .slice()
    .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
    .map((recording: any) => {
      const artist = artistOf(recording);
      const release =
        recording.releases?.find((r: any) => r["cover-art-archive"]?.front) || recording.releases?.[0];
      return {
        id: recording.id,
        type: "track" as const,
        title: recording.title,
        subtitle: artist || "Unknown artist",
        coverUrl: release ? `${COVERART_URL}/release/${release.id}/front-250` : undefined,
        externalUrl: `https://musicbrainz.org/recording/${recording.id}`,
        year: release?.date ? parseInt(release.date.slice(0, 4), 10) : undefined,
        popularity: recording.score || 0,
        details: { source: "musicbrainz", releaseId: release?.id, releaseTitle: release?.title },
      };
    });
}

export async function unifiedSearch(query: string) {
  const [books, music, artists, tracks] = await Promise.all([
    searchBooks(query),
    searchMusicBrainz(query),
    searchMusicBrainzArtists(query),
    searchMusicBrainzTracks(query),
  ]);
  return { books, music, artists, tracks };
}

export async function searchBooksWithFallback(query: string): Promise<SearchResult[]> {
  return searchBooks(query);
}

export async function getBookDetails(workId: string): Promise<Record<string, any>> {
  try {
    return await fetchJson(`${OPEN_LIBRARY_URL}/works/${workId}.json`);
  } catch {
    return {};
  }
}

export async function getBookCover(coverId?: number): Promise<string | undefined> {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;
}

export async function getReleaseDetails(releaseId: string): Promise<Record<string, any>> {
  try {
    const data = await mbSearch(`/release/${releaseId}?inc=artists+recordings+labels+release-groups&fmt=json`);
    return data || {};
  } catch {
    return {};
  }
}

export async function getReleaseTracks(releaseId: string): Promise<any[]> {
  const data = await getReleaseDetails(releaseId);
  return data.media?.[0]?.tracks || [];
}

export async function getReleaseCover(releaseId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${COVERART_URL}/release/${releaseId}/front-500`, {
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? res.url : undefined;
  } catch {
    return undefined;
  }
}

export async function getArtistDetails(artistId: string): Promise<Record<string, any>> {
  try {
    const data = await mbSearch(`/artist/${artistId}?inc=url-rels+tags+genres&fmt=json`);
    return data || {};
  } catch {
    return {};
  }
}

export async function getArtistReleases(artistId: string): Promise<any[]> {
  try {
    const data = await mbSearch(`/release-group?artist=${artistId}&type=album|ep&limit=12&fmt=json`);
    return data?.["release-groups"] || [];
  } catch {
    return [];
  }
}

export async function getRecordingDetails(recordingId: string): Promise<Record<string, any>> {
  try {
    const data = await mbSearch(`/recording/${recordingId}?inc=artists+releases+release-groups&fmt=json`);
    return data || {};
  } catch {
    return {};
  }
}