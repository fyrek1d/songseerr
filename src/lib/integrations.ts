import { prisma } from "./prisma";
import { getJellyfinConfig, getNavidromeConfig } from "./settings";
import { scanLidarr } from "./arr";

export interface LibraryItemInput {
  title: string;
  artist?: string;
  type: string;
  externalId?: string;
  source: string;
  coverUrl?: string;
}

export async function scanJellyfin(): Promise<LibraryItemInput[]> {
  const config = await getJellyfinConfig();
  if (!config?.url || !config?.apiKey) return [];

  const items: LibraryItemInput[] = [];
  const baseUrl = config.url.replace(/\/$/, "");
  const headers = { "X-Emby-Token": config.apiKey, Accept: "application/json" };

  const res = await fetch(`${baseUrl}/Users?api_key=${config.apiKey}`, { headers });
  const users = await res.json().catch(() => []);

  for (const user of Array.isArray(users) ? users : []) {
    const musicRes = await fetch(
      `${baseUrl}/Users/${user.Id}/Items?api_key=${config.apiKey}&IncludeItemTypes=Audio&Recursive=true&Fields=Album,AlbumArtist,Genres`,
      { headers }
    );
    const musicData = await musicRes.json().catch(() => null);
    for (const item of musicData?.Items || []) {
      items.push({
        title: item.Album || item.Name || "",
        artist: item.AlbumArtist || item.Artists?.[0],
        type: "music",
        externalId: item.AlbumId || item.Id,
        source: "jellyfin",
        coverUrl: item.ImageTags?.Primary
          ? `${baseUrl}/Items/${item.Id}/Images/Primary?maxHeight=250`
          : undefined,
      });
    }
  }

  return items;
}

export async function scanAudiobookshelf(): Promise<LibraryItemInput[]> {
  // Audiobookshelf functionality removed - music only
  return [];
}

export async function scanNavidrome(): Promise<LibraryItemInput[]> {
  const config = await getNavidromeConfig();
  if (!config?.url || !config?.password) return [];

  const baseUrl = config.url.replace(/\/$/, "");
  const items: LibraryItemInput[] = [];

  const auth = await fetch(
    `${baseUrl}/rest/auth`,
    { headers: { "x-subsonic-api-version": "1.16.1", "x-subsonic-client": "SongSeerr" } }
  ).catch(() => null);
  if (!auth) return [];

  const body = await auth.json().catch(() => null);
  const token = body?.["subsonic-response"]?.token;

  const artists = await fetch(
    `${baseUrl}/rest/getArtists?u=${config.username || "mediaseer"}&t=${token || ""}&s=${config.password}&v=1.16.1&c=mediaseer&f=json`
  ).then((r) => r.json()).catch(() => null);

  const artistList = artists?.["subsonic-response"]?.artists?.index || [];
  for (const index of artistList) {
    for (const artist of index.artist || []) {
      const albums = await fetch(
        `${baseUrl}/rest/getArtist?u=${config.username || "mediaseer"}&t=${token || ""}&s=${config.password}&v=1.16.1&c=mediaseer&f=json&id=${artist.id}`
      ).then((r) => r.json()).catch(() => null);

      for (const album of albums?.["subsonic-response"]?.artist?.album || []) {
        items.push({
          title: album.name || "",
          artist: album.artist || artist.name,
          type: "music",
          externalId: album.id,
          source: "navidrome",
          coverUrl: `${baseUrl}/rest/getCoverArt?u=${config.username || "mediaseer"}&t=${token || ""}&s=${config.password}&v=1.16.1&c=mediaseer&id=${album.id}`,
        });
      }
    }
  }

  return items;
}

export async function runLibraryScan(): Promise<{ added: number; source: string }[]> {
  const results: { added: number; source: string }[] = [];

  for (const [name, fn] of [
    ["jellyfin", scanJellyfin],
    ["navidrome", scanNavidrome],
    ["lidarr", scanLidarr],
  ] as const) {
    try {
      const items = await fn();
      let added = 0;
      for (const item of items) {
        if (!item.title) continue;
        const existing = await prisma.libraryItem.findFirst({
          where: {
            title: item.title,
            artist: item.artist || undefined,
            type: item.type,
            source: item.source,
          },
        });
        if (!existing) {
          await prisma.libraryItem.create({ data: item });
          added++;
        }
      }
      results.push({ source: name, added });
    } catch (error) {
      console.error(`[LibraryScan] Error scanning ${name}:`, error);
      results.push({ source: name, added: 0 });
    }
  }

  return results;
}