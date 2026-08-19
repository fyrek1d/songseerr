import { getLidarrConfig } from "./settings";
import type { LibraryItemInput } from "./integrations";

interface ArrAlbum {
  id: number;
  title: string;
  artist?: { artistName?: string };
  foreignAlbumId?: string;
  images?: Array<{ url: string; coverType: string }>;
}

interface ArrSearchResult {
  id: number;
  title: string;
  artistName?: string;
  foreignId?: string;
  images?: Array<{ url: string; coverType: string }>;
}

async function arrRequest(baseUrl: string, apiKey: string, path: string) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  console.log(`[ArrRequest] ${url}`);
  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    console.log(`[ArrRequest] ERROR ${res.status} ${url}`);
    return null;
  }
  const data = await res.json();
  console.log(`[ArrRequest] OK ${url} -> ${Array.isArray(data) ? data.length : typeof data} items`);
  return data;
}

async function arrPost(baseUrl: string, apiKey: string, path: string, body: any) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

async function arrPut(baseUrl: string, apiKey: string, path: string, body: any) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

// Lidarr stores MusicBrainz *release-group* ids as `foreignAlbumId`, but
// Songseerr's music requests carry a MusicBrainz *release* id. Resolve the
// release-group id so album lookups/dedup against Lidarr actually match.
async function resolveReleaseGroupId(releaseId: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/release/${encodeURIComponent(releaseId)}?inc=release-groups&fmt=json`,
      {
        headers: { "User-Agent": "Songseerr/1.0 (https://songseerr.local)" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.["release-group"]?.id;
  } catch {
    return undefined;
  }
}

export async function searchReadarr(query: string): Promise<ArrSearchResult[]> {
  // Readarr functionality removed - music only
  return [];
}

export async function searchLidarr(query: string): Promise<ArrSearchResult[]> {
  const config = await getLidarrConfig();
  if (!config?.url || !config?.apiKey) return [];
  const data = await arrRequest(config.url, config.apiKey, `/api/v1/search?term=${encodeURIComponent(query)}`);
  return Array.isArray(data) ? data : [];
}

export async function hasInReadarr(externalId: string): Promise<boolean> {
  // Readarr functionality removed - music only
  return false;
}

export async function hasInLidarr(externalId: string, type?: string): Promise<boolean> {
  const config = await getLidarrConfig();
  if (!config?.url || !config?.apiKey) return false;

  // For artist requests, check artists by foreignArtistId
  if (type === "artist") {
    const artists = await arrRequest(config.url, config.apiKey, `/api/v1/artist?foreignArtistId=${encodeURIComponent(externalId)}`);
    if (Array.isArray(artists)) {
      return artists.some((artist: any) => artist.foreignArtistId === externalId);
    }
    return false;
  }

  // Lidarr keys albums by MusicBrainz release-group id; Songseerr's externalId
  // is a release id, so resolve it before comparing.
  const rgId = (await resolveReleaseGroupId(externalId)) || externalId;
  const data = await arrRequest(config.url, config.apiKey, `/api/v1/album?foreignAlbumId=${encodeURIComponent(rgId)}`);
  if (!Array.isArray(data)) return false;
  return data.some((album: any) => album.foreignAlbumId === rgId);
}

export async function pushToReadarr(title: string, externalId: string, authorName?: string): Promise<boolean> {
  // Readarr functionality removed - music only
  return false;
}
export async function pushToLidarr(title: string, externalId: string, artistName?: string): Promise<boolean> {
  const config = await getLidarrConfig();
  if (!config?.url || !config?.apiKey) return false;

  const qualityProfileId = config?.qualityProfileId || 1;
  const metadataProfileId = config?.metadataProfileId || 1;

  const roots = await arrRequest(config.url, config.apiKey, "/api/v1/rootfolder");
  const rootPath = Array.isArray(roots) && roots.length > 0 ? roots[0].path : "/music";

  // Track requests pass "Artist — Album" as the subtitle; reduce it to the artist name only
  const cleanArtistName = (artistName || "").split(/\s*—\s*/)[0].trim() || artistName;

  const searchResults = await arrRequest(
    config.url,
    config.apiKey,
    `/api/v1/search?term=${encodeURIComponent(cleanArtistName || title)}`
  );

  const term = (cleanArtistName || title).toLowerCase();

  const match = Array.isArray(searchResults)
    ? searchResults.find(
        (r: any) =>
          r.foreignId === externalId ||
          r.artist?.foreignArtistId === externalId ||
          r.artist?.artistName?.toLowerCase().includes(term)
      )
    : null;

  if (!match || !match.artist) return false;

  // Does this artist already exist in Lidarr? (Lidarr ignores the
  // foreignArtistId query filter, so find the matching row ourselves.)
  const existing = await arrRequest(
    config.url,
    config.apiKey,
    `/api/v1/artist?foreignArtistId=${encodeURIComponent(match.artist.foreignArtistId)}`
  );
  const existingArtist =
    Array.isArray(existing) && existing.length > 0
      ? existing.find((a: any) => a.foreignArtistId === match.artist.foreignArtistId) || null
      : null;

  if (existingArtist) {
    // Artist already monitored — add the specific requested album (Lidarr keys
    // albums by MusicBrainz release-group id) and trigger a search for it.
    const rgId = await resolveReleaseGroupId(externalId);
    if (rgId) {
      const existingAlbums = await arrRequest(
        config.url,
        config.apiKey,
        `/api/v1/album?foreignAlbumId=${encodeURIComponent(rgId)}`
      );
      const alreadyMonitored =
        Array.isArray(existingAlbums) &&
        existingAlbums.some((a: any) => a.foreignAlbumId === rgId && a.monitored);
      if (!alreadyMonitored) {
        const lookup = await arrRequest(
          config.url,
          config.apiKey,
          `/api/v1/album/lookup?term=mbid:${encodeURIComponent(rgId)}`
        );
        const album = Array.isArray(lookup)
          ? lookup.find((a: any) => a.foreignAlbumId === rgId)
          : null;
        if (album) {
          album.artistId = existingArtist.id;
          album.monitored = true;
          delete album.id;
          const added = await arrPost(config.url, config.apiKey, "/api/v1/album", album);
          if (added?.id) {
            await arrPost(config.url, config.apiKey, "/api/v1/command", {
              name: "AlbumSearch",
              albumIds: [added.id],
            });
          }
        }
      }
    }
    return true;
  }

  // Artist not in Lidarr yet — add the artist with all albums monitored and
  // searchForMissingAlbums so the requested release gets grabbed.
  const artistPayload = {
    ...match.artist,
    status: "active" as const,
    monitorNewItems: "all" as const,
    monitored: true,
    qualityProfileId,
    metadataProfileId,
    rootFolderPath: rootPath,
    addOptions: {
      monitor: "all" as const,
      searchForMissingAlbums: true,
    },
  };

  delete (artistPayload as any).id;
  delete (artistPayload as any).artistMetadataId;

  const result = await arrPost(
    config.url,
    config.apiKey,
    "/api/v1/artist",
    artistPayload
  );

  if (!result) {
    const existingCheck = await arrRequest(
      config.url,
      config.apiKey,
      `/api/v1/artist?foreignArtistId=${encodeURIComponent(match.artist.foreignArtistId)}`
    );
    if (Array.isArray(existingCheck) && existingCheck.length > 0) {
      return true;
    }
  }

  return !!result;
}

export async function scanReadarr(): Promise<LibraryItemInput[]> {
  // Readarr functionality removed - music only
  return [];
}

export async function scanLidarr(): Promise<LibraryItemInput[]> {
  const config = await getLidarrConfig();
  if (!config?.url || !config?.apiKey) return [];
  const items: LibraryItemInput[] = [];

  const artists = await arrRequest(config.url, config.apiKey, `/api/v1/artist`);
  for (const artist of Array.isArray(artists) ? artists : []) {
    const albums = await arrRequest(
      config.url,
      config.apiKey,
      `/api/v1/album?artistId=${await artist.id}`
    );
    for (const album of Array.isArray(albums) ? albums : []) {
      items.push({
        title: album.title || "",
        artist: album.artist?.artistName || artist.artistName,
        type: "music",
        externalId: String(album.id),
        source: "lidarr",
        coverUrl: album.images?.[0]?.url,
      });
    }
  }
  return items;
}