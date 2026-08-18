import { searchMusicBrainz } from "@/lib/search";
import { SearchResult } from "./types";

export interface MusicGenre {
  label: string;
  query: string;
}

export const MUSIC_GENRES: MusicGenre[] = [
  { label: "Rock", query: "rock" },
  { label: "Electronic", query: "electronic" },
  { label: "Hip-Hop", query: "hip-hop" },
  { label: "Jazz", query: "jazz" },
  { label: "Pop", query: "pop" },
  { label: "Classical", query: "classical" },
  { label: "Folk", query: "folk" },
  { label: "Blues", query: "blues" },
  { label: "Metal", query: "metal" },
  { label: "Soul", query: "soul" },
  { label: "Country", query: "country" },
  { label: "Reggae", query: "reggae" },
  { label: "Punk", query: "punk" },
  { label: "Ambient", query: "ambient" },
  { label: "R&B", query: "r&b" },
  { label: "Funk", query: "funk" },
];

export const MUSIC_GENRES_PER_DAY = 3;

const DAY_MS = 86400000;

// Days since Unix epoch — deterministic and timezone-independent, so the
// rotation is stable for everyone within a given day.
export function getDayIndex(date = new Date()): number {
  return Math.floor(date.getTime() / DAY_MS);
}

// Deterministically pick `count` items spread evenly across a pool for a given
// day, so consecutive days never fully repeat and the whole pool cycles over
// time.
export function pickRotated<T>(pool: T[], dayIndex: number, count: number): T[] {
  const size = pool.length;
  if (size === 0) return [];
  if (count >= size) return pool;
  const step = size / count;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(pool[Math.floor((dayIndex + i * step) % size)]);
  }
  return picked;
}

function interleave<T extends SearchResult>(groups: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  const max = groups.reduce((m, g) => Math.max(m, g.length), 0);
  for (let i = 0; i < max; i++) {
    for (const group of groups) {
      const item = group[i];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function musicQuery(tag: string): string {
  return `primarytype:album AND tag:${tag} AND status:official`;
}

export function getTodayMusicGenres(): MusicGenre[] {
  return pickRotated(MUSIC_GENRES, getDayIndex(), MUSIC_GENRES_PER_DAY);
}

export async function getPopularMusic(): Promise<SearchResult[]> {
  const genres = getTodayMusicGenres();
  const groups: SearchResult[][] = [];
  for (let i = 0; i < genres.length; i++) {
    const genre = genres[i];
    const offset = (getDayIndex() * 5) % 60;
    const results = await searchMusicBrainz(musicQuery(genre.query), 8, offset);
    if (results.length > 0) groups.push(results);
    if (i < genres.length - 1) await sleep(300);
  }
  return interleave(groups).slice(0, 6);
}