import { SearchBar } from "@/components/search-bar";
import { MediaCard } from "@/components/media-card";
import { searchBooksWithFallback, searchMusicBrainz, searchMusicBrainzArtists, searchMusicBrainzTracks } from "@/lib/search";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q;

  if (!query) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Search</h1>
        <div className="max-w-xl">
          <SearchBar />
        </div>
        <p className="text-muted-foreground">Search for books and music across the web.</p>
      </div>
    );
  }

  const [books, music, artists, tracks] = await Promise.all([
    searchBooksWithFallback(query),
    searchMusicBrainz(query),
    searchMusicBrainzArtists(query),
    searchMusicBrainzTracks(query),
  ]);

  const total = books.length + music.length + artists.length + tracks.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          Results for "{query}"
        </h1>
        <div className="max-w-md flex-1">
          <SearchBar initialValue={query} />
        </div>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground">No results found. Try a different search.</p>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({total})</TabsTrigger>
            <TabsTrigger value="books">Books ({books.length})</TabsTrigger>
            <TabsTrigger value="music">Albums ({music.length})</TabsTrigger>
            <TabsTrigger value="artists">Artists ({artists.length})</TabsTrigger>
            <TabsTrigger value="tracks">Tracks ({tracks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {books.map((book) => (
                <MediaCard key={`b-${book.id}`} {...book} icon="book" />
              ))}
              {music.map((release) => (
                <MediaCard key={`m-${release.id}`} {...release} icon="music" />
              ))}
              {artists.map((artist) => (
                <MediaCard key={`a-${artist.id}`} {...artist} icon="artist" />
              ))}
              {tracks.map((track) => (
                <MediaCard key={`t-${track.id}`} {...track} icon="track" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="books" className="mt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {books.map((book) => (
                <MediaCard key={`b-${book.id}`} {...book} icon="book" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="music" className="mt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {music.map((release) => (
                <MediaCard key={`m-${release.id}`} {...release} icon="music" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {artists.map((artist) => (
                <MediaCard key={`a-${artist.id}`} {...artist} icon="artist" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tracks" className="mt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {tracks.map((track) => (
                <MediaCard key={`t-${track.id}`} {...track} icon="track" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}