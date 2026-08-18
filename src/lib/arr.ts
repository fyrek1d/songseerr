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

  const data = await arrRequest(config.url, config.apiKey, `/api/v1/album?foreignAlbumId=${encodeURIComponent(externalId)}`);
  if (!Array.isArray(data)) return false;
  return data.some((album: any) => album.foreignAlbumId === externalId);
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
    const existing = await arrRequest(
      config.url,
      config.apiKey,
      `/api/v1/artist?foreignArtistId=${encodeURIComponent(match.artist.foreignArtistId)}`
    );
    if (Array.isArray(existing) && existing.length > 0) {
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