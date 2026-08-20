import { SearchResult } from "./types";

const MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2";
const COVERART_URL = "https://coverartarchive.org";
const ITUNES_URL = "https://itunes.apple.com";

const UA = "Songseerr/1.0 (https://songseerr.local)";

// iTunes / Cover Art Archive lookups are cached so repeat searches don't hammer the APIs
const coverCache = new Map<string, string | undefined>();
const caaCache = new Map<string, boolean>();

function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Loose-but-safe equality: exact match, or one side fully contains the other
// (e.g. "Is This It" vs "Is This It (Remastered)"). Short strings can't match
// via containment, to avoid nonsense collisions.
function fuzzyEqual(a: string, b: string): boolean {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && na.includes(nb)) return true;
  if (nb.length >= 4 && nb.includes(na)) return true;
  return false;
}

// A query matches an artist name when the name is the same phrase or the
// phrase appears as a whole word (so "paramore" matches "Jim Paramore" and
// "Paramore GB" but not "Paramoreish"). Multi-word queries use containment.
function nameMatches(query: string, name: string): boolean {
  const nq = normalizeForMatch(query);
  const na = normalizeForMatch(name);
  if (!nq || !na) return false;
  if (na === nq) return true;
  if (nq.includes(" ")) return na.includes(nq);
  return na.split(" ").includes(nq);
}

// Cheap existence check for a Cover Art Archive image URL. front-250 responds
// with a 307 redirect to the real image (or 404 when no art exists) — do NOT
// follow it: hitting the image CDN is slow and has caused these checks to take
// 3-6s each (and time out for valid covers). The redirect code alone answers it.
async function hasCover(url: string): Promise<boolean> {
  if (caaCache.has(url)) return caaCache.get(url)!;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      const ok = res.status >= 200 && res.status < 400;
      caaCache.set(url, ok);
      return ok;
    } catch {
      if (attempt === 1) {
        caaCache.set(url, false);
        return false;
      }
      // brief pause before retry
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  caaCache.set(url, false);
  return false;
}

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

// Resolve a cover via iTunes, but ONLY when the album genuinely matches
// (artist + title both fuzzy-match). iTunes returns unrelated albums for titles
// it doesn't carry (e.g. The Strokes' "Is This It" → "Angles"), so blindly
// taking the first result produced wrong art.
async function resolveItunesCover(title: string, artist: string): Promise<string | undefined> {
  const key = `${title.toLowerCase()}|${artist.toLowerCase()}`;
  if (coverCache.has(key)) return coverCache.get(key);
  try {
    const data = await fetchJson(
      `${ITUNES_URL}/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=25`
    );
    const match = (data?.results || []).find(
      (r: any) => r.artistName && fuzzyEqual(r.artistName, artist) && fuzzyEqual(r.collectionName, title)
    );
    const url = match?.artworkUrl100;
    const resolved = url ? url.replace("100x100bb", "600x600bb") : undefined;
    coverCache.set(key, resolved);
    return resolved;
  } catch {
    coverCache.set(key, undefined);
    return undefined;
  }
}

// Request a deep result set from both the release-group and release searches.
const RELEASE_SEARCH_LIMIT = 100;

// Lower rank = higher priority. Albums surface before EPs/singles, and live /
// compilation / remix / demo / soundtrack albums are demoted below studio albums
// so a discography shows the main records first.
const typeRank: Record<string, number> = { Album: 0, EP: 1, Single: 2, Broadcast: 3, Other: 4 };
// Live/compilation/remix/demo/... releases are demoted below studio albums.
// The release-group search response sometimes omits secondary-types (e.g. a
// live album can come back with sec: null), so also check the title.
const nonStudioHint = /live|session|b-?sides|remix|demo|compilation|soundtrack|mixtape|bootleg|deluxe|tour|radio|unplugged|anniversary/i;

function groupRank(rg: any): number {
  const pt = rg?.["primary-type"] || "Other";
  let rank = typeRank[pt] ?? 5;
  if (pt === "Album") {
    const sec = (rg?.["secondary-types"] || []).join(" ");
    if (nonStudioHint.test(`${sec} ${rg?.title || ""}`)) rank = 1;
  }
  return rank;
}

