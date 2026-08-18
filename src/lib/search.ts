import { SearchResult } from "./types";

const MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2";
const COVERART_URL = "https://coverartarchive.org";
const ITUNES_URL = "https://itunes.apple.com";

const UA = "Songseerr/1.0 (https://songseerr.local)";

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
async function resolveItunesCover(title: string, artist: string): Promise<string | undefined> {
  const key = `${title.toLowerCase()}|${artist.toLowerCase()}`;
  if (coverCache.has(key)) return coverCache.get(key);
  try {
    const data = await fetchJson(
      `${ITUNES_URL}/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=1`
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

export async function searchMusicBrainz(query: string, limit = 12, offset = 0): Promise<SearchResult[]> {
  // Prefer releases BY an artist matching the query: the plain query also returns
  // albums merely *titled* like the search term by unrelated bands (e.g. searching
  // "radiohead" surfaces "Radiohead" by X-Dream). Fall back to a title search when
  // no artist matches (e.g. the query is an album name).
  let data = await mbSearch(
    `/release/?query=${encodeURIComponent(`artist:"${query}"`)}&fmt=json&limit=${limit * 2}&offset=${offset}`
  );
  if (!data?.releases?.length) {
    data = await mbSearch(`/release/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit * 2}&offset=${offset}`);
  }
  if (!data?.releases) return [];

  // Rank by relevance, then prefer releases that actually have cover art,
  // and de-duplicate by normalized title (multiple editions of one album).
  const seen = new Set<string>();
  const releases: any[] = (data.releases || [])
    .slice()
    .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
    .sort((a: any, b: any) => {
      const ac = a["cover-art-archive"]?.front ? 1 : 0;
      const bc = b["cover-art-archive"]?.front ? 1 : 0;
      return bc - ac;
    })
    .filter((r: any) => {
      const key = `${r.title}`.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
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
      if (!r.coverUrl) r.coverUrl = await resolveItunesCover(r.title, r.subtitle);
    })
  );

  return results;
}

export async function searchMusicBrainzArtists(query: string): Promise<SearchResult[]> {
  const data = await mbSearch(`/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=12`);
  if (!data?.artists) return [];

  const results = (data.artists || [])
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

  // Fill missing artist images from iTunes (entity=musicArtist returns artworkUrl)
  await Promise.all(
    results.map(async (a: any) => {
      if (!a.coverUrl) a.coverUrl = await resolveArtistImage(a.title);
    })
  );

  return results;
}

// Resolve an artist image via iTunes (MusicBrainz has no artist art endpoint).
// MusicBrainz / iTunes artist entities carry no artwork, so grab the artist's
// top album cover as a stand-in artist image.
async function resolveArtistImage(artist: string): Promise<string | undefined> {
  const key = `artist|${artist.toLowerCase()}`;
  if (coverCache.has(key)) return coverCache.get(key);
  try {
    const data = await fetchJson(
      `${ITUNES_URL}/search?term=${encodeURIComponent(artist)}&entity=album&limit=1&attribute=artistTerm`
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

// Unified search now only searches music
export async function unifiedSearch(query: string) {
  const [music, artists, tracks] = await Promise.all([
    searchMusicBrainz(query),
    searchMusicBrainzArtists(query),
    searchMusicBrainzTracks(query),
  ]);
  return { music, artists, tracks };
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

export async function getReleaseGroupCover(releaseGroupId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${COVERART_URL}/release-group/${releaseGroupId}/front-500`, {
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
    if (!data) return {};
    // Enrich with a real bio + photo from Wikipedia. MusicBrainz exposes a
    // wikidata relation; resolve it to the English Wikipedia page title.
    const relations: any[] = data.relations || data["url-relations"] || [];
    const wikiRel = relations.find((r: any) => r.type === "wikipedia");
    const wikidataRel = relations.find((r: any) => r.type === "wikidata");
    let wikiPage: string | undefined = wikiRel?.url?.resource?.split("/wiki/").pop();
    if (!wikiPage && wikidataRel?.url?.resource) {
      try {
        const wdId = wikidataRel.url.resource.split("/wiki/").pop();
        const wd = await fetchJson(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(wdId)}&props=sitelinks&sitefilter=enwiki&format=json`,
          undefined,
          6000
        );
        wikiPage = wd?.entities?.[wdId]?.sitelinks?.enwiki?.title;
      } catch {
        // ignore; bio/image enrichment is best-effort
      }
    }
    if (wikiPage) {
      try {
        const wikiData = await fetchJson(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiPage)}`,
          undefined,
          6000
        );
        if (wikiData) {
          data._bio = wikiData.extract;
          data._image = wikiData.thumbnail?.source;
          data._wikiUrl = wikiData.content_urls?.desktop?.page;
        }
      } catch {
        // ignore; bio/image enrichment is best-effort
      }
    }
    return data;
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