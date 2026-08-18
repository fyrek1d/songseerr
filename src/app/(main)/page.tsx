import { SearchBar } from "@/components/search-bar";
import { MediaCard } from "@/components/media-card";
import { getPopularMusic, MUSIC_GENRES } from "@/lib/discover";
import Link from "next/link";
import { ArrowRight, Music as MusicIcon } from "lucide-react";

// Re-render periodically so the daily-rotated discovery picks stay fresh
// without a full rebuild.
export const revalidate = 21600;

export default async function DemoHomePage() {
  const popular = await getPopularMusic();

  return (
    <div className="container-main space-y-10">
      <section className="page-section pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 border border-primary/20">
          <MusicIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Songseerr — Public Demo</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
          Discover Great Music
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground">
          Search for your favorite albums, artists, or tracks from around the world.
          This is a read-only demo — nothing is connected to your library.
        </p>
        <div className="mt-10 mx-auto max-w-2xl">
          <SearchBar />
        </div>
      </section>

      <section className="page-section pt-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Popular Music</h2>
            <p className="mt-1 text-sm text-muted-foreground">Curated picks, rotating daily</p>
          </div>
          <Link
            href="/search?q=popular"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {popular.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {popular.map((item) => (
              <MediaCard key={item.id} {...item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Popular music is loading — try a search above.</p>
        )}
      </section>

      <section className="page-section pt-0">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground">Explore by Genre</h2>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
            Dive into different musical styles and find your next favorite.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MUSIC_GENRES.map(({ label, query }) => (
            <Link
              key={label}
              href={`/search?q=${encodeURIComponent(query)}`}
              className="group flex h-20 w-full items-center justify-between px-6 py-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 card-hover"
            >
              <div className="flex-1">
                <span className="text-lg font-semibold text-foreground">{label}</span>
                <p className="mt-1 text-sm text-muted-foreground">{query}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}