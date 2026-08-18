import { SearchBar as SearchBarComponent } from "@/components/search-bar";
import { headers } from "next/headers";
import SearchResults from "./search-results";

// Used for types and runtime values
const MUSIC_FIELDS = [
  { value: "", label: "All fields" },
  { value: "album", label: "Album" },
  { value: "artist", label: "Artist" },
  { value: "track", label: "Track" },
];

type MusicField = typeof MUSIC_FIELDS[number]["value"];

function getBaseUrl() {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const proto = headersList.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

async function searchApi(query: string, field?: MusicField) {
  const params = new URLSearchParams({ q: query, category: "music" });
  if (field) params.set("field", field);
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/search?${params.toString()}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; field?: string }>;
}) {
  const { q, field: fieldParam } = await searchParams;
  const query = q;
  const field = fieldParam as MusicField | "";

  if (!query) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Search</h1>
        <div className="max-w-xl">
          <SearchBarComponent />
        </div>
        <p className="text-muted-foreground">Search for music across the web.</p>
      </div>
    );
  }

  const results = await searchApi(query, field);

  const music = results.music || [];
  const artists = results.artists || [];
  const tracks = results.tracks || [];

  return (
    <SearchResults
      query={query}
      field={field}
      initialMusic={music}
      initialArtists={artists}
      initialTracks={tracks}
    />
  );
}