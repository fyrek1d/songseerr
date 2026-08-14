import { SearchBar } from "@/components/search-bar";
import { MediaCard } from "@/components/media-card";
import { SearchBar as SearchBarComponent, SearchCategory } from "@/components/search-bar";
import { Button } from "@/components/ui/button";

const BOOK_FIELDS = [
  { value: "", label: "All fields" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "series", label: "Series" },
] as const;

const MUSIC_FIELDS = [
  { value: "", label: "All fields" },
  { value: "album", label: "Album" },
  { value: "artist", label: "Artist" },
  { value: "track", label: "Track" },
] as const;

type BookField = typeof BOOK_FIELDS[number]["value"];
type MusicField = typeof MUSIC_FIELDS[number]["value"];

async function searchApi(query: string, category: SearchCategory, field?: BookField | MusicField) {
  const params = new URLSearchParams({ q: query, category });
  if (field) params.set("field", field);
  const res = await fetch(`/api/search?${params.toString()}`, {
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

  const total = books.length + music.length + artists.length + tracks.length;
  const fields = category === "books" ? BOOK_FIELDS : MUSIC_FIELDS;
  const activeField = field || "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          Results for "{query}" {category === "books" ? "(Books)" : "(Music)"}
        </h1>
        <div className="max-w-md flex-1">
          <SearchBarComponent initialValue={query} initialCategory={category} />
        </div>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground">No results found. Try a different search or field.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <Button
                key={f.value || "all"}
                variant={activeField === (f.value || "all") ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams({ q: query, category });
                  if (f.value) params.set("field", f.value);
                  window.location.href = `/search?${params.toString()}`;
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {books.map((book: any) => (
              <MediaCard key={`b-${book.id}`} {...book} icon="book" />
            ))}
            {music.map((release: any) => (
              <MediaCard key={`m-${release.id}`} {...release} icon="music" />
            ))}
            {artists.map((artist: any) => (
              <MediaCard key={`a-${artist.id}`} {...artist} icon="artist" />
            ))}
            {tracks.map((track: any) => (
              <MediaCard key={`t-${track.id}`} {...track} icon="track" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}