import { SearchBar as SearchBarComponent, SearchCategory } from "@/components/search-bar";
import { headers } from "next/headers";
import SearchResults from "./search-results";

// Used for types and runtime values
const BOOK_FIELDS = [
  { value: "", label: "All fields" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "series", label: "Series" },
];

const MUSIC_FIELDS = [
  { value: "", label: "All fields" },
  { value: "album", label: "Album" },
  { value: "artist", label: "Artist" },
  { value: "track", label: "Track" },
];

type BookField = typeof BOOK_FIELDS[number]["value"];
type MusicField = typeof MUSIC_FIELDS[number]["value"];

function getBaseUrl() {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const proto = headersList.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

async function searchApi(query: string, category: SearchCategory, field?: BookField | MusicField) {
  const params = new URLSearchParams({ q: query, category });
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
  searchParams: Promise<{ q?: string; category?: string; field?: string }>;
}) {
  const { q, category: catParam, field: fieldParam } = await searchParams;
  const query = q;
  const category = (catParam as SearchCategory) || "books";
  const field = fieldParam as BookField | MusicField | "";

  if (!query) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Search</h1>
        <div className="max-w-xl">
          <SearchBarComponent initialCategory={category} />
        </div>
        <p className="text-muted-foreground">Search for books and music across the web.</p>
      </div>
    );
  }

  const results = await searchApi(query, category, field);

  const books = results.books || [];
  const music = results.music || [];
  const artists = results.artists || [];
  const tracks = results.tracks || [];

  return (
    <SearchResults
      query={query}
      category={category}
      field={field}
      initialBooks={books}
      initialMusic={music}
      initialArtists={artists}
      initialTracks={tracks}
    />
  );
}