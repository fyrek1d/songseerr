import { prisma } from "./prisma";

export interface AppSettingsData {
  musicBrainzEnabled: boolean;
  autoApproveTrusted: boolean;
  requestLimit: number;
  webhookUrl?: string;
  libraryIntegration: {
    jellyfin?: {
      url: string;
      apiKey: string;
    };
    navidrome?: {
      url: string;
      password: string;
      username?: string;
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
  // Audiobookshelf functionality removed - music only
  return undefined;
}

export async function getNavidromeConfig() {
  const settings = await getSettings();
  return settings.libraryIntegration.navidrome;
}

export async function getReadarrConfig() {
  // Readarr functionality removed - music only
  return undefined;
}

export async function getLidarrConfig() {
  const settings = await getSettings();
  return settings.libraryIntegration.lidarr;
}

export async function getWebhookUrl() {
  const settings = await getSettings();
  return settings.webhookUrl;
}