export type MediaType = "book" | "music";

export interface SearchResult {
  id: string;
  type: MediaType;
  title: string;
  subtitle: string;
  coverUrl?: string;
  externalUrl?: string;
  year?: number;
  details: Record<string, any>;
}

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  "artist-credit"?: Array<{
    artist?: { id: string; name: string };
    name?: string;
  }>;
  "cover-art-archive"?: {
    front: boolean;
    artwork: boolean;
  };
}