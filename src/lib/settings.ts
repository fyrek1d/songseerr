import { prisma } from "./prisma";

export interface AppSettingsData {
  openLibraryEnabled: boolean;
  googleBooksEnabled: boolean;
  musicBrainzEnabled: boolean;
  autoApproveTrusted: boolean;
  requestLimit: number;
  webhookUrl?: string;
  libraryIntegration: {
    jellyfin?: {
      url: string;
      apiKey: string;
    };
    audiobookshelf?: {
      url: string;
      apiKey: string;
    };
    navidrome?: {
      url: string;
      password: string;
      username?: string;
    };
    readarr?: {
      url: string;
      apiKey: string;
      rootFolderId?: number;
      qualityProfileId?: number;
      metadataProfileId?: number;
    };
    lidarr?: {
      url: string;
      apiKey: string;
      rootFolderId?: number;
      qualityProfileId?: number;
      metadataProfileId?: number;
    };
  };
}

export const DEFAULT_SETTINGS: AppSettingsData = {
  openLibraryEnabled: true,
  googleBooksEnabled: true,
  musicBrainzEnabled: true,
  autoApproveTrusted: false,
  requestLimit: 10,
  webhookUrl: undefined,
  libraryIntegration: {},
};

export async function getSettings(): Promise<AppSettingsData> {
  const row = await prisma.appSettings.findUnique({ where: { id: "app" } });
  if (!row) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.settings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettingsData): Promise<void> {
  await prisma.appSettings.upsert({
    where: { id: "app" },
    update: { settings: JSON.stringify(settings) },
    create: { id: "app", settings: JSON.stringify(settings) },
  });
}

export async function getJellyfinConfig() {
  const settings = await getSettings();
  return settings.libraryIntegration.jellyfin;
}

export async function getAudiobookshelfConfig() {
  const settings = await getSettings();
  return settings.libraryIntegration.audiobookshelf;
}

export async function getNavidromeConfig() {
  const settings = await getSettings();
  return settings.libraryIntegration.navidrome;
}

export async function getReadarrConfig() {
  const settings = await getSettings();
  return settings.libraryIntegration.readarr;
}

export async function getLidarrConfig() {
  const settings = await getSettings();
  return settings.libraryIntegration.lidarr;
}

export async function getWebhookUrl() {
  const settings = await getSettings();
  return settings.webhookUrl;
}