export async function searchMusicBrainz(query: string, limit = 12, offset = 0): Promise<SearchResult[]> {
  // The release search only returns ~100 relevance-ranked releases and can omit
  // studio albums entirely (e.g. Riot! never appears for "paramore"), so order
  // the discography from the release-GROUP search (complete, distinct albums)
  // and use the release search just to get a concrete release id per album for
  // the detail page.
  let rgData = await mbSearch(
    `/release-group/?query=${encodeURIComponent(`artist:"${query}"`)}&fmt=json&limit=${RELEASE_SEARCH_LIMIT}&offset=${offset}`
  );
  if (!rgData?.["release-groups"]?.length) {
    rgData = await mbSearch(
      `/release-group/?query=${encodeURIComponent(`"${query}"`)}&fmt=json&limit=${RELEASE_SEARCH_LIMIT}&offset=${offset}`
    );
  }
  const groups: any[] = rgData?.["release-groups"] || [];

  let relData = await mbSearch(
    `/release/?query=${encodeURIComponent(`artist:"${query}"`)}&fmt=json&limit=${RELEASE_SEARCH_LIMIT}&offset=${offset}`
  );
  if (!relData?.releases?.length) {
    relData = await mbSearch(
      `/release/?query=${encodeURIComponent(`"${query}"`)}&fmt=json&limit=${RELEASE_SEARCH_LIMIT}&offset=${offset}`
    );
  }
  const releaseByRg = new Map<string, any>();
  for (const rel of relData?.releases || []) {
    const rgId = rel["release-group"]?.id;
    if (rgId && !releaseByRg.has(rgId)) releaseByRg.set(rgId, rel);
  }

  const seen = new Set<string>();
  const ranked = groups
    .map((rg: any) => ({ rg, release: releaseByRg.get(rg.id) }))
    .sort((a, b) => {
      const ra = groupRank(a.rg);
      const rb = groupRank(b.rg);
      if (ra !== rb) return ra - rb;
      const scoreDiff = (b.rg.score || 0) - (a.rg.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.rg["first-release-date"] || "9999").localeCompare(b.rg["first-release-date"] || "9999");
    })
    .filter((entry) => {
      const key = normalizeForMatch(entry.rg.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const top = ranked.slice(0, limit);

  // Groups the release search omitted (studio albums can sit outside its 100
  // result window) get a concrete release id from the release-group lookup.
  await Promise.all(
    top
      .filter((entry) => !entry.release)
      .map(async (entry) => {
        const gd = await mbSearch(`/release-group/${entry.rg.id}?inc=releases&fmt=json`);
        const rel = gd?.releases?.[0];
        if (rel?.id) entry.release = rel;
      })
  );

  const results: (SearchResult | null)[] = top.map(({ rg, release }) => {
    if (!release?.id) return null;
    const artist = artistOf(rg);
    return {
      id: release.id,
      type: "music" as const,
      title: rg.title,
      subtitle: artist || "Unknown artist",
      coverUrl: undefined as string | undefined,
      externalUrl: `https://musicbrainz.org/release/${release.id}`,
      year: rg["first-release-date"] ? parseInt(rg["first-release-date"].slice(0, 4), 10) : undefined,
      popularity: rg.score || 0,
      details: {
        source: "musicbrainz",
        releaseDate: rg["first-release-date"],
        releaseGroupId: rg.id,
        primaryType: rg["primary-type"],
      },
    };
  });

  // Resolve covers in parallel: Cover Art Archive (release-group art, most
  // reliable) first, then a verified iTunes lookup.
  await Promise.all(
    top.map(async ({ rg, release }, i: number) => {
      if (!results[i]) return;
      const rgUrl = `${COVERART_URL}/release-group/${rg.id}/front-250`;
      if (await hasCover(rgUrl)) {
        results[i]!.coverUrl = rgUrl;
        return;
      }
      const relUrl = `${COVERART_URL}/release/${release.id}/front-250`;
      if (await hasCover(relUrl)) {
        results[i]!.coverUrl = relUrl;
        return;
      }
      results[i]!.coverUrl = await resolveItunesCover(results[i]!.title, results[i]!.subtitle);
    })
  );

  return results.filter((r): r is SearchResult => r !== null);
}

export async function searchMusicBrainzArtists(query: string): Promise<SearchResult[]> {
  // Quote the phrase AND require the artist's name to actually contain the
  // query. An unquoted MusicBrainz artist search matches ANY term, so "tame
  // impala" also surfaces every artist named "Tame" or "Impala".
  const data = await mbSearch(`/artist/?query=${encodeURIComponent(`"${query}"`)}&fmt=json&limit=24`);
  if (!data?.artists) return [];

  const nq = normalizeForMatch(query);
  const seenNames = new Set<string>();
  const artists = (data.artists || [])
    .filter((artist: any) => nameMatches(query, artist.name))
    .sort((a: any, b: any) => {
      const ea = normalizeForMatch(a.name) === nq ? 0 : 1;
      const eb = normalizeForMatch(b.name) === nq ? 0 : 1;
      if (ea !== eb) return ea - eb;
      return (b.score || 0) - (a.score || 0);
    })
    .filter((artist: any) => {
      const key = normalizeForMatch(artist.name);
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .slice(0, 12);

  const results = artists.map((artist: any) => ({
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
// Only use a result whose artistName actually matches, so a fuzzy search term
// doesn't show an unrelated artist's album cover.
async function resolveArtistImage(artist: string): Promise<string | undefined> {
  const key = `artist|${artist.toLowerCase()}`;
  if (coverCache.has(key)) return coverCache.get(key);
  try {
    const data = await fetchJson(
      `${ITUNES_URL}/search?term=${encodeURIComponent(artist)}&entity=album&limit=25&attribute=artistTerm`
    );
    const match = (data?.results || []).find((r: any) => r.artistName && fuzzyEqual(r.artistName, artist));
    const url = match?.artworkUrl100;
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

  const sorted = (data.recordings || [])
    .slice()
    .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

  const results = sorted.map((recording: any) => {
    const artist = artistOf(recording);
    const release =
      recording.releases?.find((r: any) => r["cover-art-archive"]?.front) || recording.releases?.[0];
    return {
      id: recording.id,
      type: "track" as const,
      title: recording.title,
      subtitle: artist || "Unknown artist",
      coverUrl: undefined as string | undefined,
      externalUrl: `https://musicbrainz.org/recording/${recording.id}`,
      year: release?.date ? parseInt(release.date.slice(0, 4), 10) : undefined,
      popularity: recording.score || 0,
      details: { source: "musicbrainz", releaseId: release?.id, releaseTitle: release?.title },
    };
  });

  // Verify the release's Cover Art Archive image actually exists before using
  // it, then fall back to a verified iTunes match.
  await Promise.all(
    results.map(async (r: any, i: number) => {
      const recording = sorted[i];
      const release =
        recording?.releases?.find((x: any) => x["cover-art-archive"]?.front) || recording?.releases?.[0];
      if (release?.id) {
        const url = `${COVERART_URL}/release/${release.id}/front-250`;
        if (await hasCover(url)) {
          r.coverUrl = url;
          return;
        }
      }
      r.coverUrl = await resolveItunesCover(r.title, r.subtitle);
    })
  );

  return results;
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
    // Fetch releases (not release-groups) so each item carries a real release id
    // the /detail/music/:id page can look up. Dedupe by release-group so each
    // distinct album appears once, preferring official Album/EP releases.
    const data = await mbSearch(
      `/release?artist=${artistId}&inc=release-groups+artist-credits&limit=100&fmt=json`
    );
    const releases: any[] = data?.releases || [];
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const rel of releases) {
      const rg = rel["release-group"];
      if (!rg || seen.has(rg.id)) continue;
      seen.add(rg.id);
      deduped.push(rel);
    }
    const typeRank: Record<string, number> = {
      Album: 0,
      EP: 1,
      Single: 2,
      Broadcast: 3,
      Other: 4,
    };
    deduped.sort((a, b) => {
      const ra = typeRank[a["release-group"]?.["primary-type"] ?? "Other"] ?? 5;
      const rb = typeRank[b["release-group"]?.["primary-type"] ?? "Other"] ?? 5;
      if (ra !== rb) return ra - rb;
      return (a.date || "").localeCompare(b.date || "");
    });
    return deduped.slice(0, 12);
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