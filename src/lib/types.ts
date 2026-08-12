export type MediaType = "book" | "music" | "artist" | "track";

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

export interface MusicBrainzArtist {
  id: string;
  name: string;
  type?: string;
  "country"?: string;
  "life-span"?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
}

export interface MusicBrainzRecording {
  id: string;
  title: string;
  "artist-credit"?: Array<{
    artist?: { id: string; name: string };
    name?: string;
  }>;
  releases?: Array<{
    id: string;
    title: string;
    "cover-art-archive"?: { front: boolean };
  }>;
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